import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, AlertTriangle } from 'lucide-react';

export default function NotificationBell({ notifications, onClear }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-slate-100 transition-all focus:outline-none"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-black text-white animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#1E293B] border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-800 bg-[#0F172A]/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">Alerts</h3>
            {notifications.length > 0 && (
              <button
                onClick={() => {
                  notifications.forEach(n => onClear(n.id));
                  setIsOpen(false);
                }}
                className="text-[10px] uppercase font-black text-indigo-400 hover:text-indigo-300"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-800">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-slate-500 text-xs">
                No active alerts. You're doing great!
              </div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className="p-4 hover:bg-slate-800/30 flex items-start justify-between space-x-3 transition-colors">
                  <div className="flex items-start space-x-2.5 min-w-0">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 flex-shrink-0">
                      <AlertTriangle className="w-3 h-3" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-medium text-slate-200 leading-relaxed break-words">
                        {notif.message}
                      </p>
                      <span className="text-[9px] text-slate-500">
                        {notif.time}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onClear(notif.id)}
                    className="text-slate-550 hover:text-slate-300 p-0.5 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
