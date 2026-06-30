import React from 'react';
import { Calendar, ShieldAlert, Clock, RefreshCw } from 'lucide-react';

export default function WarPlan({ warPlan, onRegenerate, isLoading }) {
  
  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return {
          card: 'border-l-4 border-l-red-500 bg-red-500/5 hover:bg-red-500/10 border-slate-800',
          badge: 'bg-red-500/10 text-red-400 border-red-500/20',
          dot: 'bg-red-500'
        };
      case 'HIGH':
        return {
          card: 'border-l-4 border-l-amber-500 bg-amber-500/5 hover:bg-amber-500/10 border-slate-800',
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          dot: 'bg-amber-500'
        };
      case 'BLOCKED':
        return {
          card: 'border-l-4 border-l-slate-500 bg-slate-800/20 hover:bg-slate-800/40 border-slate-800/80 opacity-60',
          badge: 'bg-slate-800 text-slate-400 border-slate-700',
          dot: 'bg-slate-500'
        };
      case 'SCHEDULED':
      default:
        return {
          card: 'border-l-4 border-l-indigo-500 bg-indigo-500/5 hover:bg-indigo-500/10 border-slate-800',
          badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          dot: 'bg-indigo-500'
        };
    }
  };

  const formatDuration = (mins) => {
    if (mins < 60) return `${mins} mins`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
  };

  return (
    <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold text-slate-100">Daily War Plan</h2>
        </div>
        <button
          onClick={onRegenerate}
          disabled={isLoading}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-slate-100 transition-all focus:outline-none disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Recalculating...' : 'Regenerate'}</span>
        </button>
      </div>

      {warPlan.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">
          No war plan generated yet. Add some tasks and click Regenerate above to map your day.
        </div>
      ) : (
        <div className="relative border-l border-slate-800 pl-4 ml-2 space-y-4">
          {warPlan.map((item, idx) => {
            const styles = getPriorityStyle(item.priority);
            return (
              <div key={idx} className="relative">
                {/* Timeline Connector Dot */}
                <span className={`absolute -left-[21px] top-4 w-2.5 h-2.5 rounded-full border-2 border-[#1E293B] ${styles.dot}`}></span>
                
                {/* Schedule Card */}
                <div className={`p-4 rounded-xl border transition-all duration-200 ${styles.card} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-indigo-400 bg-slate-900/50 px-2 py-0.5 rounded border border-slate-850">
                        {item.time}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border uppercase ${styles.badge}`}>
                        {item.priority}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-100">
                      {item.task_title}
                    </h3>
                    {item.note && (
                      <p className="text-xs text-slate-400 italic font-medium">
                        "{item.note}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center text-xs font-medium text-slate-500 self-start sm:self-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-slate-600" />
                    {formatDuration(item.duration_minutes)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
