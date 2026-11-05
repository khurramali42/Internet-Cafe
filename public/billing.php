<?php
declare(strict_types=1);

// Requires an authenticated request, $pdo and $authUser from api.php.
function billing_row(PDO $pdo, string $sql, array $args): ?array {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($args);
    return $stmt->fetch() ?: null;
}
function billing_money(array $d, string $key, bool $allowZero = true): float {
    if (!array_key_exists($key, $d) || !is_numeric($d[$key]) || !is_scalar($d[$key])) {
        respond(422, ['error' => "Invalid $key"]);
    }
    $v = (float) $d[$key];
    if (!is_finite($v) || $v < ($allowZero ? 0 : 0.01) || $v > 99999999.99 || round($v, 2) !== $v) {
        respond(422, ['error' => "Invalid $key"]);
    }
    return $v;
}
function billing_id(array $d, string $key): string {
    $value = required_text($d, $key, $key === 'requestId' ? 36 : 50);
    if (!preg_match('/^[a-zA-Z0-9_-]{1,50}$/', $value)) respond(422, ['error' => "Invalid $key"]);
    return $value;
}
function billing_fail(PDO $pdo, int $status, string $message): never {
    if ($pdo->inTransaction()) $pdo->rollBack();
    respond($status, ['error' => $message]);
}
function billing_session_json(array $s): array {
    $s['holds'] = json_decode($s['holdsJson'] ?: '[]', true) ?: [];
    unset($s['holdsJson']);
    return $s;
}
function billing_return_state(PDO $pdo, array $payload = []): never {
    // Return authoritative rows to the browser; frontend refreshes all state after success.
    respond(200, $payload + ['status' => 'ok']);
}

