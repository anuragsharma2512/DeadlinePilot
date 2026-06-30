import React from 'react';
import { Flame, CheckCircle, Percent, Zap, AlertTriangle, CheckSquare, Clock } from 'lucide-react';

export default function InsightsPanel({ insights }) {
  if (!insights) return null;

  const {
    streak_days = 0,
    completion_rate_7d = 0,
    avg_error_pct = 0,
    peak_focus_start = '09:00',
    peak_focus_end = '11:00',
    completed_count = 0,
    pending_count = 0,
    overdue_count = 0
  } = insights;

  // Estimation warning helper
  const getEstimationWarning = (errPct) => {
    if (errPct === 0) return 'Perfect estimation accuracy. Keep it up!';
    if (errPct < 15) return 'Excellent accuracy. Your planning is highly realistic.';
    if (errPct < 30) return 'Moderate accuracy. Try adding 10-15% extra buffer.';
    return `Critical: You underestimate tasks by ${errPct}%. Multiply your estimates by 1.5x.`;
  };

  return (
    <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center space-x-2 pb-4 border-b border-slate-800">
        <Zap className="w-5 h-5 text-amber-400" />
        <h2 className="text-xl font-bold text-slate-100">Productivity Insights</h2>
      </div>

      {/* Grid of Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Streak */}
        <div className="bg-[#0F172A] border border-slate-850 rounded-xl p-4 flex flex-col items-center text-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
            <Flame className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-2xl font-black text-slate-100">{streak_days} Days</p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Focus Streak</p>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-[#0F172A] border border-slate-850 rounded-xl p-4 flex flex-col items-center text-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-2xl font-black text-slate-100">{completion_rate_7d}%</p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">7-Day Success</p>
          </div>
        </div>

        {/* Estimation Error */}
        <div className="bg-[#0F172A] border border-slate-850 rounded-xl p-4 flex flex-col items-center text-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
            <Percent className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-2xl font-black text-slate-100">{avg_error_pct}%</p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Time Underestimate</p>
          </div>
        </div>

        {/* Peak Focus */}
        <div className="bg-[#0F172A] border border-slate-850 rounded-xl p-4 flex flex-col items-center text-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Clock className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-lg font-extrabold text-slate-100">{peak_focus_start} - {peak_focus_end}</p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Peak Focus Hours</p>
          </div>
        </div>
      </div>

      {/* Numerical Counters and Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Task Summary</h3>
          <div className="flex justify-between items-center bg-[#0F172A]/40 px-3 py-2 rounded-lg text-sm">
            <span className="text-slate-400">Pending Tasks</span>
            <span className="font-bold text-indigo-400">{pending_count}</span>
          </div>
          <div className="flex justify-between items-center bg-[#0F172A]/40 px-3 py-2 rounded-lg text-sm">
            <span className="text-slate-400">Completed Tasks</span>
            <span className="font-bold text-emerald-400">{completed_count}</span>
          </div>
          <div className="flex justify-between items-center bg-[#0F172A]/40 px-3 py-2 rounded-lg text-sm">
            <span className="text-slate-400">Overdue Tasks</span>
            <span className={`font-bold ${overdue_count > 0 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
              {overdue_count}
            </span>
          </div>
        </div>

        {/* Coach Recommendation Card */}
        <div className="bg-[#0F172A] border border-slate-850 rounded-xl p-4 flex items-start space-x-3">
          <div className={`p-2 rounded-lg ${avg_error_pct >= 30 ? 'bg-red-500/10 text-red-400' : 'bg-indigo-500/10 text-indigo-400'} flex-shrink-0`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-200">Coach Recommendation</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {getEstimationWarning(avg_error_pct)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
