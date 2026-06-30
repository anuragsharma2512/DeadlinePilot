import React, { useEffect, useRef } from 'react';
import { MessageSquare, AlertTriangle, ShieldAlert, Sparkles, Send } from 'lucide-react';
import { CoachSkeleton } from './Skeleton';

export default function CoachChat({ messages, onTriggerCoach, isLoading }) {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">AI Coach: Intervention</h2>
            <p className="text-xs text-red-400 font-semibold">Direct &amp; Uncensored</p>
          </div>
        </div>
        <button
          onClick={onTriggerCoach}
          disabled={isLoading}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/40 text-red-400 hover:text-red-300 transition-all focus:outline-none disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Force Intervention</span>
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <MessageSquare className="w-12 h-12 text-slate-600" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-350">No interventions yet</h3>
              <p className="text-xs text-slate-500 max-w-xs">
                Your coach is watching. Stay on track or fall behind, and you will hear from them.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className="flex items-start space-x-3">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0 font-bold text-xs">
                💀
              </div>
              {/* Message Bubble */}
              <div className="flex-1">
                <div className="bg-[#0F172A] border border-slate-850 rounded-2xl rounded-tl-none p-4 max-w-[90%] shadow-md">
                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    {msg.text}
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 ml-2 mt-1 inline-block">
                  {msg.time}
                </span>
              </div>
            </div>
          ))
        )}

        {/* Loading Skeleton */}
        {isLoading && <CoachSkeleton />}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