function handle_billing(string $action, PDO $pdo, array $authUser): void {
    if (!in_array($action, ['start_session', 'toggle_session_hold', 'move_session', 'checkout_session', 'settle_balance', 'manual_session'], true)) return;
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(405, ['error' => 'POST required']);
    $d = input();
    $now = (int) floor(microtime(true) * 1000);

    try {
        if ($action === 'start_session') {
            $key = billing_id($d, 'requestId');
            $cabinId = billing_id($d, 'cabinId');
            $customerId = billing_id($d, 'customerId');
            $rate = billing_money($d, 'ratePerHour', false);
            // Staff can only use server-approved prices. Administrators may define custom rates.
            $allowed = array_filter(array_map('trim', explode(',', getenv('SPEEDY_ALLOWED_HOURLY_RATES') ?: '100,150,200,250,300')));
            if ($authUser['role'] !== 'ADMIN' && !in_array(number_format($rate, 2, '.', ''), array_map(fn($v) => number_format((float) $v, 2, '.', ''), $allowed), true)) {
                respond(403, ['error' => 'Rate is not on the cafe approved rate list']);
            }
            $id = 'sess-' . $key;
            $pdo->beginTransaction();
            $cabin = billing_row($pdo, 'SELECT * FROM cabins WHERE id=? FOR UPDATE', [$cabinId]);
            if (!$cabin) billing_fail($pdo, 404, 'Cabin not found');
            $existing = billing_row($pdo, 'SELECT * FROM sessions WHERE id=? FOR UPDATE', [$id]);
            if ($existing) {
                $pdo->commit();
                billing_return_state($pdo, ['session' => billing_session_json($existing), 'replayed' => true]);
            }
            if ($cabin['status'] !== 'AVAILABLE' || $cabin['currentSessionId'] !== null) {
                billing_fail($pdo, 409, 'Cabin is already occupied or unavailable');
            }
            if ($customerId === 'new' && isset($d['newCustomer']) && is_array($d['newCustomer'])) {
                $name = required_text($d['newCustomer'], 'name', 100);
                $contact = trim((string) ($d['newCustomer']['contact'] ?? ''));
                if (strlen($contact) > 50) billing_fail($pdo, 422, 'Contact too long');
                $customerId = 'cust-' . $key;
                $pdo->prepare('INSERT INTO customers (id,name,contact,totalSpent,outstandingBalance) VALUES (?,?,?,0,0)')
                    ->execute([$customerId,$name,$contact]);
            } elseif (!billing_row($pdo, 'SELECT id FROM customers WHERE id=?', [$customerId])) {
                billing_fail($pdo, 404, 'Customer not found');
            }
            $pdo->prepare('INSERT INTO sessions (id,cabinId,customerId,inTime,ratePerHour,totalHoldMinutes,effectiveMinutes,amountDue,amountPaid,status,createdBy,isManual,holdsJson) VALUES (?,?,?,?,?,0,0,0,0,?,?,0,?)')
                ->execute([$id, $cabinId, $customerId, $now, $rate, 'OPEN', $authUser['username'], '[]']);
            $pdo->prepare("UPDATE cabins SET status='OCCUPIED',currentSessionId=? WHERE id=?")->execute([$id,$cabinId]);
            $created = billing_row($pdo, 'SELECT * FROM sessions WHERE id=?', [$id]);
            $pdo->commit();
            billing_return_state($pdo, ['session' => billing_session_json($created)]);
        }

        if ($action === 'toggle_session_hold') {
            $id = billing_id($d, 'sessionId');
            $pdo->beginTransaction();
            $s = billing_row($pdo, 'SELECT * FROM sessions WHERE id=? FOR UPDATE', [$id]);
            if (!$s || $s['status'] !== 'OPEN') billing_fail($pdo, 409, 'Session is not open');
            $holds = json_decode($s['holdsJson'] ?: '[]', true);
            if (!is_array($holds)) billing_fail($pdo, 409, 'Invalid stored holds');
            $last = count($holds) - 1;
            $onHold = $last >= 0 && !isset($holds[$last]['end']);
            if ($onHold) {
                $holds[$last]['end'] = $now;
                $holds[$last]['durationMinutes'] = max(0, ($now - (int) $holds[$last]['start']) / 60000);
            } else {
                $holds[] = ['id' => bin2hex(random_bytes(8)), 'start' => $now, 'durationMinutes' => 0];
            }
            $pdo->prepare('UPDATE sessions SET holdsJson=? WHERE id=?')->execute([json_encode($holds),$id]);
            $pdo->prepare('UPDATE cabins SET status=? WHERE id=? AND currentSessionId=?')->execute([$onHold ? 'OCCUPIED' : 'ON_HOLD', $s['cabinId'], $id]);
            $pdo->commit();
            billing_return_state($pdo, ['holding' => !$onHold]);
        }

        if ($action === 'move_session') {
            $id = billing_id($d, 'sessionId');
            $target = billing_id($d, 'targetCabinId');
            $pdo->beginTransaction();
            $s = billing_row($pdo, 'SELECT * FROM sessions WHERE id=? FOR UPDATE', [$id]);
            if (!$s || $s['status'] !== 'OPEN') billing_fail($pdo, 409, 'Session is not open');
            $source = $s['cabinId'];
            if ($source === $target) { $pdo->commit(); billing_return_state($pdo); }
            // Lock rows in stable order across concurrent moves.
            $ids = [$source,$target]; sort($ids);
            $stmt=$pdo->prepare('SELECT * FROM cabins WHERE id IN (?,?) ORDER BY id FOR UPDATE');
            $stmt->execute($ids);
            $rows=$stmt->fetchAll();
            $byId=[]; foreach ($rows as $row) $byId[$row['id']]=$row;
            if (!isset($byId[$source],$byId[$target])) billing_fail($pdo, 404, 'Cabin not found');
            if ($byId[$source]['currentSessionId'] !== $id || $byId[$target]['status'] !== 'AVAILABLE' || $byId[$target]['currentSessionId'] !== null) {
                billing_fail($pdo,409,'Target cabin unavailable or source changed');
            }
            $pdo->prepare("UPDATE cabins SET status='AVAILABLE',currentSessionId=NULL WHERE id=?")->execute([$source]);
            $pdo->prepare('UPDATE cabins SET status=?,currentSessionId=? WHERE id=?')->execute([$byId[$source]['status'], $id,$target]);
            $pdo->prepare('UPDATE sessions SET cabinId=? WHERE id=?')->execute([$target,$id]);
            $pdo->commit();
            billing_return_state($pdo);
        }

        if ($action === 'checkout_session') {
            $id = billing_id($d,'sessionId');
            $paid = billing_money($d,'paymentAmount');
            $discount = array_key_exists('discount', $d) ? billing_money($d,'discount') : 0.0;
            if ($discount > 0 && $authUser['role'] !== 'ADMIN') respond(403,['error'=>'Only administrators may apply a discount']);
            $pdo->beginTransaction();
            $s = billing_row($pdo,'SELECT * FROM sessions WHERE id=? FOR UPDATE',[$id]);
            if (!$s) billing_fail($pdo,404,'Session not found');
            if ($s['status'] === 'CLOSED') {
                // No second payment is ever created from a duplicate checkout.
                $pdo->commit();
                billing_return_state($pdo,['session'=>billing_session_json($s),'replayed'=>true]);
            }
            if ((int)$s['isManual'] === 1) billing_fail($pdo,409,'Manual sessions are closed separately');
            $customer=billing_row($pdo,'SELECT * FROM customers WHERE id=? FOR UPDATE',[$s['customerId']]);
            $cabin=billing_row($pdo,'SELECT * FROM cabins WHERE id=? FOR UPDATE',[$s['cabinId']]);
            if (!$customer || !$cabin || $cabin['currentSessionId'] !== $id) billing_fail($pdo,409,'Missing customer or active cabin mismatch');
            $holds=json_decode($s['holdsJson'] ?: '[]',true);
            if (!is_array($holds)) billing_fail($pdo,409,'Invalid stored holds');
            $heldMs=0; $ended=[];
            foreach($holds as $h) {
                $start=(int)($h['start'] ?? 0);
                $end=isset($h['end']) ? (int)$h['end'] : $now;
                if ($start < (int)$s['inTime'] || $start > $end || $end > $now) billing_fail($pdo,409,'Invalid saved hold timestamps');
                $heldMs += $end-$start;
                $h['end']=$end;
                $h['durationMinutes']=($end-$start)/60000;
                $ended[]=$h;
            }
            $elapsed=max(0,$now-(int)$s['inTime']);
            if ($heldMs>$elapsed) billing_fail($pdo,409,'Hold time exceeds session time');
            $minutes=(int) ceil(($elapsed-$heldMs)/60000);
            $gross=(float) ceil(($minutes/60)*(float)$s['ratePerHour']);
            if ($discount>$gross) billing_fail($pdo,422,'Discount exceeds session charge');
            $due=$gross-$discount;
            $prior=(float)$customer['outstandingBalance'];
            // No unsupported customer credit or change recording.
            if ($paid>round($due+max(0,$prior),2)) billing_fail($pdo,422,'Payment exceeds bill and outstanding balance');
            $balance=round($prior+$due-$paid,2);
            $pdo->prepare("UPDATE sessions SET outTime=?,totalHoldMinutes=?,effectiveMinutes=?,amountDue=?,amountPaid=?,status='CLOSED',holdsJson=? WHERE id=?")
                ->execute([$now,(int)floor($heldMs/60000),$minutes,$due,$paid,json_encode($ended),$id]);
            $pdo->prepare('UPDATE customers SET totalSpent=totalSpent+?,outstandingBalance=? WHERE id=?')
                ->execute([$due,$balance,$s['customerId']]);
            $pdo->prepare("UPDATE cabins SET status='AVAILABLE',currentSessionId=NULL WHERE id=? AND currentSessionId=?")
                ->execute([$s['cabinId'],$id]);
            if ($paid>0) {
                $pdo->prepare('INSERT INTO transactions (id,type,amount,date,description,category,relatedId,customerId,isManual) VALUES (?,?,?,?,?,?,?,?,0)')
                    ->execute(['tx-chk-'.$id,'PAYMENT',$paid,$now,'Payment for session '.$id,'Session',$id,$s['customerId']]);
            }
            $updated=billing_row($pdo,'SELECT * FROM sessions WHERE id=?',[$id]);
            $pdo->commit();
            billing_return_state($pdo,['session'=>billing_session_json($updated),'balance'=>$balance]);
        }

        if ($action === 'settle_balance') {
            $customerId=billing_id($d,'customerId');
            $key=billing_id($d,'requestId');
            $amount=billing_money($d,'paymentAmount',false);
            $txId='tx-settle-'.$key;
            $pdo->beginTransaction();
            $customer=billing_row($pdo,'SELECT * FROM customers WHERE id=? FOR UPDATE',[$customerId]);
            if (!$customer) billing_fail($pdo,404,'Customer not found');
            $existing=billing_row($pdo,'SELECT * FROM transactions WHERE id=?',[$txId]);
            if ($existing) {
                if ($existing['customerId'] !== $customerId || abs((float)$existing['amount']-$amount)>0.001) billing_fail($pdo,409,'Request ID already used with different payment');
                $pdo->commit();
                billing_return_state($pdo,['replayed'=>true,'balance'=>(float)$customer['outstandingBalance']]);
            }
            if ($amount>(float)$customer['outstandingBalance'] || (float)$customer['outstandingBalance']<=0) {
                billing_fail($pdo,422,'Payment exceeds outstanding balance');
            }
            $newBalance=round((float)$customer['outstandingBalance']-$amount,2);
            $pdo->prepare('UPDATE customers SET outstandingBalance=? WHERE id=?')->execute([$newBalance,$customerId]);
            $pdo->prepare('INSERT INTO transactions (id,type,amount,date,description,category,customerId,isManual) VALUES (?,?,?,?,?,?,?,0)')
                ->execute([$txId,'PAYMENT',$amount,$now,'Balance Settlement - '.$customer['name'],'Settlement',$customerId]);
            $pdo->commit();
            billing_return_state($pdo,['balance'=>$newBalance]);
        }

        if ($action === 'manual_session') {
            if ($authUser['role'] !== 'ADMIN') respond(403, ['error' => 'Manual billing requires administrator']);
            $key = billing_id($d,'requestId');
            $id = 'sess-manual-'.$key;
            $amount = billing_money($d,'amount');
            $paid = billing_money($d,'paidAmount');
            if ($paid>$amount) respond(422,['error'=>'Payment exceeds manual bill']);
            $start = (int) ($d['startTime'] ?? 0);
            $minutes = (int) ($d['durationMinutes'] ?? 0);
            if ($start<=0 || $start>$now || $minutes<1 || $minutes>10080
                || $start+$minutes*60000>$now) respond(422,['error'=>'Invalid manual session time']);
            $reason=required_text($d,'reason',500);
            $cabinId=required_text($d,'cabinId',50);
            $pdo->beginTransaction();
            $old = billing_row($pdo,'SELECT * FROM sessions WHERE id=? FOR UPDATE',[$id]);
            if ($old) {
                $pdo->commit();
                billing_return_state($pdo,['replayed'=>true,'session'=>billing_session_json($old)]);
            }
            $customerId = ($d['customerId'] ?? '') === '' ? 'cust-manual-'.$key : billing_id($d,'customerId');
            if (!empty($d['newCustomer']) && is_array($d['newCustomer'])) {
                $name=required_text($d['newCustomer'],'name',100);
                $contact=trim((string) ($d['newCustomer']['contact'] ?? ''));
                if (strlen($contact)>50) billing_fail($pdo,422,'Contact too long');
                $customerId='cust-manual-'.$key;
                $pdo->prepare('INSERT INTO customers (id,name,contact,totalSpent,outstandingBalance) VALUES (?,?,?,0,0)')
                    ->execute([$customerId,$name,$contact]);
            }
            $cust=billing_row($pdo,'SELECT * FROM customers WHERE id=? FOR UPDATE',[$customerId]);
            if (!$cust) billing_fail($pdo,404,'Customer not found');
            $pdo->prepare('INSERT INTO sessions (id,cabinId,customerId,inTime,outTime,ratePerHour,totalHoldMinutes,effectiveMinutes,amountDue,amountPaid,status,createdBy,isManual,manualReason,holdsJson) VALUES (?,?,?,?,?,0,0,?,?,?,\'CLOSED\',?,1,?,\'[]\')')
                ->execute([$id,$cabinId,$customerId,$start,$start+$minutes*60000,$minutes,$amount,$paid,$authUser['username'],$reason]);
            $newBalance=round((float)$cust['outstandingBalance']+$amount-$paid,2);
            $pdo->prepare('UPDATE customers SET totalSpent=totalSpent+?,outstandingBalance=? WHERE id=?')
                ->execute([$amount,$newBalance,$customerId]);
            if ($paid>0) {
                $pdo->prepare('INSERT INTO transactions (id,type,amount,date,description,category,relatedId,customerId,isManual) VALUES (?,?,?,?,?,?,?,?,1)')
                    ->execute(['tx-manual-'.$key,'PAYMENT',$paid,$now,'Manual session: '.$reason,'Manual',$id,$customerId]);
            }
            $created=billing_row($pdo,'SELECT * FROM sessions WHERE id=?',[$id]);
            $pdo->commit();
            billing_return_state($pdo,['session'=>billing_session_json($created),'balance'=>$newBalance]);
        }
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log('Billing transaction failure: '.$e->getMessage());
        respond(500,['error'=>'Billing operation failed']);
    }
}
