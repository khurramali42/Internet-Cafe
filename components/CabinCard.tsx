
import React, { useMemo } from 'react';
import { Cabin, CabinStatus, Session } from '../types';
import { useAppStore } from '../store';
import { Play, Pause, Square, Clock, Ban, Wrench, AlertTriangle, History } from 'lucide-react';
import { format } from 'date-fns';

interface CabinCardProps {
  cabin: Cabin;
  onCheckIn: (id: string) => void;
  onCheckOut: (session: Session) => void;
  onMaintenance: (cabin: Cabin) => void;
}

export const CabinCard: React.FC<CabinCardProps> = ({ cabin, onCheckIn, onCheckOut, onMaintenance }) => {
  const { sessions, now, toggleHold, customers } = useAppStore();

  const session = useMemo(() => 
    sessions.find(s => s.id === cabin.currentSessionId), 
    [sessions, cabin.currentSessionId]
  );

  // Get recent history for this cabin (Closed sessions, last 7 days)
  const recentSessions = useMemo(() => {
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    return sessions
      .filter(s => s.cabinId === cabin.id && s.status === 'CLOSED' && s.outTime && s.outTime > oneWeekAgo)
      .sort((a, b) => (b.outTime || 0) - (a.outTime || 0))
      .slice(0, 1); // Only need last one for display text
  }, [sessions, cabin.id, now]);

  const lastSession = recentSessions[0];
  const lastCustomerName = lastSession ? customers.find(c => c.id === lastSession.customerId)?.name : 'Unknown';

  const stats = useMemo(() => {
    if (!session) return { totalMin: 0, holdMin: 0, effectiveSeconds: 0 };
    
    let totalHoldMs = 0;
    session.holds.forEach(h => {
        totalHoldMs += (h.end || now) - h.start;
    });

    const totalDurationMs = now - session.inTime;
    const effectiveMs = totalDurationMs - totalHoldMs;
    
    return {
      totalMin: Math.floor(totalDurationMs / 60000),
      holdMin: Math.floor(totalHoldMs / 60000),
      effectiveSeconds: Math.floor(effectiveMs / 1000)
    };
  }, [session, now]);

  const getStatusColor = () => {
    switch (cabin.status) {
      case CabinStatus.AVAILABLE: return 'bg-white border-gray-200';
      case CabinStatus.OCCUPIED: return 'bg-green-50 border-green-200 ring-1 ring-green-300';
      case CabinStatus.ON_HOLD: return 'bg-amber-50 border-amber-200 ring-1 ring-amber-300';
      case CabinStatus.OUT_OF_SERVICE: return 'bg-red-500 border-red-600 ring-1 ring-red-700 text-white';
      default: return 'bg-gray-100';
    }
  };

  // Format seconds into HH:MM:SS
  const formatDuration = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isOutOfService = cabin.status === CabinStatus.OUT_OF_SERVICE;

  return (
    <div className={`rounded-xl shadow-sm border p-4 flex flex-col justify-between transition-all duration-300 ${getStatusColor()} h-56 relative group`}>
      
      {/* Maintenance Trigger */}
      <button 
        onClick={() => onMaintenance(cabin)}
        className={`absolute top-2 right-2 p-1.5 rounded-full transition-opacity ${
          isOutOfService ? 'bg-red-700 text-white opacity-100' : 'bg-gray-100 text-gray-500 opacity-0 group-hover:opacity-100 hover:bg-gray-200'
        }`}
        title="Maintenance / Settings"
      >
        <Wrench size={14} />
      </button>

      <div className="flex justify-between items-start pr-8">
        <div>
          <h3 className={`text-lg font-bold ${isOutOfService ? 'text-white' : 'text-gray-800'}`}>{cabin.name}</h3>
          
          {isOutOfService ? (
            <div className="flex items-center gap-1 mt-1 text-red-100 font-bold text-xs">
              <Ban size={12} /> NOT USABLE
            </div>
          ) : (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              cabin.status === 'AVAILABLE' ? 'bg-gray-100 text-gray-500' :
              cabin.status === 'OCCUPIED' ? 'bg-green-200 text-green-800' :
              'bg-amber-200 text-amber-800'
            }`}>
              {cabin.status}
            </span>
          )}
        </div>
        
        {session ? (
          <div className="text-right">
             <div className="text-2xl font-mono font-bold text-gray-900 tracking-tighter">
                {formatDuration(stats.effectiveSeconds)}
             </div>
             <div className="text-xs text-gray-500 flex items-center justify-end gap-1">
                <Clock size={10} /> In: {format(session.inTime, 'HH:mm')}
             </div>
          </div>
        ) : !isOutOfService && lastSession ? (
            <div className="text-right text-xs text-gray-400 mt-1">
                <div className="flex items-center justify-end gap-1">Last: <span className="font-medium text-gray-600">{lastCustomerName}</span></div>
                <div>{lastSession.outTime && format(lastSession.outTime, 'hh:mm a')}</div>
            </div>
        ) : null}
      </div>

      {isOutOfService && (
        <div className="mt-2 text-sm text-red-50">
          <p className="font-semibold underline">Reason:</p>
          <p className="italic opacity-90">{cabin.statusReason || 'Unknown issue'}</p>
          {cabin.expectedFix && <p className="text-xs mt-1">Fix: {cabin.expectedFix}</p>}
        </div>
      )}

      {session && stats.holdMin > 0 && !isOutOfService && (
         <div className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded mt-1">
            Total Hold: {stats.holdMin}m
         </div>
      )}

      <div className="mt-auto pt-4">
        {cabin.status === CabinStatus.AVAILABLE ? (
          <button 
            onClick={() => onCheckIn(cabin.id)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition"
          >
            <Play size={16} fill="currentColor" /> Check In
          </button>
        ) : session ? (
          <div className="flex gap-2">
            <button 
              onClick={() => toggleHold(session.id)}
              className={`flex-1 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-1 transition ${
                cabin.status === CabinStatus.ON_HOLD 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
            >
              {cabin.status === CabinStatus.ON_HOLD ? <><Play size={14}/> Resume</> : <><Pause size={14}/> Hold</>}
            </button>
            <button 
              onClick={() => onCheckOut(session)}
              className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-1 transition"
            >
              <Square size={14} fill="currentColor"/> Checkout
            </button>
          </div>
        ) : isOutOfService ? (
           <div className="w-full bg-red-700/50 text-white/80 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed">
              <AlertTriangle size={16} /> Maintenance
           </div>
        ) : null}
      </div>
    </div>
  );
};
