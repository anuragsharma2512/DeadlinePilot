import React from 'react';
import { formatDistanceToNow, isPast } from 'date-fns';
import { Check, Trash2, Clock, Calendar, AlertCircle, Cpu } from 'lucide-react';

export default function TaskCard({ task, onComplete, onDelete, onExecute }) {
  const { id, title, deadline, estimated_minutes, priority_score, urgency, impact, category, status } = task;

  // Determine priority level and styling
  let priorityLabel = 'Low';
  let priorityColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  let priorityEmoji = '🟢';

  if (priority_score >= 75) {
    priorityLabel = 'Critical';
    priorityColor = 'bg-red-500/10 text-red-400 border-red-500/20';
    priorityEmoji = '🔴';
  } else if (priority_score >= 40) {
    priorityLabel = 'High';
    priorityColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    priorityEmoji = '🟡';
  }

  // Format deadline relative time
  let deadlineText = 'No deadline';
  let isOverdue = false;
  if (deadline) {
    const deadlineDate = new Date(deadline);
    isOverdue = isPast(deadlineDate);
    
    try {
      const distance = formatDistanceToNow(deadlineDate, { addSuffix: true });
      deadlineText = isOverdue ? `Overdue ${distance}` : `Due ${distance}`;
    } catch (e) {
      deadlineText = 'Invalid deadline';
    }
  }

  // Format estimated time
  const formatDuration = (mins) => {
    if (!mins) return '30m';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
  };

  return (
    <div className="bg-[#1E293B] border border-slate-800 hover:border-slate-700 transition-all duration-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 shadow-lg">
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority Badge */}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${priorityColor}`}>
            <span className="mr-1">{priorityEmoji}</span>
            {priorityLabel} ({Math.round(priority_score)})
          </span>

          {/* Category Badge */}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600/30 capitalize">
            {category}
          </span>
        </div>

        {/* Task Title */}
        <h3 className="text-lg font-semibold text-slate-100 line-clamp-2">
          {title}
        </h3>

        {/* Task Metadata */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
          <span className="flex items-center">
            <Clock className="w-4 h-4 mr-1.5 text-slate-500" />
            {formatDuration(estimated_minutes)}
          </span>

          {deadline && (
            <span className={`flex items-center font-medium ${isOverdue ? 'text-red-400' : 'text-slate-400'}`}>
              {isOverdue ? (
                <AlertCircle className="w-4 h-4 mr-1.5 text-red-500 animate-pulse" />
              ) : (
                <Calendar className="w-4 h-4 mr-1.5 text-slate-500" />
              )}
              {deadlineText}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2.5 self-end md:self-center">
        {/* Delegate to Agent Button */}
        {status !== 'complete' && (
          <button
            onClick={() => onExecute(id)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 hover:border-indigo-500/40 text-indigo-400 hover:text-indigo-300 rounded-lg text-xs font-bold transition-all duration-150 group"
            title="Delegate execution to Autonomous Agent"
          >
            <Cpu className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span>Delegate ⚡</span>
          </button>
        )}

        <button
          onClick={() => onComplete(id)}
          className="p-2 bg-slate-800 hover:bg-done/20 border border-slate-700 hover:border-done/40 text-slate-455 hover:text-done rounded-lg transition-all duration-150 group"
          title="Mark as Complete"
        >
          <Check className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>
        <button
          onClick={() => onDelete(id)}
          className="p-2 bg-slate-800 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/40 text-slate-455 hover:text-red-400 rounded-lg transition-all duration-150 group"
          title="Delete Task"
        >
          <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </div>
  );
}
