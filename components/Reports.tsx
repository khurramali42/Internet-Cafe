
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';
import { 
  format, startOfDay, endOfDay, isWithinInterval, parseISO, 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, 
  eachDayOfInterval
} from 'date-fns';
import { 
  ArrowDownRight, ArrowUpRight, Calendar, DollarSign, TrendingUp, 
  Users, Monitor, CreditCard, Filter 
} from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const Reports: React.FC = () => {
  const { transactions, sessions, customers } = useAppStore();
  
  // Date Range State
  const [dateRange, setDateRange] = useState({
      start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  
  const [filterType, setFilterType] = useState<'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM'>('MONTH');

  // Quick Filter Handlers
  const applyFilter = (type: 'WEEK' | 'MONTH' | 'YEAR') => {
      const now = new Date();
      let start = new Date();
      let end = new Date();

      if (type === 'WEEK') {
          start = startOfWeek(now, { weekStartsOn: 1 });
          end = endOfWeek(now, { weekStartsOn: 1 });
      } else if (type === 'MONTH') {
          start = startOfMonth(now);
          end = endOfMonth(now);
      } else if (type === 'YEAR') {
          start = subMonths(now, 11); // Last 12 months roughly
          start = startOfMonth(start); // Start from 1st of that month
          end = endOfMonth(now);
      }

      setFilterType(type);
      setDateRange({
          start: format(start, 'yyyy-MM-dd'),
          end: format(end, 'yyyy-MM-dd')
      });
  };

  // --- DATA FILTERING ---
  
  const filteredData = useMemo(() => {
    const start = startOfDay(parseISO(dateRange.start));
    const end = endOfDay(parseISO(dateRange.end));

    const txs = transactions.filter(t => 
        isWithinInterval(new Date(t.date), { start, end })
    );

    const sess = sessions.filter(s => 
        isWithinInterval(new Date(s.inTime), { start, end })
    );

    return { txs, sess, start, end };
  }, [dateRange, transactions, sessions]);

  // --- ANALYTICS CALCULATIONS ---

  const metrics = useMemo(() => {
      const income = filteredData.txs.filter(t => t.type === 'PAYMENT').reduce((acc, t) => acc + t.amount, 0);
      const expense = filteredData.txs.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
      const profit = income - expense;
      const totalSessions = filteredData.sess.length;
      
      return { income, expense, profit, totalSessions };
  }, [filteredData]);

  // --- CHART DATA PREPARATION ---

  // 1. Cash Flow Trend (Line/Area Chart)
  const trendData = useMemo(() => {
      const days = eachDayOfInterval({ start: filteredData.start, end: filteredData.end });
      
      return days.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          // Find transactions for this day
          const dayTxs = filteredData.txs.filter(t => format(new Date(t.date), 'yyyy-MM-dd') === dayStr);
          
          const inc = dayTxs.filter(t => t.type === 'PAYMENT').reduce((acc, t) => acc + t.amount, 0);
          const exp = dayTxs.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
          
          return {
              date: format(day, 'dd MMM'),
              income: inc,
              expense: exp,
              profit: inc - exp
          };
      });
  }, [filteredData]);

  // 2. Top Customers (Table)
  const topCustomers = useMemo(() => {
      const custMap: Record<string, number> = {};
      
      // Calculate total spent based on Payment transactions in the selected range
      filteredData.txs.filter(t => t.type === 'PAYMENT' && t.customerId).forEach(t => {
          if(t.customerId) {
              custMap[t.customerId] = (custMap[t.customerId] || 0) + t.amount;
          }
      });

      return Object.entries(custMap)
          .map(([id, amount]) => {
              const c = customers.find(cust => cust.id === id);
              return { name: c?.name || 'Unknown', amount, id };
          })
          .sort((a,b) => b.amount - a.amount)
          .slice(0, 5); // Top 5
  }, [filteredData, customers]);

  // 3. Cabin Revenue Performance (Bar Chart)
  const cabinRevenue = useMemo(() => {
      const cabinMap: Record<string, number> = {};
      
      filteredData.sess.forEach(s => {
          cabinMap[s.cabinId] = (cabinMap[s.cabinId] || 0) + s.amountDue;
      });

      return Object.entries(cabinMap)
        .map(([id, revenue]) => ({ name: id.replace('cab-', 'Cabin '), revenue }))
        .sort((a,b) => b.revenue - a.revenue);
  }, [filteredData]);

  // 4. Expense Breakdown (Pie Chart)
  const expenseBreakdown = useMemo(() => {
      const stats: Record<string, number> = {};
      filteredData.txs.filter(t => t.type === 'EXPENSE').forEach(t => {
          const cat = t.category || 'Other';
          stats[cat] = (stats[cat] || 0) + t.amount;
      });
      return Object.entries(stats)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value);
  }, [filteredData]);

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
         <div>
             <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                 <TrendingUp className="text-blue-600" /> Analytics Dashboard
             </h1>
             <p className="text-gray-500 text-sm">Financial performance, customer trends, and shop metrics.</p>
         </div>
         
         <div className="flex flex-col md:flex-row gap-3">
             <div className="flex bg-gray-100 p-1 rounded-lg">
                 <button 
                    onClick={() => applyFilter('WEEK')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${filterType === 'WEEK' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                    This Week
                 </button>
                 <button 
                    onClick={() => applyFilter('MONTH')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${filterType === 'MONTH' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                    This Month
                 </button>
                 <button 
                    onClick={() => applyFilter('YEAR')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${filterType === 'YEAR' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                    This Year
                 </button>
             </div>

             <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                 <Calendar size={16} className="text-gray-400" />
                 <input 
                    type="date" 
                    className="bg-transparent text-xs font-bold text-gray-700 outline-none"
                    value={dateRange.start}
                    onChange={e => { setDateRange({...dateRange, start: e.target.value}); setFilterType('CUSTOM'); }}
                 />
                 <span className="text-gray-300">-</span>
                 <input 
                    type="date" 
                    className="bg-transparent text-xs font-bold text-gray-700 outline-none"
                    value={dateRange.end}
                    onChange={e => { setDateRange({...dateRange, end: e.target.value}); setFilterType('CUSTOM'); }}
                 />
             </div>
         </div>
      </div>

      {/* 1. KEY METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Income */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition">
              <DollarSign size={64} className="text-green-600" />
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Income</p>
          <h2 className="text-3xl font-bold text-gray-800 mt-1">Rs.{metrics.income.toLocaleString()}</h2>
          <div className="flex items-center gap-1 text-green-600 text-xs font-bold mt-2 bg-green-50 w-fit px-2 py-1 rounded">
              <ArrowUpRight size={14} /> Revenue
          </div>
        </div>

        {/* Expense */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition">
              <ArrowDownRight size={64} className="text-red-600" />
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Expense</p>
          <h2 className="text-3xl font-bold text-gray-800 mt-1">Rs.{metrics.expense.toLocaleString()}</h2>
          <div className="flex items-center gap-1 text-red-600 text-xs font-bold mt-2 bg-red-50 w-fit px-2 py-1 rounded">
              <ArrowDownRight size={14} /> Spending
          </div>
        </div>

        {/* Profit */}
        <div className={`p-6 rounded-xl shadow-sm border relative overflow-hidden ${metrics.profit >= 0 ? 'bg-gradient-to-br from-green-50 to-white border-green-200' : 'bg-gradient-to-br from-red-50 to-white border-red-200'}`}>
          <p className={`${metrics.profit >= 0 ? 'text-green-700' : 'text-red-700'} text-xs font-bold uppercase tracking-wider`}>Net Profit / Loss</p>
          <h2 className={`${metrics.profit >= 0 ? 'text-green-800' : 'text-red-800'} text-3xl font-bold mt-1`}>
             {metrics.profit >= 0 ? '+' : ''}Rs.{metrics.profit.toLocaleString()}
          </h2>
          <p className="text-xs opacity-60 mt-2 font-medium">Cash In Hand</p>
        </div>

        {/* Sessions Activity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Activity</p>
           <h2 className="text-3xl font-bold text-blue-600 mt-1">{metrics.totalSessions} <span className="text-lg text-gray-400 font-normal">Sessions</span></h2>
           <p className="text-xs text-gray-400 mt-2">In selected period</p>
        </div>
      </div>

      {/* 2. MAIN CHARTS AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Trend Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2 h-96">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <TrendingUp size={18} className="text-blue-600"/> Cash Flow Trend
                </h3>
                <div className="text-xs text-gray-400 flex gap-4">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Income</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Expense</span>
                </div>
             </div>
             <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={trendData}>
                   <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                      </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                   <XAxis 
                      dataKey="date" 
                      tick={{fontSize: 10, fill: '#9ca3af'}}
                      axisLine={false}
                      tickLine={false}
                   />
                   <YAxis 
                      tick={{fontSize: 10, fill: '#9ca3af'}}
                      axisLine={false}
                      tickLine={false}
                   />
                   <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                   />
                   <Area type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" name="Income" />
                   <Area type="monotone" dataKey="expense" stroke="#dc2626" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" name="Expense" />
                </AreaChart>
             </ResponsiveContainer>
          </div>

          {/* Top Customers List */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96 flex flex-col">
             <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-4">
                <Users size={18} className="text-purple-600"/> Top Customers
             </h3>
             <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                 {topCustomers.length > 0 ? (
                     topCustomers.map((c, i) => (
                         <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition">
                             <div className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                     i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-600'
                                 }`}>
                                     {i + 1}
                                 </div>
                                 <div>
                                     <p className="text-sm font-bold text-gray-800">{c.name}</p>
                                     <p className="text-[10px] text-gray-400">Customer ID: {c.id.slice(-4)}</p>
                                 </div>
                             </div>
                             <div className="text-right">
                                 <p className="text-sm font-bold text-green-600">Rs.{c.amount}</p>
                             </div>
                         </div>
                     ))
                 ) : (
                     <p className="text-gray-400 text-sm text-center py-10">No customer data available.</p>
                 )}
             </div>
          </div>
      </div>

      {/* 3. SECONDARY CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Cabin Revenue */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
              <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-4">
                  <Monitor size={18} className="text-blue-600"/> Revenue by Cabin
              </h3>
              <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={cabinRevenue} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={70} tick={{fontSize: 11}} />
                      <Tooltip cursor={{fill: 'transparent'}} />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} name="Revenue (Rs)" />
                  </BarChart>
              </ResponsiveContainer>
          </div>

          {/* Expense Breakdown */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 flex flex-col">
              <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-2">
                  <CreditCard size={18} className="text-red-600"/> Where Money Goes (Expenses)
              </h3>
              <div className="flex-1 flex">
                <ResponsiveContainer width="60%" height="100%">
                    <PieChart>
                        <Pie
                            data={expenseBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {expenseBreakdown.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(val: number) => `Rs.${val}`}/>
                    </PieChart>
                </ResponsiveContainer>
                <div className="w-[40%] overflow-y-auto text-xs space-y-1 py-4 pr-2">
                    {expenseBreakdown.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between">
                            <span className="flex items-center gap-1 truncate" title={entry.name}>
                                <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                                {entry.name}
                            </span>
                            <span className="font-bold text-gray-600">Rs.{entry.value}</span>
                        </div>
                    ))}
                </div>
              </div>
          </div>
      </div>
    </div>
  );
};
