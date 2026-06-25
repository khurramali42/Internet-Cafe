
import React from 'react';
import { useAppStore } from '../store';
import { FileText, Shield } from 'lucide-react';
import { format } from 'date-fns';

export const AuditLogs: React.FC = () => {
  const { auditLogs } = useAppStore();

  return (
    <div className="space-y-6">
       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
               <Shield className="text-blue-600" /> Security Audit Logs
           </h1>
           <p className="text-gray-500 text-sm">Track logins, password changes, and administrative actions.</p>
       </div>

       <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
           <table className="w-full text-left">
               <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                   <tr>
                       <th className="px-6 py-4">Timestamp</th>
                       <th className="px-6 py-4">User</th>
                       <th className="px-6 py-4">Action</th>
                       <th className="px-6 py-4">Details</th>
                       <th className="px-6 py-4 text-right">IP Address</th>
                   </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                   {auditLogs.map(log => (
                       <tr key={log.id} className="hover:bg-gray-50">
                           <td className="px-6 py-3 font-mono text-sm text-gray-500">
                               {format(log.timestamp, 'yyyy-MM-dd HH:mm:ss')}
                           </td>
                           <td className="px-6 py-3 font-bold text-gray-800">
                               {log.username}
                           </td>
                           <td className="px-6 py-3">
                               <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                   log.action === 'LOGIN' ? 'bg-green-50 text-green-700 border-green-200' :
                                   log.action.includes('DELETE') ? 'bg-red-50 text-red-700 border-red-200' :
                                   'bg-blue-50 text-blue-700 border-blue-200'
                               }`}>
                                   {log.action}
                               </span>
                           </td>
                           <td className="px-6 py-3 text-sm text-gray-600">
                               {log.details}
                           </td>
                           <td className="px-6 py-3 text-right text-xs text-gray-400 font-mono">
                               {log.ipAddress}
                           </td>
                       </tr>
                   ))}
                   {auditLogs.length === 0 && (
                       <tr>
                           <td colSpan={5} className="p-8 text-center text-gray-400">No logs found.</td>
                       </tr>
                   )}
               </tbody>
           </table>
       </div>
    </div>
  );
};
