
import React, { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { Search, DollarSign, User, History } from 'lucide-react';
import { CustomerHistoryModal } from './ActionModals';

export const Customers: React.FC = () => {
  const { customers, updateCustomer, addTransaction } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [settleModalOpen, setSettleModalOpen] = useState<string | null>(null);
  const [historyModalId, setHistoryModalId] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState(0);
  const [settleRemarks, setSettleRemarks] = useState('');

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.contact.includes(searchTerm)
  );

  const { settleBalance } = useAppStore();
  const [settling, setSettling] = useState(false);
  const [settlementError, setSettlementError] = useState('');
  const settlementKey = useRef<string | null>(null);
  const settlementPending = useRef(false);

  const handleSettleBalance = async (customerId: string) => {
    const cust = customers.find(c => c.id === customerId);
    if (!cust || settleAmount <= 0 || settlementPending.current) return;

    if ((import.meta.env.VITE_API_URL || '').trim()) {
        const key = settlementKey.current || crypto.randomUUID();
        settlementKey.current = key;
        settlementPending.current = true;
        setSettling(true);
        setSettlementError('');
        const saved = await settleBalance(customerId, settleAmount, key);
        settlementPending.current = false;
        setSettling(false);
        if (!saved) {
            setSettlementError('Balance payment was not confirmed. Check the server record before retrying.');
            return;
        }
    } else {
        addTransaction({
            type: 'PAYMENT', amount: settleAmount,
            description: `Balance Settlement - ${cust.name}`,
            customerId: cust.id, category: 'Settlement'
        });
        updateCustomer({ ...cust, outstandingBalance: cust.outstandingBalance - settleAmount });
    }
    setSettleModalOpen(null);
    setSettleAmount(0);
    setSettleRemarks('');
    settlementKey.current = null;
  };

  const activeCustomer = customers.find(c => c.id === historyModalId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Customer Directory</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search customers..." 
            className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64 bg-white text-gray-900"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Customer ID</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4 text-right">Total Spent</th>
              <th className="px-6 py-4 text-right">Outstanding</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(customer => (
              <tr key={customer.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 text-xs font-mono text-gray-500">
                    {customer.id}
                </td>
                <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <User size={16} />
                   </div>
                   {customer.name}
                </td>
                <td className="px-6 py-4 text-gray-600">{customer.contact}</td>
                <td className="px-6 py-4 text-right font-mono text-gray-700">Rs.{customer.totalSpent}</td>
                <td className="px-6 py-4 text-right">
                  {customer.outstandingBalance > 0 ? (
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs font-bold">
                      Rs.{customer.outstandingBalance}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">Paid</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                   <div className="flex justify-center gap-2">
                        <button 
                            onClick={() => setHistoryModalId(customer.id)}
                            className="text-gray-600 hover:text-blue-600 text-sm font-medium flex items-center gap-1"
                            title="View History Log"
                        >
                            <History size={16} />
                        </button>
                        {customer.outstandingBalance > 0 && (
                            <button 
                                onClick={() => {
                                    setSettleModalOpen(customer.id);
                                    setSettleAmount(customer.outstandingBalance);
                                    setSettlementError('');
                                    settlementKey.current = null;
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                                title="Settle Balance"
                                >
                                <DollarSign size={16} />
                            </button>
                        )}
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
            <div className="p-8 text-center text-gray-500">
                No customers found.
            </div>
        )}
      </div>

      {/* Settle Modal */}
      {settleModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
           <div className="bg-white p-6 rounded-lg shadow-xl w-96">
               <h3 className="text-lg font-bold mb-4">Settle Outstanding</h3>
               <p className="text-sm text-gray-600 mb-2">Total Outstanding: Rs.{customers.find(c => c.id === settleModalOpen)?.outstandingBalance}</p>
               
               <input 
                 type="number" 
                 placeholder="Amount"
                 className="w-full border p-2 rounded mb-2 bg-white text-gray-900" 
                 value={settleAmount}
                 onChange={e => setSettleAmount(Number(e.target.value))}
               />
               <input 
                 type="text" 
                 placeholder="Remarks (Optional)"
                 className="w-full border p-2 rounded mb-4 bg-white text-gray-900 text-sm" 
                 value={settleRemarks}
                 onChange={e => setSettleRemarks(e.target.value)}
               />

               {settlementError && <p role="alert" className="text-red-700 text-sm mb-2">{settlementError}</p>}
               <div className="flex justify-end gap-2">
                   <button onClick={() => setSettleModalOpen(null)} className="px-4 py-2 text-gray-500">Cancel</button>
                   <button disabled={settling}
                                onClick={() => { void handleSettleBalance(settleModalOpen); }} className="px-4 py-2 bg-blue-600 text-white rounded">Pay Now</button>
               </div>
           </div>
        </div>
      )}

      {/* History Modal */}
      <CustomerHistoryModal 
        customer={activeCustomer}
        isOpen={!!historyModalId}
        onClose={() => setHistoryModalId(null)}
      />
    </div>
  );
};
