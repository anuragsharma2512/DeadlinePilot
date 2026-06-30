import React, { useState } from 'react';
import TaskCard from './TaskCard';
import { ClipboardList, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

export default function TaskList({ tasks, onComplete, onDelete, onExecute }) {
  const [showCompleted, setShowCompleted] = useState(false);

  const pendingTasks = tasks.filter(t => t.status !== 'complete');
  const completedTasks = tasks.filter(t => t.status === 'complete');

  if (pendingTasks.length === 0 && completedTasks.length === 0) {
    return (
      <div className="bg-[#1E293B] border border-slate-850 rounded-2xl p-8 text-center space-y-4 shadow-xl">
        <div className="mx-auto w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-505">
          <ClipboardList className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-205">No tasks yet</h3>
          <p className="text-sm text-slate-405 max-w-sm mx-auto">
            Drop a brain dump in the input box above, or dictate your tasks to let Claude organize your schedule.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Tasks Section */}
      <div className="space-y-3">
        {pendingTasks.length > 0 ? (
          pendingTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={onComplete}
              onDelete={onDelete}
              onExecute={onExecute}
            />
          ))
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center text-emerald-400 font-medium">
            🎉 All caught up! All pending tasks completed. Keep it up!
          </div>
        )}
      </div>

      {/* Completed Tasks Toggle */}
      {completedTasks.length > 0 && (
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center space-x-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
          >
            <span>Completed Tasks ({completedTasks.length})</span>
            {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showCompleted && (
            <div className="mt-3 space-y-3 opacity-80">
              {completedTasks.map(task => (
                <div 
                  key={task.id} 
                  className="bg-[#1E293B]/50 border border-slate-800/60 rounded-xl p-4 flex items-center justify-between opacity-75 hover:opacity-100 transition-opacity"
                >
                  <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mr-2">
                      Done
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 capitalize mr-2">
                      {task.category}
                    </span>
                    <h4 className="text-slate-300 font-medium line-through mt-1 truncate">
                      {task.title}
                    </h4>
                  </div>
                  <button
                    onClick={() => onDelete(task.id)}
                    className="p-1.5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                    title="Delete Permanent"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
