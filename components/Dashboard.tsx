

import React, { useState } from 'react';
import { useAppStore } from '../store';
import { CabinCard } from './CabinCard';
import { CheckInModal, CheckoutModal, MaintenanceModal, ManualEntryModal } from './ActionModals';
import { Session, Cabin } from '../types';
import { PlusCircle, Wifi, WifiOff, Database } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { cabins, isOffline } = useAppStore();
  const [checkInCabinId, setCheckInCabinId] = useState<string | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<Session | null>(null);
  const [maintenanceCabin, setMaintenanceCabin] = useState<Cabin | null>(null);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);

  // Stats for the top bar
  const occupiedCount = cabins.filter(c => c.status === 'OCCUPIED').length;
  const holdCount = cabins.filter(c => c.status === 'ON_HOLD').length;
  const oosCount = cabins.filter(c => c.status === 'OUT_OF_SERVICE').length;
  const availableCount = cabins.length - occupiedCount - holdCount - oosCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cabin Overview</h1>
          <div className="flex items-center gap-2 mt-1">
             <p className="text-slate-500 text-sm">Real-time status monitor</p>
             <span className="text-slate-300">|</span>
             {isOffline ? (
                <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                    <WifiOff size={12}/> Offline Mode
                </span>
             ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                    <Database size={12}/> DB Connected
                </span>
             )}
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-center">
             <div className="flex flex-wrap gap-4 text-sm font-medium">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-white border-2 border-gray-300"></span>
                    <span className="text-slate-700">Available ({availableCount})</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="text-slate-700">Active ({occupiedCount})</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                    <span className="text-slate-700">On Hold ({holdCount})</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-slate-700">Broken ({oosCount})</span>
                </div>
            </div>
            
            <button 
                onClick={() => setIsManualEntryOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition"
            >
                <PlusCircle size={16} /> Offline Record
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {cabins.map(cabin => (
          <CabinCard 
            key={cabin.id} 
            cabin={cabin} 
            onCheckIn={(id) => setCheckInCabinId(id)}
            onCheckOut={(session) => setCheckoutSession(session)}
            onMaintenance={(c) => setMaintenanceCabin(c)}
          />
        ))}
      </div>

      <CheckInModal 
        isOpen={!!checkInCabinId} 
        cabinId={checkInCabinId || ''} 
        onClose={() => setCheckInCabinId(null)} 
      />

      {checkoutSession && (
        <CheckoutModal 
          isOpen={!!checkoutSession} 
          session={checkoutSession} 
          onClose={() => setCheckoutSession(null)} 
        />
      )}

      {maintenanceCabin && (
          <MaintenanceModal
            isOpen={!!maintenanceCabin}
            cabin={maintenanceCabin}
            onClose={() => setMaintenanceCabin(null)}
          />
      )}

      <ManualEntryModal 
        isOpen={isManualEntryOpen}
        onClose={() => setIsManualEntryOpen(false)}
      />
    </div>
  );
};