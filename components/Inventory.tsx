
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { InventoryItem } from '../types';
import { Package, Plus, Trash2, Edit2, Search, Monitor, Mouse, Keyboard, Wifi, Cable, Filter, X } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  PERIPHERAL: <Mouse size={16} />,
  HARDWARE: <Monitor size={16} />,
  NETWORK: <Wifi size={16} />,
  CABLE: <Cable size={16} />,
  FURNITURE: <Package size={16} />,
  OTHER: <Package size={16} />,
};

const PREDEFINED_CATEGORIES = [
  "PERIPHERAL",
  "HARDWARE",
  "NETWORK",
  "CABLE",
  "FURNITURE",
  "OTHER"
];

const PREDEFINED_STATUSES = [
  "IN_USE",
  "SPARE",
  "BROKEN",
  "MISSING"
];

export const Inventory: React.FC = () => {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Toggle state for custom inputs
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isCustomStatus, setIsCustomStatus] = useState(false);

  // Filters
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Form State
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    name: '',
    category: 'PERIPHERAL',
    quantity: 1,
    status: 'IN_USE',
    cost: 0,
    remarks: ''
  });

  // Combine predefined with any custom categories currently in the database
  const availableCategories = Array.from(new Set([
    ...PREDEFINED_CATEGORIES,
    ...inventory.map(i => i.category)
  ]));

  const availableStatuses = Array.from(new Set([
    ...PREDEFINED_STATUSES,
    ...inventory.map(i => i.status)
  ]));

  const filteredItems = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'ALL' || item.category === filterCategory;
    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleOpenModal = (item?: InventoryItem) => {
    setIsCustomCategory(false);
    setIsCustomStatus(false);
    
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        category: 'PERIPHERAL',
        quantity: 1,
        status: 'IN_USE',
        cost: 0,
        purchaseDate: Date.now(),
        remarks: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) return;

    if (editingItem) {
      updateInventoryItem({ ...editingItem, ...formData } as InventoryItem);
    } else {
      addInventoryItem({
        ...formData as Omit<InventoryItem, 'id'>,
        purchaseDate: formData.purchaseDate || Date.now()
      });
    }
    setIsModalOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'IN_USE' || s === 'IN USE') return 'bg-green-100 text-green-700';
    if (s === 'SPARE') return 'bg-blue-100 text-blue-700';
    if (s === 'BROKEN') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
             <Package className="text-blue-600" /> Inventory / Tech Stock
           </h1>
           <p className="text-gray-500 text-sm">Manage computer parts, cables, and shop furniture.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
        >
          <Plus size={18} /> Add New Item
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search items..." 
              className="pl-10 pr-4 py-2 border rounded-lg w-full bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="flex gap-2">
            <div className="relative">
                <Filter className="absolute left-2 top-2.5 text-gray-400" size={14} />
                <select 
                    className="pl-8 pr-4 py-2 border rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 appearance-none h-full"
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                >
                    <option value="ALL">All Categories</option>
                    {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div className="relative">
                <Filter className="absolute left-2 top-2.5 text-gray-400" size={14} />
                <select 
                    className="pl-8 pr-4 py-2 border rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 appearance-none h-full"
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                >
                    <option value="ALL">All Status</option>
                    {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
         </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Item Name</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-center">Qty</th>
              <th className="px-6 py-4 text-right">Unit Cost</th>
              <th className="px-6 py-4 text-right">Date</th>
              <th className="px-6 py-4">Remarks</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
             {filteredItems.map(item => (
               <tr key={item.id} className="hover:bg-gray-50 transition">
                 <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                 <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                       {CATEGORY_ICONS[item.category] || <Package size={12}/>} {item.category}
                    </span>
                 </td>
                 <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusBadge(item.status)}`}>
                        {item.status.replace('_', ' ')}
                    </span>
                 </td>
                 <td className="px-6 py-4 text-center font-mono">
                    {item.quantity}
                 </td>
                 <td className="px-6 py-4 text-right text-gray-600">
                    Rs.{item.cost}
                 </td>
                 <td className="px-6 py-4 text-right text-xs text-gray-500">
                    {format(item.purchaseDate, 'MMM d, yyyy')}
                 </td>
                 <td className="px-6 py-4 text-xs text-gray-500 italic max-w-xs truncate">
                    {item.remarks || '-'}
                 </td>
                 <td className="px-6 py-4 flex justify-center gap-2">
                    <button onClick={() => handleOpenModal(item)} className="text-blue-600 hover:bg-blue-50 p-1 rounded">
                       <Edit2 size={16} />
                    </button>
                    <button 
                        onClick={() => {
                            if(window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
                                deleteInventoryItem(item.id);
                            }
                        }} 
                        className="text-red-600 hover:bg-red-50 p-1 rounded"
                        title="Delete Item"
                    >
                       <Trash2 size={16} />
                    </button>
                 </td>
               </tr>
             ))}
             {filteredItems.length === 0 && (
                <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                        No items found matching your filters.
                    </td>
                </tr>
             )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
               <div className="bg-blue-600 p-4 text-white font-bold text-lg flex justify-between">
                  <span>{editingItem ? 'Edit Item' : 'Add New Inventory'}</span>
                  <button onClick={() => setIsModalOpen(false)}><span className="text-xl">&times;</span></button>
               </div>
               <div className="p-6 space-y-4">
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                     <input 
                       type="text" 
                       className="w-full border p-2 rounded bg-white text-gray-900"
                       placeholder="e.g. Mechanical Keyboard"
                       value={formData.name}
                       onChange={e => setFormData({...formData, name: e.target.value})}
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      {/* Category Input */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        {isCustomCategory ? (
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              className="w-full border p-2 rounded bg-white text-gray-900 border-blue-500 ring-1 ring-blue-500"
                              value={formData.category}
                              onChange={e => setFormData({...formData, category: e.target.value})}
                              placeholder="New Category Name"
                              autoFocus
                            />
                            <button 
                              onClick={() => { setIsCustomCategory(false); setFormData({...formData, category: 'PERIPHERAL'}); }}
                              className="p-2 bg-gray-100 rounded text-gray-600 hover:bg-gray-200"
                              title="Cancel custom category"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <select 
                            className="w-full border p-2 rounded bg-white text-gray-900"
                            value={formData.category}
                            onChange={e => {
                                if(e.target.value === '__NEW__') {
                                    setIsCustomCategory(true);
                                    setFormData({...formData, category: ''});
                                } else {
                                    setFormData({...formData, category: e.target.value});
                                }
                            }}
                          >
                            {PREDEFINED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            {availableCategories
                                .filter(c => !PREDEFINED_CATEGORIES.includes(c))
                                .map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="__NEW__" className="font-bold text-blue-600 bg-blue-50">+ Create New...</option>
                          </select>
                        )}
                      </div>

                      {/* Status Input */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        {isCustomStatus ? (
                           <div className="flex gap-2">
                             <input 
                               type="text" 
                               className="w-full border p-2 rounded bg-white text-gray-900 border-blue-500 ring-1 ring-blue-500"
                               value={formData.status}
                               onChange={e => setFormData({...formData, status: e.target.value})}
                               placeholder="New Status"
                               autoFocus
                             />
                             <button 
                               onClick={() => { setIsCustomStatus(false); setFormData({...formData, status: 'IN_USE'}); }}
                               className="p-2 bg-gray-100 rounded text-gray-600 hover:bg-gray-200"
                               title="Cancel custom status"
                             >
                               <X size={18} />
                             </button>
                           </div>
                        ) : (
                           <select 
                              className="w-full border p-2 rounded bg-white text-gray-900"
                              value={formData.status}
                              onChange={e => {
                                  if(e.target.value === '__NEW__') {
                                      setIsCustomStatus(true);
                                      setFormData({...formData, status: ''});
                                  } else {
                                      setFormData({...formData, status: e.target.value});
                                  }
                              }}
                           >
                              {PREDEFINED_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              {availableStatuses
                                  .filter(s => !PREDEFINED_STATUSES.includes(s))
                                  .map(s => <option key={s} value={s}>{s}</option>)}
                              <option value="__NEW__" className="font-bold text-blue-600 bg-blue-50">+ Create New...</option>
                           </select>
                        )}
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                        <input 
                            type="number" 
                            className="w-full border p-2 rounded bg-white text-gray-900"
                            value={formData.quantity}
                            onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (Rs.)</label>
                        <input 
                            type="number" 
                            className="w-full border p-2 rounded bg-white text-gray-900"
                            value={formData.cost}
                            onChange={e => setFormData({...formData, cost: Number(e.target.value)})}
                        />
                     </div>
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                     <textarea 
                        className="w-full border p-2 rounded bg-white text-gray-900"
                        rows={2}
                        placeholder="Optional notes..."
                        value={formData.remarks}
                        onChange={e => setFormData({...formData, remarks: e.target.value})}
                     />
                  </div>

                  <button 
                    onClick={handleSave}
                    className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 mt-2"
                  >
                    Save Item
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
