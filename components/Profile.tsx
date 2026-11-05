
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { User as UserIcon, Lock, CheckCircle, AlertTriangle } from 'lucide-react';

export const Profile: React.FC = () => {
  const { currentUser, changePassword, updateProfile, isOffline } = useAppStore();
  
  // Profile State
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [profileMsg, setProfileMsg] = useState('');

  // Password State
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ fullName, email, phone });
    setProfileMsg('Profile updated successfully.');
    setTimeout(() => setProfileMsg(''), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg({ type: '', text: '' });

    if (newPw.length < (isOffline ? 3 : 12)) {
        setPwMsg({ type: 'error', text: 'Password must be at least 12 characters for server accounts.' });
        return;
    }
    if (newPw !== confirmPw) {
        setPwMsg({ type: 'error', text: 'New passwords do not match.' });
        return;
    }

    const result = await changePassword(oldPw, newPw);
    if (result.success) {
        setPwMsg({ type: 'success', text: result.message });
        setOldPw('');
        setNewPw('');
        setConfirmPw('');
    } else {
        setPwMsg({ type: 'error', text: result.message });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
           <UserIcon className="text-blue-600" /> My Profile
       </h1>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Profile Info */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Personal Information</h3>
               
               <form onSubmit={handleUpdateProfile} className="space-y-4">
                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                       <input 
                         type="text" className="w-full border p-2 rounded bg-white text-gray-900"
                         value={fullName} onChange={e => setFullName(e.target.value)} required
                       />
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                       <input 
                         type="email" className="w-full border p-2 rounded bg-white text-gray-900"
                         value={email} onChange={e => setEmail(e.target.value)}
                       />
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                       <input 
                         type="text" className="w-full border p-2 rounded bg-white text-gray-900"
                         value={phone} onChange={e => setPhone(e.target.value)}
                       />
                   </div>

                   {profileMsg && <div className="text-green-600 text-sm font-bold flex items-center gap-1"><CheckCircle size={14}/> {profileMsg}</div>}

                   <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold text-sm w-full md:w-auto">
                       Update Info
                   </button>
               </form>
           </div>

           {/* Change Password */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                   <Lock size={16}/> Security
               </h3>

               <form onSubmit={handleChangePassword} className="space-y-4">
                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Current Password</label>
                       <input 
                         type="password" className="w-full border p-2 rounded bg-white text-gray-900"
                         value={oldPw} onChange={e => setOldPw(e.target.value)} required
                       />
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Password</label>
                       <input 
                         type="password" className="w-full border p-2 rounded bg-white text-gray-900"
                         value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={isOffline ? 3 : 12}
                       />
                       <p className="text-[10px] text-gray-400 mt-1">{isOffline ? 'Demo password: minimum 3 characters.' : 'Minimum 12 characters for server accounts.'}</p>
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirm New Password</label>
                       <input 
                         type="password" className="w-full border p-2 rounded bg-white text-gray-900"
                         value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required
                       />
                   </div>

                   {pwMsg.text && (
                       <div className={`text-sm font-bold flex items-center gap-1 ${pwMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                           {pwMsg.type === 'success' ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>} {pwMsg.text}
                       </div>
                   )}

                   <button className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-900 font-bold text-sm w-full md:w-auto">
                       Change Password
                   </button>
               </form>
           </div>
       </div>
    </div>
  );
};
