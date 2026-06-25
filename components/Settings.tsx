import React from 'react';
import { useAppStore } from '../store';
import { Wrench, CheckCircle, PieChart, Activity } from 'lucide-react';
import { format } from 'date-fns';

export const Settings: React.FC = () => {
  const { repairs } = useAppStore();

  const openRepairs = repairs.filter(r => r.status === 'OPEN');
  const closedRepairs = repairs.filter(r => r.status === 'CLOSED');

  // Calculate Breakdown Analytics
  const breakdownStats = repairs.reduce((acc, curr) => {
    // Extract main reason (before the " - " if custom notes exist)
    const reasonKey = curr.reason.split(' - ')[0]; 
    acc[reasonKey] = (acc[reasonKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">System Settings & Maintenance</h1>
        <p className="text-gray-500">Manage cabin repairs and analyze equipment performance.</p>
      </div>

      {/* Analytics Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
             <Activity size={20} className="text-blue-600" /> Breakdown Analytics (Nuksan ki Waja)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.keys(breakdownStats).length === 0 ? (
                  <p className="text-gray-400">No repair data available for analysis.</p>
              ) : (
                  Object.entries(breakdownStats).map(([reason, count]) => (
                      <div key={reason} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="text-sm font-medium text-gray-700">{reason}</span>
                          <span className="bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded text-xs">{count} times</span>
                      </div>
                  ))
              )}
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Open Repairs */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h3 className="font-bold text-red-600 flex items-center gap-2 mb-4">
             <Wrench size={18} /> Open Repair Tickets ({openRepairs.length})
           </h3>
           <div className="space-y-4">
             {openRepairs.length === 0 ? (
                <p className="text-gray-400 text-sm">No active maintenance issues.</p>
             ) : (
                openRepairs.map(repair => (
                    <div key={repair.id} className="p-4 bg-red-50 rounded-lg border border-red-100">
                        <div className="flex justify-between items-start">
                            <span className="font-bold text-gray-800">Cabin {repair.cabinId}</span>
                            <span className="text-xs text-red-600 font-mono bg-red-100 px-2 py-1 rounded">
                                {format(repair.startTime, 'MMM d, HH:mm')}
                            </span>
                        </div>
                        <p className="text-gray-700 mt-2 text-sm font-medium">{repair.reason}</p>
                        {repair.expectedFix && (
                            <p className="text-xs text-gray-500 mt-1">Expected: {repair.expectedFix}</p>
                        )}
                        <div className="mt-2 text-xs text-gray-400">Rep. by {repair.reportedBy}</div>
                    </div>
                ))
             )}
           </div>
        </div>

        {/* Closed Repairs History */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h3 className="font-bold text-green-600 flex items-center gap-2 mb-4">
             <CheckCircle size={18} /> Repair History Logs
           </h3>
           <div className="space-y-2 overflow-y-auto max-h-96">
             {closedRepairs.map(repair => (
                 <div key={repair.id} className="p-3 border-b last:border-0 flex justify-between items-center hover:bg-gray-50 transition">
                     <div className="flex-1">
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-800 text-sm">Cabin {repair.cabinId}</span>
                            <span className="text-xs text-gray-400">{format(repair.startTime, 'MMM d, HH:mm')}</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{repair.reason}</div>
                     </div>
                     <div className="text-right pl-4">
                         <div className="text-xs text-green-600 font-bold">FIXED</div>
                         <div className="text-xs text-gray-400">
                             {repair.closedAt ? format(repair.closedAt, 'MMM d') : '-'}
                         </div>
                     </div>
                 </div>
             ))}
             {closedRepairs.length === 0 && <p className="text-gray-400 text-sm">No history yet.</p>}
           </div>
        </div>

      </div>
    </div>
  );
};