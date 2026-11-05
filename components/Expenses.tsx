
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { format } from 'date-fns';
import { TrendingDown, Plus, FileText, Filter, Search, X } from 'lucide-react';

export const Expenses: React.FC = () => {
  const { transactions, addTransaction } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Form
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState('Internet Bill (ISP)');
  const [savingExpense, setSavingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState('');
  const [expenseKey, setExpenseKey] = useState<string | null>(null);

  const BASE_CATEGORIES = [
    'Internet Bill (ISP)',
    'Electricity Bill',
    'Rent',
    'Hardware Repair',
    'New Equipment',
    'Refreshments/Tea',
    'Salary/Wages',
    'Stationary',
    'Other'
  ];

  const expenses = transactions.filter(t => t.type === 'EXPENSE');

  // Get unique categories for filter (Base + whatever is in DB)
  const existingCategories = Array.from(new Set([
      ...BASE_CATEGORIES,
      ...expenses.map(e => e.category || 'Uncategorized')
  ]));

  // Filter Logic
  const filteredExpenses = expenses.filter(t => {
      // Date Filter
      const txDate = new Date(t.date);
      const [year, month] = selectedMonth.split('-');
      const isCorrectMonth = txDate.getFullYear() === parseInt(year) && txDate.getMonth() + 1 === parseInt(month);

      // Category Filter
      const isCorrectCategory = filterCategory === 'ALL' || t.category === filterCategory;

      // Search Filter
      const isSearchMatch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (t.category || '').toLowerCase().includes(searchTerm.toLowerCase());

      return isCorrectMonth && isCorrectCategory && isSearchMatch;
  });

  const totalMonthlyExpense = filteredExpenses.reduce((acc, t) => acc + t.amount, 0);

  const handleSave = async () => {
      if (!description.trim() || !Number.isFinite(amount) || amount <= 0 || savingExpense) return;
      const key = expenseKey || crypto.randomUUID();
      setExpenseKey(key);
      setSavingExpense(true);
      setExpenseError('');
      const saved = await addTransaction({
          type: 'EXPENSE', amount, description: description.trim(), category: category || 'General'
      }, key);
      setSavingExpense(false);
      if (!saved) {
          setExpenseError('Expense was not confirmed. Verify server records before retrying.');
          return;
      }
      setExpenseKey(null);
      setDescription('');
      setAmount(0);
      setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <TrendingDown className="text-red-600" /> Expense Manager
           </h1>
           <p className="text-gray-500 text-sm">Track monthly bills, repairs, and shop costs.</p>
        </div>
        <button 
            onClick={() => {
                setIsModalOpen(true);
                setIsCustomCategory(false);
                setCategory(BASE_CATEGORIES[0]);
                setDescription('');
                setAmount(0);
                setExpenseError('');
                setExpenseKey(null);
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 font-medium"
        >
            <Plus size={18} /> Add Expense
        </button>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 items-end md:items-center">
          <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Month</label>
              <input 
                type="month" 
                className="border p-2 rounded-lg bg-white text-gray-900"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              />
          </div>
          
          <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-500 mb-1">Search</label>
              <div className="relative">
                  <Search className="absolute left-2 top-2.5 text-gray-400" size={16}/>
                  <input 
                    type="text" 
                    placeholder="Search description..."
                    className="w-full pl-8 pr-4 py-2 border rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-red-500"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
              </div>
          </div>

          <div className="min-w-[200px]">
              <label className="block text-xs font-bold text-gray-500 mb-1">Category</label>
              <div className="relative">
                  <Filter className="absolute left-2 top-2.5 text-gray-400" size={16}/>
                  <select 
                    className="w-full pl-8 pr-4 py-2 border rounded-lg bg-white text-gray-900 appearance-none focus:ring-2 focus:ring-red-500"
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                  >
                      <option value="ALL">All Categories</option>
                      {existingCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Summary Card */}
         <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-xl border border-red-100 shadow-sm">
             <p className="text-gray-500 font-medium text-sm">Total Filtered Expenses</p>
             <h2 className="text-4xl font-bold text-red-600 mt-2">Rs.{totalMonthlyExpense.toLocaleString()}</h2>
             <p className="text-xs text-red-400 mt-2">Sum of {filteredExpenses.length} records</p>
         </div>
      </div>

      {/* Expense List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <FileText size={18} className="text-gray-400"/>
            <h3 className="font-bold text-gray-700">Expense History</h3>
        </div>
        <table className="w-full text-left">
           <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
               <tr>
                   <th className="px-6 py-4">Date</th>
                   <th className="px-6 py-4">Category</th>
                   <th className="px-6 py-4">Description</th>
                   <th className="px-6 py-4 text-right">Amount</th>
               </tr>
           </thead>
           <tbody className="divide-y divide-gray-100">
               {filteredExpenses.map(t => (
                   <tr key={t.id} className="hover:bg-gray-50">
                       <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                           {format(t.date, 'dd MMM, HH:mm')}
                       </td>
                       <td className="px-6 py-4">
                           <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200">
                               {t.category || 'General'}
                           </span>
                       </td>
                       <td className="px-6 py-4 text-gray-800">{t.description}</td>
                       <td className="px-6 py-4 text-right font-bold text-red-600">
                           Rs.{t.amount}
                       </td>
                   </tr>
               ))}
               {filteredExpenses.length === 0 && (
                   <tr>
                       <td colSpan={4} className="p-8 text-center text-gray-400">
                           No expenses found matching criteria.
                       </td>
                   </tr>
               )}
           </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                 <div className="bg-red-600 p-4 text-white font-bold flex justify-between rounded-t-xl">
                     <span>Add Expense</span>
                     <button onClick={() => setIsModalOpen(false)}>&times;</button>
                 </div>
                 <div className="p-6 space-y-4">
                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                         {isCustomCategory ? (
                             <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    className="w-full border p-2 rounded bg-white text-gray-900 border-red-500 ring-1 ring-red-500"
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    placeholder="New Category Name"
                                    autoFocus
                                />
                                <button 
                                  onClick={() => { setIsCustomCategory(false); setCategory(BASE_CATEGORIES[0]); }}
                                  className="p-2 bg-gray-100 rounded text-gray-600 hover:bg-gray-200"
                                  title="Cancel custom category"
                                >
                                  <X size={18} />
                                </button>
                             </div>
                         ) : (
                             <select 
                                className="w-full border p-2 rounded bg-white text-gray-900"
                                value={category}
                                onChange={e => {
                                    if(e.target.value === '__NEW__') {
                                        setIsCustomCategory(true);
                                        setCategory('');
                                    } else {
                                        setCategory(e.target.value);
                                    }
                                }}
                             >
                                {BASE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                {existingCategories
                                    .filter(c => !BASE_CATEGORIES.includes(c))
                                    .map(c => <option key={c} value={c}>{c}</option>)}
                                <option value="__NEW__" className="font-bold text-red-600 bg-red-50">+ Create New...</option>
                             </select>
                         )}
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Description / Notes</label>
                         <input 
                            type="text" 
                            className="w-full border p-2 rounded bg-white text-gray-900"
                            placeholder="e.g. Paid PTCL Bill"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                         />
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rs.)</label>
                         <input 
                            type="number" 
                            className="w-full border p-2 rounded bg-white text-gray-900"
                            value={amount}
                            onChange={e => setAmount(Number(e.target.value))}
                         />
                     </div>
                     {expenseError && <p role="alert" className="text-red-600 text-sm">{expenseError}</p>}
                     <button 
                        disabled={savingExpense}
                        onClick={() => { void handleSave(); }}
                        className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 mt-2"
                     >
                         Record Expense
                     </button>
                 </div>
              </div>
          </div>
      )}
    </div>
  );
};
