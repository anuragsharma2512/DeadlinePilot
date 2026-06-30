import React from 'react';

/**
 * Skeleton card matching the TaskCard design.
 */
export function TaskSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div 
          key={idx} 
          className="bg-[#1E293B] border border-slate-700/50 rounded-xl p-4 animate-pulse flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0"
        >
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-slate-700 rounded-md w-2/3"></div>
            <div className="flex items-center space-x-4">
              <div className="h-4 bg-slate-700 rounded-md w-24"></div>
              <div className="h-4 bg-slate-700 rounded-md w-16"></div>
              <div className="h-4 bg-slate-700 rounded-md w-20"></div>
            </div>
          </div>
          <div className="flex items-center space-x-3 self-end md:self-center">
            <div className="w-9 h-9 bg-slate-700 rounded-lg"></div>
            <div className="w-9 h-9 bg-slate-700 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton matching the WarPlan schedule blocks.
 */
export function WarPlanSkeleton({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div 
          key={idx} 
          className="bg-[#1E293B]/60 border border-slate-800 rounded-xl p-4 animate-pulse flex items-center space-x-4"
        >
          <div className="w-16 h-6 bg-slate-700 rounded-md"></div>
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-slate-700 rounded-md w-1/2"></div>
            <div className="h-3 bg-slate-700 rounded-md w-1/4"></div>
          </div>
          <div className="w-24 h-6 bg-slate-700 rounded-full"></div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton matching the CoachChat message bubble.
 */
export function CoachSkeleton() {
  return (
    <div className="flex items-start space-x-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0"></div>
      <div className="flex-1 space-y-2">
        <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl rounded-tl-none p-4 space-y-2 max-w-[85%]">
          <div className="h-4 bg-slate-700 rounded-md w-full"></div>
          <div className="h-4 bg-slate-700 rounded-md w-11/12"></div>
          <div className="h-4 bg-slate-700 rounded-md w-4/5"></div>
        </div>
        <div className="h-3 bg-slate-800 rounded-md w-20 ml-2"></div>
      </div>
    </div>
  );
}
