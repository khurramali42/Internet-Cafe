import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import { Customer, Session, Cabin, CabinStatus, Transaction } from '../types';
import { X, UserPlus, Clock, Calculator, CreditCard, Wrench, AlertTriangle, FileText, Calendar, Search, History, PauseCircle, PlayCircle, CheckCircle, AlertCircle, ArrowUpCircle } from 'lucide-react';
import { format } from 'date-fns';

const API_SERVER_MODE = !!(import.meta.env.VITE_API_URL || '').trim();

// --- Check In Modal ---

interface CheckInModalProps {
  cabinId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({ cabinId, isOpen, onClose }) => {
  const { customers, checkIn, addCustomer } = useAppStore();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [rate, setRate] = useState(100); // Default 100 per hour
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustContact, setNewCustContact] = useState('');

  if (!isOpen) return null;

  const [savingCheckIn, setSavingCheckIn] = useState(false);
  const [checkInError, setCheckInError] = useState('');
  const checkInKey = useRef<string | null>(null);
  const checkInPending = useRef(false);
  const handleCheckIn = async () => {
    if (checkInPending.current) return;
    if (isNewCustomer && !newCustName.trim()) return;
    let finalCustomerId = selectedCustomerId;
    let candidate = isNewCustomer ? { name: newCustName.trim(), contact: newCustContact } : undefined;
    if (!candidate && !finalCustomerId) return;
    if (!API_SERVER_MODE && candidate) {
        finalCustomerId = addCustomer(candidate);
        candidate = undefined;
    }
    checkInPending.current = true;
    setSavingCheckIn(true);
    setCheckInError('');
    const requestId = checkInKey.current || crypto.randomUUID();
    checkInKey.current = requestId;
    const success = await checkIn(cabinId, finalCustomerId, rate, candidate, requestId);
    checkInPending.current = false;
    setSavingCheckIn(false);
    if (success) {
        checkInKey.current = null;
        onClose();
    }
    else setCheckInError('Session was not saved. Check the cabin, customer and approved hourly rate.');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Clock size={20} /> Check In - Cabin {cabinId}
          </h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="p-6 space-y-4">
          
          {/* Customer Selection */}
          {!isNewCustomer ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Customer</label>
              <div className="flex gap-2">
                <select 
                  className="block w-full rounded-md border border-gray-300 bg-white p-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.outstandingBalance > 0 ? `(Due: Rs.${c.outstandingBalance})` : ''}</option>
                  ))}
                </select>
                <button 
                  onClick={() => setIsNewCustomer(true)}
                  className="bg-gray-100 p-2 rounded-md hover:bg-gray-200 text-blue-600"
                  title="Add New Customer"
                >
                  <UserPlus size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 p-4 rounded-md border border-blue-100 space-y-3">
              <h4 className="text-sm font-semibold text-blue-800">New Customer</h4>
              <input 
                type="text" 
                placeholder="Full Name" 
                className="w-full p-2 border rounded bg-white text-gray-900"
                value={newCustName}
                onChange={e => setNewCustName(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="Contact Number" 
                className="w-full p-2 border rounded bg-white text-gray-900"
                value={newCustContact}
                onChange={e => setNewCustContact(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setIsNewCustomer(false)} className="text-sm text-gray-500">Cancel</button>
                <button onClick={handleCheckIn} className="text-sm bg-blue-600 text-white px-3 py-1 rounded">Save & Check In</button>
              </div>
            </div>
          )}

          {/* Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (Rs.)</label>
            <input 
              type="number" 
              className="block w-full rounded-md border border-gray-300 p-2 text-gray-900 bg-white shadow-sm"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
            />
          </div>

          <button 
            disabled={savingCheckIn || (!selectedCustomerId && !isNewCustomer)}
            onClick={handleCheckIn}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {savingCheckIn ? 'Saving...' : 'Start Session'}
          </button>
          {checkInError && <p role="alert" className="text-sm text-red-600 mt-2">{checkInError}</p>}
        </div>
      </div>
    </div>
  );
};

// --- Customer History Modal ---

interface CustomerHistoryModalProps {
  customer: Customer | undefined;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({ customer, isOpen, onClose }) => {
    const { sessions, transactions } = useAppStore();
    
    // Combine sessions and independent transactions into a single timeline
    const historyData = useMemo(() => {
        if(!customer) return [];

        const custSessions = sessions.filter(s => s.customerId === customer.id).map(s => ({
            type: 'SESSION' as const,
            data: s,
            date: s.inTime
        }));

        // Get transactions that are NOT directly payment for a session we already listing (usually "Settlements")
        // Or if it IS a session payment, we can include it if we want a pure ledger, but let's separate "Settlements"
        // Here we look for transactions linked to this customer
        const custTransactions = transactions.filter(t => 
            t.customerId === customer.id && 
            t.type === 'PAYMENT' &&
            // Filter out transactions that are just immediate session payments if we display them inside session card
            // But for a ledger, seeing "Balance Settlement" is key. 
            // Usually immediate session payments have relatedId = sessionID.
            // Settlements created in Customers.tsx usually have 'Balance Settlement' description.
            (!t.relatedId || !t.relatedId.startsWith('sess-')) 
        ).map(t => ({
            type: 'TRANSACTION' as const,
            data: t,
            date: t.date
        }));

        return [...custSessions, ...custTransactions].sort((a,b) => b.date - a.date);
    }, [customer, sessions, transactions]);

    if (!isOpen || !customer) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                 <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <History size={20} /> Ledger: {customer.name}
                    </h3>
                    <button onClick={onClose}><X size={20} /></button>
                 </div>
                 
                 {/* Top Summary Bar */}
                 <div className="p-4 bg-gray-50 border-b space-y-3">
                     <div className="flex justify-between items-center">
                        <div className="flex gap-4 text-sm">
                            <div className="bg-white px-3 py-1.5 rounded border border-gray-200">
                                <span className="text-gray-500 block text-xs uppercase font-bold">Total Spent</span>
                                <span className="font-bold text-green-600 text-lg">Rs.{customer.totalSpent}</span>
                            </div>
                        </div>

                        {customer.outstandingBalance > 0 ? (
                             <div className="bg-red-50 px-4 py-2 rounded-lg border border-red-200 text-right animate-pulse">
                                 <span className="text-red-500 block text-xs uppercase font-bold">Current Outstanding</span>
                                 <span className="font-bold text-red-700 text-xl">Rs.{customer.outstandingBalance}</span>
                             </div>
                        ) : (
                             <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-200 text-right">
                                 <span className="text-green-600 block text-xs uppercase font-bold">Status</span>
                                 <span className="font-bold text-green-700 text-lg">All Clear</span>
                             </div>
                        )}
                     </div>
                 </div>

                 <div className="overflow-y-auto p-4 space-y-3 flex-1 bg-gray-100/50">
                     {historyData.length === 0 ? (
                         <div className="text-center text-gray-400 py-8">No history found.</div>
                     ) : (
                         historyData.map((item, idx) => {
                             if (item.type === 'SESSION') {
                                 const s = item.data as Session;
                                 const timeStart = format(s.inTime, 'hh:mm a');
                                 const timeEnd = s.outTime ? format(s.outTime, 'hh:mm a') : 'Ongoing';
                                 
                                 return (
                                     <div key={s.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm relative">
                                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-lg"></div>
                                         <div className="flex justify-between items-start mb-2 border-b border-gray-100 pb-2">
                                             <div className="flex items-center gap-2">
                                                <div className="font-bold text-slate-800 text-base">{format(s.inTime, 'dd MMM yyyy')}</div>
                                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-bold">SESSION</span>
                                             </div>
                                         </div>

                                         <div className="grid grid-cols-2 gap-4">
                                             <div>
                                                 <div className="text-sm text-gray-800 flex items-center gap-2">
                                                     <Clock size={14} className="text-gray-400"/>
                                                     <span className="font-medium bg-gray-50 px-1 rounded">{timeStart} - {timeEnd}</span>
                                                 </div>
                                                 <div className="text-sm text-gray-600 mt-1 pl-6">
                                                     Cabin {s.cabinId} • {s.effectiveMinutes}m
                                                 </div>
                                             </div>

                                             <div className="text-right">
                                                 <div className="flex justify-end items-baseline gap-2">
                                                     <span className="text-gray-500 text-xs">Total Bill:</span>
                                                     <span className="font-bold text-gray-900 text-lg">Rs.{s.amountDue}</span>
                                                 </div>
                                                 <div className="text-sm mt-1">
                                                     {s.amountPaid < s.amountDue ? (
                                                         <span className="text-red-600 font-medium">
                                                             Paid: Rs.{s.amountPaid} <span className="text-xs bg-red-100 px-1 rounded ml-1">(Left: {s.amountDue - s.amountPaid})</span>
                                                         </span>
                                                     ) : (
                                                         <span className="text-green-600 font-bold flex items-center justify-end gap-1">
                                                             <CheckCircle size={12}/> Paid Full
                                                         </span>
                                                     )}
                                                 </div>
                                             </div>
                                         </div>
                                     </div>
                                 );
                             } else {
                                 const t = item.data as Transaction;
                                 return (
                                     <div key={t.id} className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm relative">
                                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 rounded-l-lg"></div>
                                         <div className="flex justify-between items-center">
                                             <div>
                                                 <div className="font-bold text-green-900 text-base">{format(t.date, 'dd MMM yyyy, hh:mm a')}</div>
                                                 <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] bg-green-200 text-green-800 px-1.5 py-0.5 rounded font-bold uppercase">PAYMENT RECEIVED</span>
                                                    <span className="text-sm text-green-700 italic">{t.description}</span>
                                                 </div>
                                             </div>
                                             <div className="text-right">
                                                 <span className="block text-xs text-green-600 uppercase font-bold">Amount Paid</span>
                                                 <span className="text-xl font-bold text-green-700 flex items-center gap-1">
                                                     <ArrowUpCircle size={18}/> Rs.{t.amount}
                                                 </span>
                                             </div>
                                         </div>
                                     </div>
                                 );
                             }
                         })
                     )}
                 </div>
             </div>
        </div>
    );
};


