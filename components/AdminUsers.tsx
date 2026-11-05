
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { UserRole, User } from '../types';
import { Users, Plus, Edit2, Trash2, Key, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';

export const AdminUsers: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, adminResetPassword, currentUser } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Password Reset State
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newResetPw, setNewResetPw] = useState('');

  // Form State
  const [formData, setFormData] = useState({
      username: '',
      passwordHash: '',
      fullName: '',
      email: '',
      role: UserRole.USER,
      isActive: true
  });

  const handleOpenModal = (user?: User) => {
      if (user) {
          setEditingUser(user);
          setFormData({
              username: user.username,
              passwordHash: '', // Don't show hash
              fullName: user.fullName,
              email: user.email || '',
              role: user.role,
              isActive: user.isActive
          });
      } else {
          setEditingUser(null);
          setFormData({
              username: '',
              passwordHash: '',
              fullName: '',
              email: '',
              role: UserRole.USER,
              isActive: true
          });
      }
      setIsModalOpen(true);
  };

  const handleSave = () => {
      if (!formData.username || !formData.fullName) return;

      if (editingUser) {
          updateUser(editingUser.id, {
              username: formData.username,
              fullName: formData.fullName,
              email: formData.email,
              role: formData.role,
              isActive: formData.isActive
          });
      } else {
          if (formData.passwordHash.length < 12) {
              alert("Password must be at least 12 characters");
              return;
          }
          addUser({
              username: formData.username,
              passwordHash: formData.passwordHash,
              fullName: formData.fullName,
              email: formData.email,
              role: formData.role,
              isActive: formData.isActive
          });
      }
      setIsModalOpen(false);
  };

  const handleResetPassword = () => {
      if (resetUserId && newResetPw.length >= 12) {
          adminResetPassword(resetUserId, newResetPw);
          setResetUserId(null);
          setNewResetPw('');
          alert("Password reset successfully.");
      } else {
          alert("Password must be at least 12 characters.");
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
           <Users className="text-blue-600" /> User Management
        </h1>
        <button 
           onClick={() => handleOpenModal()}
           className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-bold text-sm"
        >
           <Plus size={16} /> Add User
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
         <table className="w-full text-left">
             <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                 <tr>
                     <th className="px-6 py-4">User</th>
                     <th className="px-6 py-4">Role</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4">Last Login</th>
                     <th className="px-6 py-4 text-center">Actions</th>
                 </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
                 {users.map(u => (
                     <tr key={u.id} className="hover:bg-gray-50">
                         <td className="px-6 py-4">
                             <div>
                                 <p className="font-bold text-gray-900">{u.fullName}</p>
                                 <p className="text-xs text-gray-500">@{u.username} • {u.email || 'No Email'}</p>
                             </div>
                         </td>
                         <td className="px-6 py-4">
                             <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                 {u.role}
                             </span>
                         </td>
                         <td className="px-6 py-4">
                             {u.isActive ? (
                                 <span className="text-green-600 font-bold text-xs flex items-center gap-1"><CheckCircle size={12}/> Active</span>
                             ) : (
                                 <span className="text-red-500 font-bold text-xs flex items-center gap-1"><X size={12}/> Locked</span>
                             )}
                         </td>
                         <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                             {u.lastLoginAt ? format(u.lastLoginAt, 'MMM dd, HH:mm') : 'Never'}
                         </td>
                         <td className="px-6 py-4 flex justify-center gap-2">
                             <button onClick={() => setResetUserId(u.id)} className="p-2 text-amber-600 hover:bg-amber-50 rounded" title="Reset Password">
                                 <Key size={16}/>
                             </button>
                             <button onClick={() => handleOpenModal(u)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Edit User">
                                 <Edit2 size={16}/>
                             </button>
                             {u.id !== currentUser?.id && (
                                 <button 
                                    onClick={() => { if(window.confirm('Delete user?')) deleteUser(u.id); }} 
                                    className="p-2 text-red-600 hover:bg-red-50 rounded" 
                                    title="Delete User"
                                 >
                                     <Trash2 size={16}/>
                                 </button>
                             )}
                         </td>
                     </tr>
                 ))}
             </tbody>
         </table>
      </div>

      {/* User Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                 <h2 className="text-xl font-bold mb-4">{editingUser ? 'Edit User' : 'Add New User'}</h2>
                 
                 <div className="space-y-3">
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase">Username</label>
                         <input type="text" className="w-full border p-2 rounded" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase">Full Name</label>
                         <input type="text" className="w-full border p-2 rounded" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase">Email</label>
                         <input type="email" className="w-full border p-2 rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Role</label>
                            <select className="w-full border p-2 rounded" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                                <option value={UserRole.USER}>User</option>
                                <option value={UserRole.ADMIN}>Admin</option>
                            </select>
                        </div>
                        <div className="flex items-center pt-5">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                                <span className="text-sm font-medium">Account Active</span>
                            </label>
                        </div>
                     </div>

                     {!editingUser && (
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Initial Password</label>
                            <input type="password" className="w-full border p-2 rounded" value={formData.passwordHash} onChange={e => setFormData({...formData, passwordHash: e.target.value})} />
                         </div>
                     )}

                     <div className="flex gap-2 mt-4 pt-2 border-t">
                         <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                         <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Save User</button>
                     </div>
                 </div>
             </div>
          </div>
      )}

      {/* Password Reset Modal */}
      {resetUserId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
             <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
                 <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                     <Key className="text-amber-600" size={24}/>
                 </div>
                 <h2 className="text-lg font-bold mb-2">Reset Password</h2>
                 <p className="text-sm text-gray-500 mb-4">Set a temporary password for this user.</p>
                 
                 <input 
                    type="text" 
                    placeholder="New Password" 
                    className="w-full border p-2 rounded mb-4 text-center font-mono"
                    value={newResetPw}
                    onChange={e => setNewResetPw(e.target.value)}
                    autoFocus
                 />
                 
                 <div className="flex gap-2">
                     <button onClick={() => setResetUserId(null)} className="flex-1 py-2 bg-gray-100 rounded text-gray-700 font-bold">Cancel</button>
                     <button onClick={handleResetPassword} className="flex-1 py-2 bg-amber-500 text-white rounded font-bold hover:bg-amber-600">Reset</button>
                 </div>
             </div>
          </div>
      )}

    </div>
  );
};