// --- Checkout Modal ---

interface CheckoutModalProps {
  session: Session;
  isOpen: boolean;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ session, isOpen, onClose }) => {
  const { checkOut, now, customers, currentUser } = useAppStore();
  const [payment, setPayment] = useState(0);
  const initialPaymentApplied = useRef(false);
  const checkoutPending = useRef(false);
  const [checkoutSaving, setCheckoutSaving] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const submitCheckout = async (paid: number, outcome: 'PAID' | 'CREDIT') => {
      if (checkoutPending.current) return;
      if (!Number.isFinite(paid) || paid < 0 || !Number.isFinite(discount) || discount < 0) {
          setCheckoutError('Enter valid nonnegative payment and discount values.');
          return;
      }
      checkoutPending.current = true;
      setCheckoutSaving(true);
      setCheckoutError('');
      const saved = await checkOut(session.id, paid, discount);
      checkoutPending.current = false;
      setCheckoutSaving(false);
      if (saved) setCheckoutStatus(outcome);
      else setCheckoutError('No payment confirmation received. Check saved records before retrying.');
  };
  const [discount, setDiscount] = useState(0);
  const [timerStopped, setTimerStopped] = useState(false);
  const [frozenTime, setFrozenTime] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  
  // Status: IDLE | PAID | CREDIT
  const [checkoutStatus, setCheckoutStatus] = useState<'IDLE' | 'PAID' | 'CREDIT'>('IDLE');
  
  const [stats, setStats] = useState({ duration: 0, amount: 0, holds: 0 });

  const effectiveNow = timerStopped ? frozenTime : now;

  useEffect(() => {
    if (!isOpen) {
        setTimerStopped(false);
        setCheckoutStatus('IDLE');
        initialPaymentApplied.current = false;
        return;
    }

    const calculate = () => {
      let totalHoldMs = 0;
      session.holds.forEach(h => {
        totalHoldMs += (h.end || effectiveNow) - h.start;
      });

      const totalDurationMs = effectiveNow - session.inTime;
      const effectiveMs = totalDurationMs - totalHoldMs;
      const effectiveMinutes = Math.ceil(effectiveMs / 60000);
      const hours = effectiveMinutes / 60;
      
      const baseAmount = Math.ceil(hours * session.ratePerHour);
      
      setStats({
        duration: effectiveMinutes,
        holds: Math.floor(totalHoldMs / 60000),
        amount: baseAmount
      });
      
      if (!initialPaymentApplied.current) {
          setPayment(baseAmount);
          initialPaymentApplied.current = true;
      }
    };

    calculate();
  }, [isOpen, effectiveNow, session, timerStopped, checkoutStatus]);

  const toggleTimer = () => {
      if (timerStopped) {
          setTimerStopped(false);
      } else {
          setFrozenTime(now);
          setTimerStopped(true);
      }
  };

  if (!isOpen) return null;

  const finalAmount = Math.max(0, stats.amount - discount);
  // Get the latest customer state from the store
  const customer = customers.find(c => c.id === session.customerId);
  const currentStoreBalance = customer?.outstandingBalance || 0;

  // --- LOGIC EXPLANATION ---
  // If checkoutStatus is 'IDLE' (Pre-Checkout):
  //    The 'customer.outstandingBalance' in store is the PREVIOUS BALANCE.
  //    We need to add the 'finalAmount' (Current Bill) to show "Total Payable".
  //
  // If checkoutStatus is 'CREDIT' (Post-Checkout):
  //    We have already called checkOut(). The 'customer.outstandingBalance' in store is NOW the TOTAL OUTSTANDING.
  //    So "Previous Balance" = CurrentStoreBalance - CurrentBill.
  
  const displayPrevBalance = checkoutStatus === 'CREDIT' 
        ? currentStoreBalance - finalAmount 
        : currentStoreBalance;
  
  const displayTotalOutstanding = checkoutStatus === 'CREDIT'
        ? currentStoreBalance
        : currentStoreBalance + finalAmount;


  // --- SUCCESS SCREEN: PAID ---
  if (checkoutStatus === 'PAID') {
      return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in duration-300">
                 <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                     <CheckCircle size={48} className="text-green-600" />
                 </div>
                 <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
                 <p className="text-gray-500 mb-6">Thank you, {customer?.name}.<br/>Session closed.</p>
                 <button onClick={onClose} className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800">
                     Close Window
                 </button>
             </div>
        </div>
      );
  }

  // --- SUCCESS SCREEN: CREDIT (UDHAAR) ---
  if (checkoutStatus === 'CREDIT') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in duration-300">
               <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                   <AlertCircle size={48} className="text-red-600" />
               </div>
               <h2 className="text-2xl font-bold text-red-600 mb-2">Added to Dues (Udhaar)</h2>
               <p className="text-gray-500 mb-4">Session closed & added to outstanding.</p>
               
               <div className="bg-gray-50 p-4 rounded-lg text-left text-sm space-y-2 mb-6">
                   <div className="flex justify-between">
                       <span className="text-gray-600">Current Bill:</span>
                       <span className="font-bold">Rs.{finalAmount}</span>
                   </div>
                   <div className="flex justify-between">
                       <span className="text-gray-600">Previous Balance:</span>
                       <span className="font-bold">Rs.{displayPrevBalance}</span>
                   </div>
                   <div className="flex justify-between border-t pt-2 mt-1">
                       <span className="font-bold text-red-800">Total Outstanding:</span>
                       <span className="font-bold text-red-600 text-lg">Rs.{displayTotalOutstanding}</span>
                   </div>
               </div>

               <button onClick={onClose} className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800">
                   OK
               </button>
           </div>
      </div>
    );
}

  return (
    <>
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-green-600 p-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Calculator size={20} /> Checkout - {customer?.name}
          </h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
                <h4 className="font-semibold text-gray-700">Session Summary</h4>
                <button onClick={() => setShowHistory(true)} className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline">
                    <History size={12}/> History
                </button>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Rate</span>
              <span className="font-mono">Rs.{session.ratePerHour}/hr</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Duration</span>
              <span className="font-mono">{stats.duration} mins</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Hold Time</span>
              <span className="font-mono">{stats.holds} mins</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
              <span>Current Bill</span>
              <span>Rs.{stats.amount}</span>
            </div>
            
            {displayPrevBalance > 0 && (
                 <div className="bg-red-50 p-3 rounded border border-red-100 mt-2">
                     <div className="flex justify-between text-sm text-red-600">
                         <span>Previous Due</span>
                         <span className="font-bold">Rs.{displayPrevBalance}</span>
                     </div>
                     <div className="flex justify-between text-base font-bold text-red-800 border-t border-red-200 mt-1 pt-1">
                         <span>Total Payable</span>
                         <span>Rs.{displayTotalOutstanding}</span>
                     </div>
                 </div>
            )}

            {!API_SERVER_MODE && <button 
                onClick={toggleTimer}
                className={`w-full py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition ${
                    timerStopped ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
            >
                {timerStopped ? <><PlayCircle size={16}/> Resume Timer</> : <><PauseCircle size={16}/> Stop Timer & Collect</>}
            </button>}
            {API_SERVER_MODE && <p className="text-xs text-amber-700">Estimate only. The server calculates the final bill when you confirm checkout.</p>}
          </div>

          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-700 border-b pb-2">Payment</h4>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase">Discount</label>
              <input 
                type="number" 
                className="w-full p-2 border rounded mb-2 text-right font-mono bg-white text-gray-900"
                value={discount}
                min={0}
                disabled={API_SERVER_MODE && currentUser?.role !== 'ADMIN'}
                onChange={e => {
                    const d = Number(e.target.value);
                    setDiscount(d);
                    setPayment(Math.max(0, stats.amount - d));
                }}
              />
            </div>

            <div className="flex justify-between font-bold text-lg">
              <span>Net Payable:</span>
              <span>Rs.{displayTotalOutstanding}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase">Amount Received</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">Rs.</span>
                <input 
                  type="number" 
                  className="w-full p-2 pl-10 border border-green-300 rounded focus:ring-green-500 focus:border-green-500 text-right font-bold text-lg bg-white text-gray-900"
                  value={payment}
                  onChange={e => setPayment(Number(e.target.value))}
                />
              </div>
            </div>

            {payment < displayTotalOutstanding ? (
              <div className="text-red-600 text-xs font-bold text-right">
                Balance Remaining: Rs.{displayTotalOutstanding - payment} (Udhaar)
              </div>
            ) : payment > displayTotalOutstanding ? (
              <div className="text-blue-600 text-xs font-bold text-right">
                Overpayment is not accepted. Return change and enter only the amount collected.
              </div>
            ) : null}

            {checkoutError && <p role="alert" className="text-sm text-red-700">{checkoutError}</p>}
            <div className="flex flex-col gap-2 mt-2">
                <button 
                disabled={checkoutSaving}
                onClick={() => { void submitCheckout(payment, 'PAID'); }}
                className="w-full bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                <CreditCard size={18} /> {checkoutSaving ? 'Confirming...' : 'Complete Payment'}
                </button>

                <button 
                disabled={checkoutSaving}
                onClick={() => { void submitCheckout(0, 'CREDIT'); }}
                className="w-full bg-gray-200 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-300 flex items-center justify-center gap-2 text-sm"
                >
                Pay Later (Full Udhaar)
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CustomerHistoryModal 
        customer={customer} 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
    />
    </>
  );
};

// --- Maintenance Modal ---

const FAILURE_REASONS = [
  "Hardware Failure (Mouse/Keyboard)",
  "System Crash / Blue Screen",
  "Internet / Network Issue",
  "Power / Electrical Issue",
  "Furniture Broken",
  "Software Update Required",
  "Other (Specify in notes)"
];

interface MaintenanceModalProps {
  cabin: Cabin;
  isOpen: boolean;
  onClose: () => void;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ cabin, isOpen, onClose }) => {
  const { markMaintenance, resolveMaintenance, moveSession, cabins, sessions } = useAppStore();
  
  const [selectedReason, setSelectedReason] = useState(FAILURE_REASONS[0]);
  const [customNotes, setCustomNotes] = useState('');
  const [expectedFix, setExpectedFix] = useState('');
  const [moveToCabinId, setMoveToCabinId] = useState('');

  if (!isOpen) return null;

  const isOccupied = cabin.status === CabinStatus.OCCUPIED || cabin.status === CabinStatus.ON_HOLD;
  const isOutOfService = cabin.status === CabinStatus.OUT_OF_SERVICE;

  const availableCabins = cabins.filter(c => c.status === CabinStatus.AVAILABLE);

  const handleSave = () => {
    const finalReason = selectedReason === "Other (Specify in notes)" 
        ? `Other: ${customNotes}` 
        : selectedReason + (customNotes ? ` - ${customNotes}` : '');

    if (isOccupied && moveToCabinId) {
        // First move, then mark
        const session = sessions.find(s => s.id === cabin.currentSessionId);
        if(session) {
            moveSession(session.id, moveToCabinId);
            markMaintenance(cabin.id, finalReason, expectedFix);
            onClose();
        }
        return;
    }
    
    if (!isOutOfService) {
        markMaintenance(cabin.id, finalReason, expectedFix);
    }
    onClose();
  };

  const handleResolve = () => {
      resolveMaintenance(cabin.id);
      onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className={`p-4 flex justify-between items-center text-white ${isOutOfService ? 'bg-green-600' : 'bg-red-600'}`}>
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Wrench size={20} /> {isOutOfService ? 'Restore Service' : 'Mark Out of Service'}
          </h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          
          <h2 className="text-xl font-bold text-gray-800">{cabin.name}</h2>

          {isOccupied && !isOutOfService && (
             <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm text-amber-800">
                <div className="flex items-center gap-2 font-bold mb-1"><AlertTriangle size={16}/> Cabin is Active!</div>
                <p>This cabin currently has an active session. You must move the customer or force checkout before marking as broken.</p>
                
                <div className="mt-3">
                    <label className="block text-xs font-bold text-gray-600 mb-1">Move to Cabin:</label>
                    <select 
                        className="w-full p-2 border rounded bg-white text-gray-900"
                        value={moveToCabinId}
                        onChange={e => setMoveToCabinId(e.target.value)}
                    >
                        <option value="">-- Select Empty Cabin --</option>
                        {availableCabins.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
             </div>
          )}

          {!isOutOfService && (
             <>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Breakdown</label>
                    <select 
                        className="w-full p-2 border rounded bg-white text-gray-900"
                        value={selectedReason}
                        onChange={e => setSelectedReason(e.target.value)}
                    >
                        {FAILURE_REASONS.map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes / Details</label>
                    <textarea 
                        rows={2}
                        placeholder="Specific error message or details..."
                        className="w-full p-2 border rounded bg-white text-gray-900 text-sm"
                        value={customNotes}
                        onChange={e => setCustomNotes(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected Fix (Optional)</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Tomorrow 2PM"
                        className="w-full p-2 border rounded bg-white text-gray-900"
                        value={expectedFix}
                        onChange={e => setExpectedFix(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center gap-2 pt-2">
                    <input type="checkbox" id="notify" className="w-4 h-4" defaultChecked />
                    <label htmlFor="notify" className="text-sm text-gray-600">Report to Admin immediately</label>
                </div>
             </>
          )}

          {isOutOfService && (
              <div className="text-center py-4 text-gray-600">
                  <p>Current Status: <strong>Out of Service</strong></p>
                  <p className="text-sm mt-1">Reason: <span className="text-red-600 font-medium">{cabin.statusReason}</span></p>
                  <p className="text-sm text-gray-500">Since: {new Date().toLocaleDateString()}</p>
              </div>
          )}

          <div className="pt-2">
            {isOutOfService ? (
                <button 
                    onClick={handleResolve}
                    className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition"
                >
                    Mark as Fixed (Available)
                </button>
            ) : (
                <button 
                    disabled={isOccupied && !moveToCabinId}
                    onClick={handleSave}
                    className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isOccupied ? 'Move Session & Mark Broken' : 'Confirm Out of Service'}
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Manual Entry Modal ---

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({ isOpen, onClose }) => {
    const { addManualRecord, customers, cabins } = useAppStore();
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [cabinId, setCabinId] = useState('General');
    const [customerId, setCustomerId] = useState('');
    const [duration, setDuration] = useState(60);
    const [amount, setAmount] = useState(0); // Total Bill
    const [paidAmount, setPaidAmount] = useState(0); // Actually Paid
    const [reason, setReason] = useState('Power Failure');
    const [manualSaving, setManualSaving] = useState(false);
    const [manualError, setManualError] = useState('');
    const manualKey = useRef<string | null>(null);
    const manualPending = useRef(false);

    // New Customer State
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [newCustName, setNewCustName] = useState('');
    const [newCustContact, setNewCustContact] = useState('');
    const [searchContact, setSearchContact] = useState('');

    useEffect(() => {
        if(isOpen) {
            // Manual entry is for completed historical usage, not a session ending in the future.
            const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
            setDate(format(hourAgo, 'yyyy-MM-dd'));
            setTime(format(hourAgo, 'HH:mm'));
            setAmount(0);
            setPaidAmount(0);
            setSearchContact('');
            manualKey.current = null;
            setManualError('');
            setIsNewCustomer(false);
        }
    }, [isOpen]);

    // Auto-update paid amount when total changes (convenience)
    useEffect(() => {
        setPaidAmount(amount);
    }, [amount]);

    // Search Logic
    useEffect(() => {
        if(searchContact.length > 3) {
            const found = customers.find(c => c.contact.includes(searchContact));
            if(found) {
                setCustomerId(found.id);
                setIsNewCustomer(false);
            }
        }
    }, [searchContact, customers]);

    const handleSave = async () => {
        if (manualPending.current || ((!customerId && !isNewCustomer) || !amount || !date || !time)) return;
        const timestamp = new Date(`${date}T${time}`).getTime();
        manualPending.current = true;
        setManualSaving(true);
        setManualError('');
        const requestId = manualKey.current || crypto.randomUUID();
        manualKey.current = requestId;
        const ok = await addManualRecord({
            customerId,
            newCustomer: isNewCustomer ? { name: newCustName, contact: newCustContact } : undefined,
            cabinId, startTime: timestamp, durationMinutes: Number(duration),
            amount: Number(amount), paidAmount: Number(paidAmount), reason
        }, requestId);
        manualPending.current = false;
        setManualSaving(false);
        if (ok) {
            manualKey.current = null;
            onClose();
        }
        else setManualError('Manual entry was not confirmed. Check the record before retrying.');
    };

    if(!isOpen) return null;

    const balance = amount - paidAmount;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
             <div className="bg-purple-700 p-4 flex justify-between items-center text-white">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <FileText size={20} /> Add Offline / Manual Record
                </h3>
                <button onClick={onClose}><X size={20} /></button>
             </div>
             
             <div className="p-6 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                         <label className="block text-xs font-bold text-gray-500 mb-1">Date</label>
                         <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border p-2 rounded bg-white text-gray-900" />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-500 mb-1">Start Time</label>
                         <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full border p-2 rounded bg-white text-gray-900" />
                     </div>
                 </div>

                 {/* Customer Section */}
                 <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Customer</label>
                        <button 
                           onClick={() => { setIsNewCustomer(!isNewCustomer); setCustomerId(''); }}
                           className="text-xs text-blue-600 font-bold hover:underline"
                        >
                           {isNewCustomer ? 'Select Existing' : 'Create New'}
                        </button>
                    </div>

                    {!isNewCustomer ? (
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 text-gray-400" size={14}/>
                                <input 
                                    type="text" 
                                    placeholder="Search by Contact Number..."
                                    className="w-full pl-8 p-2 border rounded bg-white text-gray-900 text-sm"
                                    value={searchContact}
                                    onChange={e => setSearchContact(e.target.value)}
                                />
                            </div>
                            <select className="w-full border p-2 rounded bg-white text-gray-900 text-sm" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                                <option value="">Select Customer...</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.contact})</option>)}
                            </select>
                        </div>
                    ) : (
                        <div className="space-y-2">
                             <input 
                                type="text" placeholder="Full Name" 
                                className="w-full p-2 border rounded bg-white text-gray-900 text-sm"
                                value={newCustName} onChange={e => setNewCustName(e.target.value)}
                             />
                             <input 
                                type="text" placeholder="Contact" 
                                className="w-full p-2 border rounded bg-white text-gray-900 text-sm"
                                value={newCustContact} onChange={e => setNewCustContact(e.target.value)}
                             />
                        </div>
                    )}
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Cabin</label>
                        <select className="w-full border p-2 rounded bg-white text-gray-900" value={cabinId} onChange={e => setCabinId(e.target.value)}>
                            <option value="General">General</option>
                            {cabins.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Duration (mins)</label>
                        <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full border p-2 rounded bg-white text-gray-900" />
                     </div>
                 </div>

                 {manualError && <p role="alert" className="text-red-700 text-sm">{manualError}</p>}
                 <div className="bg-green-50 p-3 rounded border border-green-100">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Total Bill</label>
                            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full border p-2 rounded bg-white text-gray-900 font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Paid Now</label>
                            <input type="number" value={paidAmount} onChange={e => setPaidAmount(Number(e.target.value))} className="w-full border border-green-400 p-2 rounded bg-white text-gray-900 font-bold text-green-700" />
                        </div>
                     </div>
                     <div className="flex justify-between items-center mt-2">
                        {balance > 0 ? (
                            <span className="text-xs text-red-600 font-bold">Credit Added: Rs.{balance}</span>
                        ) : <span className="text-xs text-green-600 font-bold">Fully Paid</span>}

                        <button 
                            onClick={() => setPaidAmount(0)}
                            className="text-xs text-purple-600 font-bold hover:underline"
                        >
                            Mark as Unpaid (Credit)
                        </button>
                     </div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Reason for Offline Entry</label>
                    <select className="w-full border p-2 rounded bg-white text-gray-900" value={reason} onChange={e => setReason(e.target.value)}>
                        <option value="Power Failure">Power Failure / Load Shedding</option>
                        <option value="System Crash">System Crash</option>
                        <option value="Forgot to Entry">Forgot to Entry</option>
                        <option value="Internet Down">Internet Down</option>
                        <option value="Other">Other</option>
                    </select>
                 </div>

                 <button disabled={manualSaving}
                    onClick={handleSave} className="w-full bg-purple-700 text-white font-bold py-3 rounded-lg hover:bg-purple-800">
                     Save Manual Record
                 </button>
             </div>
          </div>
        </div>
    );
};