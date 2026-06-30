import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { clearAuth, getUser, getToken } from '../utils/auth';
import TaskInput from '../components/TaskInput';
import TaskList from '../components/TaskList';
import WarPlan from '../components/WarPlan';
import CoachChat from '../components/CoachChat';
import InsightsPanel from '../components/InsightsPanel';
import NotificationBell from '../components/NotificationBell';
import { TaskSkeleton, WarPlanSkeleton } from '../components/Skeleton';
import { 
  Zap, LogOut, Calendar, ShieldAlert, WifiOff, X, 
  Trash2, Plus, Edit3, CalendarRange, Clock, AlertOctagon,
  Cpu, Terminal, Copy, Check, Flame, Award
} from 'lucide-react';

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [warPlan, setWarPlan] = useState([]);
  const [coachingMessages, setCoachingMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [insights, setInsights] = useState(null);
  
  // Habits state
  const [habits, setHabits] = useState([]);
  const [newHabitTitle, setNewHabitTitle] = useState('');

  // Loading States
  const [isTasksLoading, setIsTasksLoading] = useState(true);
  const [isWarPlanLoading, setIsWarPlanLoading] = useState(true);
  const [isCoachingLoading, setIsCoachingLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  // Offline and User State
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [user, setUserState] = useState(null);

  // AI Confirmation Modal State
  const [parsedTasks, setParsedTasks] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Agentic Execution Modal State
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLogs, setExecutionLogs] = useState([]);
  const [executionArtifact, setExecutionArtifact] = useState('');
  const [copied, setCopied] = useState(false);

  const navigate = useNavigate();
  const eventSourceRef = useRef(null);
  const terminalEndRef = useRef(null);

  // Load user and initial data
  useEffect(() => {
    const loggedUser = getUser();
    if (!loggedUser) {
      navigate('/login');
      return;
    }
    setUserState(loggedUser);

    // Check for Google Calendar connection flags in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('calendar_connected') === 'true') {
      alert('Google Calendar connected successfully! Your War Plan is now synchronized.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('calendar_error') === 'access_denied') {
      alert('Google Calendar connection was cancelled or denied.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Initial Fetching
    fetchInitialData();

    // Setup SSE connection for real-time coaching & alerts
    setupSSEConnection();

    // Offline event listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [navigate]);

  const handleConnectCalendar = async () => {
    try {
      const response = await api.get('/calendar/auth');
      if (response.data.status === 'not_configured') {
        alert(`${response.data.message}\n\nTo connect your real calendar, add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the server's .env file.`);
      } else if (response.data.status === 'ok' && response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (e) {
      console.error('Failed to initiate Google Calendar connection:', e);
      alert('Failed to connect to Google Calendar. Please try again.');
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar?')) return;
    try {
      await api.post('/calendar/disconnect');
      fetchInitialData();
    } catch (e) {
      console.error('Failed to disconnect Google Calendar:', e);
    }
  };

  // Auto-scroll terminal logs
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [executionLogs]);

  const fetchInitialData = async () => {
    setIsTasksLoading(true);
    setIsWarPlanLoading(true);
    try {
      await Promise.all([
        fetchTasks(),
        fetchInsights(),
        fetchWarPlan(),
        fetchHabits()
      ]);
    } catch (e) {
      console.error('Error loading initial dashboard data:', e);
    } finally {
      setIsTasksLoading(false);
      setIsWarPlanLoading(false);
    }
  };

  // Wait, I had a syntax error there 'finaly', let's write it correctly.
  // Oh, yes, 'finally' not 'finaly'. I will write it correctly in the code block.

  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks');
      setTasks(response.data);
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
    }
  };

  const fetchInsights = async () => {
    try {
      const response = await api.get('/insights');
      setInsights(response.data);
    } catch (e) {
      console.error('Failed to fetch insights:', e);
    }
  };

  const fetchWarPlan = async () => {
    setIsWarPlanLoading(true);
    try {
      const response = await api.get('/ai/warplan');
      setWarPlan(response.data);
    } catch (e) {
      console.error('Failed to fetch war plan:', e);
    } finally {
      setIsWarPlanLoading(false);
    }
  };

  // ============================================================================
  // HABITS AND GOALS METHODS
  // ============================================================================
  const fetchHabits = async () => {
    try {
      const response = await api.get('/tasks/habits');
      setHabits(response.data);
    } catch (e) {
      console.error('Failed to fetch habits:', e);
    }
  };

  const handleCreateHabit = async (e) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    try {
      const response = await api.post('/tasks/habits', { title: newHabitTitle.trim() });
      setHabits(prev => [response.data, ...prev]);
      setNewHabitTitle('');
      fetchInsights(); // Refresh streak details
    } catch (e) {
      console.error('Failed to create habit:', e);
    }
  };

  const handleCompleteHabit = async (id) => {
    try {
      await api.post(`/tasks/habits/${id}/complete`);
      
      // Update local state immediately
      const todayStr = new Date().toISOString().split('T')[0];
      setHabits(prev => prev.map(h => {
        if (h.id === id) {
          return {
            ...h,
            streak: (h.streak || 0) + 1,
            last_completed_date: todayStr
          };
        }
        return h;
      }));

      // Play success chime
      playNotificationSound();
      
      // Refresh insights (streaks)
      fetchInsights();
    } catch (e) {
      console.error('Failed to complete habit:', e);
    }
  };

  const handleDeleteHabit = async (id) => {
    if (!confirm('Delete this habit?')) return;
    try {
      await api.delete(`/tasks/habits/${id}`);
      setHabits(prev => prev.filter(h => h.id !== id));
      fetchInsights();
    } catch (e) {
      console.error('Failed to delete habit:', e);
    }
  };

  // ============================================================================
  // AUTONOMOUS AGENT EXECUTION METHOD
  // ============================================================================
  const handleExecuteTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    setShowExecutionModal(true);
    setIsExecuting(true);
    setExecutionArtifact('');
    setCopied(false);

    // Simulated terminal boot logs
    setExecutionLogs([
      `[system] Booting autonomous agent executor...`,
      `[system] Establishing secure tunnel to Google Gemini API...`,
      `[agent] Agent initialized. Target task: "${task.title}" [Category: ${task.category}]`,
      `[agent] Analyzing requirements and planning execution steps...`
    ]);

    try {
      // API call to backend to trigger Gemini execution
      const response = await api.post(`/tasks/${id}/execute`);
      const { steps, artifact } = response.data;

      // Print steps with typewriter-like intervals for rich user experience
      let currentLogIndex = 0;
      const interval = setInterval(() => {
        if (currentLogIndex < steps.length) {
          setExecutionLogs(prev => [...prev, `[agent] SUCCESS: ${steps[currentLogIndex]}`]);
          currentLogIndex++;
        } else {
          clearInterval(interval);
          setExecutionLogs(prev => [
            ...prev,
            `[agent] Task execution complete. Writing draft artifact...`,
            `[system] Task marked complete in SQLite database.`,
            `[system] Stream closed. Standby for output.`
          ]);
          setExecutionArtifact(artifact);
          setIsExecuting(false);
          
          // Refresh list, insights & schedule
          fetchTasks();
          fetchInsights();
          fetchWarPlan();
          requestCoachUpdate();
        }
      }, 900);

    } catch (e) {
      console.error('Task execution failed:', e);
      setExecutionLogs(prev => [
        ...prev,
        `[error] Critical: Gemini agent failed to execute task.`,
        `[error] Reason: ${e.response?.data?.error || 'Connection timed out.'}`,
        `[system] Resetting executor. Task remains pending.`
      ]);
      setIsExecuting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(executionArtifact);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Setup Server-Sent Events Connection
  const setupSSEConnection = () => {
    const token = getToken();
    if (!token) return;

    const sseUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/ai/coach/stream?token=${token}`;
    
    try {
      const source = new EventSource(sseUrl);
      eventSourceRef.current = source;

      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'coach') {
            setCoachingMessages(prev => [
              ...prev, 
              { text: data.message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
            ]);
            playNotificationSound();
          } 
          
          else if (data.type === 'notification') {
            const newNotif = {
              id: Date.now(),
              message: data.message,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              read: false
            };
            setNotifications(prev => [newNotif, ...prev]);
            playNotificationSound();
          }
          
          else if (data.type === 'info') {
            console.log('SSE Stream Connection message:', data.message);
          }
        } catch (err) {
          console.error('Failed to parse SSE data:', err);
        }
      };

      source.onerror = (err) => {
        console.warn('SSE connection error, reconnecting...', err);
      };
    } catch (err) {
      console.error('Failed to initialize SSE EventSource:', err);
    }
  };

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); 
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // Audio context blocked
    }
  };

  // Brain Dump Parsing Flow
  const handleParseText = async (rawText) => {
    setIsParsing(true);
    try {
      const response = await api.post('/tasks/parse', { rawText });
      
      if (response.data.tasks && response.data.tasks.length > 0) {
        const mapped = response.data.tasks.map((t, idx) => ({
          ...t,
          tempId: idx,
          deadline: t.deadline ? t.deadline.slice(0, 16) : ''
        }));
        setParsedTasks(mapped);
        setShowConfirmModal(true);
      } else {
        alert(response.data.message || 'No tasks could be extracted. Try adding more details!');
      }
    } catch (e) {
      console.error('Task parsing failed:', e);
      alert('AI parsing timed out or failed. Please check your network and try again.');
    } finally {
      setIsParsing(false);
    }
  };

  // Helper to parse dates safely across different formats (like DD-MM-YYYY or ISO)
  const parseDateToISO = (dateStr) => {
    if (!dateStr || !dateStr.trim()) return null;
    
    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    
    // Try parsing DD-MM-YYYY HH:MM or DD/MM/YYYY HH:MM
    const match = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
    if (match) {
      const [_, day, month, year, hour = '00', minute = '00'] = match;
      const rearranged = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
      date = new Date(rearranged);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    
    return null;
  };

  // Confirm and batch insert parsed tasks
  const handleConfirmTasks = async () => {
    try {
      // Re-format deadlines back to ISO strings safely
      const tasksToSubmit = parsedTasks.map(t => ({
        title: t.title,
        deadline: parseDateToISO(t.deadline),
        estimated_minutes: Number(t.estimated_minutes) || 30,
        urgency: Number(t.urgency) || 5,
        impact: Number(t.impact) || 5,
        category: t.category || 'general'
      }));

      await api.post('/tasks/batch', { tasks: tasksToSubmit });
      setShowConfirmModal(false);
      fetchInitialData();
    } catch (e) {
      console.error('Failed to batch save tasks:', e);
      alert('Failed to save tasks. Please try again.');
    }
  };

  // Optimistic UI for Task Completion
  const handleCompleteTask = async (id) => {
    const previousTasks = [...tasks];
    const previousInsights = { ...insights };

    const completedTask = tasks.find(t => t.id === id);
    if (!completedTask) return;
    if (completedTask.status === 'complete') return;

    const wasOverdue = completedTask.deadline && new Date(completedTask.deadline) < new Date();
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'complete', completed_at: new Date().toISOString() } : t));

    if (insights) {
      setInsights(prev => ({
        ...prev,
        pending_count: Math.max(0, prev.pending_count - 1),
        completed_count: prev.completed_count + 1,
        overdue_count: wasOverdue ? Math.max(0, prev.overdue_count - 1) : prev.overdue_count
      }));
    }

    try {
      const actualMinutes = completedTask.estimated_minutes || 30;
      await api.patch(`/tasks/${id}/complete`, { actual_minutes: actualMinutes });
      await Promise.all([
        fetchTasks(),
        fetchInsights(),
        fetchWarPlan(),
        requestCoachUpdate()
      ]);
    } catch (error) {
      console.error('Failed to complete task. Rolling back UI.', error);
      setTasks(previousTasks);
      setInsights(previousInsights);
      alert('Connection error. Failed to complete task. Reverting list.');
    }
  };

  const handleDeleteTask = async (id) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      fetchInitialData();
    } catch (e) {
      console.error('Failed to delete task:', e);
    }
  };

  const requestCoachUpdate = async ({ showLoading = false } = {}) => {
    if (showLoading) setIsCoachingLoading(true);
    try {
      const response = await api.post('/ai/coach');
      setCoachingMessages(prev => [
        ...prev,
        { text: response.data.message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    } catch (e) {
      console.error('Failed to trigger coach:', e);
    } finally {
      if (showLoading) setIsCoachingLoading(false);
    }
  };

  const handleManualCoachingTrigger = () => {
    requestCoachUpdate({ showLoading: true });
  };

  const handleClearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  // Modal edit helpers
  const handleEditParsedTask = (tempId, field, value) => {
    setParsedTasks(prev => prev.map(t => t.tempId === tempId ? { ...t, [field]: value } : t));
  };

  const handleDeleteParsedTask = (tempId) => {
    setParsedTasks(prev => prev.filter(t => t.tempId !== tempId));
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0F172A] text-slate-200">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-[#1E293B] border-r border-slate-800 flex flex-col justify-between p-6 shrink-0">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-100">
              DeadlinePiolet ⚡
            </span>
          </div>

          {/* User Profile Info */}
          {user && (
            <div className="bg-[#0F172A]/40 border border-slate-850 p-4 rounded-xl space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Logged In As</p>
              <p className="text-xs font-semibold text-slate-300 truncate" title={user.email}>
                {user.email}
              </p>
            </div>
          )}

          {/* Navigation/Actions */}
          <div className="space-y-3">
            {insights?.is_calendar_connected ? (
              <div className="space-y-2">
                <div className="w-full flex items-center justify-between px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold">
                  <span className="flex items-center space-x-2.5">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>Calendar Sync On</span>
                  </span>
                  <span>✅</span>
                </div>
                <button
                  onClick={handleDisconnectCalendar}
                  className="w-full text-center text-[10px] uppercase font-bold tracking-wider text-slate-500 hover:text-red-400 transition-colors focus:outline-none"
                >
                  Disconnect Google Calendar
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectCalendar}
                className="w-full flex items-center space-x-3 px-4 py-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-slate-100 rounded-xl text-sm font-semibold transition-all hover:scale-[1.01]"
              >
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Connect Calendar</span>
              </button>
            )}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-slate-800 hover:border-red-500/20 hover:bg-red-500/5 text-slate-450 hover:text-red-400 rounded-xl text-sm font-bold transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* HEADER */}
        <header className="bg-[#1E293B]/50 border-b border-slate-855 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Dashboard</h1>
            <p className="text-xs text-slate-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>

          {/* Notifications */}
          <NotificationBell 
            notifications={notifications} 
            onClear={handleClearNotification} 
          />
        </header>

        {/* OFFLINE BANNER */}
        {isOffline && (
          <div className="bg-red-500/10 border-b border-red-500/20 text-red-400 px-6 py-3 flex items-center space-x-2.5 text-sm">
            <WifiOff className="w-4 h-4 animate-pulse" />
            <span className="font-semibold">You are currently offline. Tasks will be synced once connection is restored.</span>
          </div>
        )}

        {/* CONTENT GRID */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          
          {/* TOP SECTION: BRAIN DUMP INPUT */}
          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Quick Brain Dump</h2>
            <TaskInput onParse={handleParseText} isLoading={isParsing} />
          </section>

          {/* MIDDLE SECTION: TASKS, INSIGHTS & COACHING */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN: TASK LIST & INSIGHTS & HABITS */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* TASKS LIST */}
              <section className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Active Task List</h2>
                {isTasksLoading ? (
                  <TaskSkeleton count={3} />
                ) : (
                  <TaskList 
                    tasks={tasks} 
                    onComplete={handleCompleteTask} 
                    onDelete={handleDeleteTask} 
                    onExecute={handleExecuteTask}
                  />
                )}
              </section>

              {/* DAILY GOALS & HABIT TRACKING */}
              <section className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
                  <Award className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-slate-100">Daily Habits &amp; Goals</h3>
                </div>

                {/* Create Habit Form */}
                <form onSubmit={handleCreateHabit} className="flex gap-2">
                  <input
                    type="text"
                    value={newHabitTitle}
                    onChange={(e) => setNewHabitTitle(e.target.value)}
                    placeholder="E.g. Read 15 mins, Drink 3L water..."
                    className="flex-1 bg-[#0F172A] border border-slate-750 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-slate-150 font-semibold text-sm rounded-xl flex items-center space-x-1.5 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </form>

                {/* Habits List */}
                <div className="space-y-2.5">
                  {habits.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No habits tracked yet. Set one up above!</p>
                  ) : (
                    habits.map(habit => {
                      const isCompletedToday = habit.last_completed_date === todayStr;
                      return (
                        <div 
                          key={habit.id} 
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            isCompletedToday 
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-300' 
                              : 'bg-[#0F172A]/40 border-slate-800/80 hover:border-slate-750'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => !isCompletedToday && handleCompleteHabit(habit.id)}
                              disabled={isCompletedToday}
                              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                                isCompletedToday
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-slate-650 hover:border-indigo-500 hover:bg-indigo-500/5'
                              }`}
                            >
                              {isCompletedToday && <Check className="w-3.5 h-3.5" />}
                            </button>
                            <span className={`text-sm ${isCompletedToday ? 'line-through text-slate-500' : 'text-slate-200 font-medium'}`}>
                              {habit.title}
                            </span>
                          </div>

                          <div className="flex items-center space-x-3">
                            <span className="flex items-center text-xs font-semibold text-orange-400 bg-orange-500/5 border border-orange-500/10 px-2 py-0.5 rounded-full">
                              <Flame className="w-3.5 h-3.5 mr-1" />
                              {habit.streak || 0}d
                            </span>
                            <button
                              onClick={() => handleDeleteHabit(habit.id)}
                              className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              {/* PRODUCTIVITY INSIGHTS PANEL */}
              <section>
                <InsightsPanel insights={insights} />
              </section>
            </div>

            {/* RIGHT COLUMN: WAR PLAN & COACHING (Takes 1 col on lg screens) */}
            <div className="space-y-6">
              
              {/* WAR PLAN SCHEDULE */}
              <section>
                {isWarPlanLoading ? (
                  <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="h-6 bg-slate-700 rounded-md w-1/3 animate-pulse"></div>
                    <WarPlanSkeleton count={3} />
                  </div>
                ) : (
                  <WarPlan 
                    warPlan={warPlan} 
                    onRegenerate={fetchWarPlan} 
                    isLoading={isWarPlanLoading} 
                  />
                )}
              </section>

              {/* COACH CHAT MESSAGES */}
              <section>
                <CoachChat 
                  messages={coachingMessages} 
                  onTriggerCoach={handleManualCoachingTrigger} 
                  isLoading={isCoachingLoading} 
                />
              </section>
            </div>

          </div>
        </div>
      </main>

      {/* AI PARSED TASKS CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#1E293B] border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
            {/* Header */}
            <div className="px-6 py-4 bg-[#0F172A]/40 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-slate-150">Confirm AI Extracted Tasks</h3>
              </div>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tasks Editable List */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 divide-y divide-slate-800/60">
              {parsedTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm flex flex-col items-center space-y-2">
                  <AlertOctagon className="w-8 h-8 text-slate-600" />
                  <span>No tasks remaining. Add some tasks or close this window.</span>
                </div>
              ) : (
                parsedTasks.map((task, idx) => (
                  <div key={task.tempId} className="pt-4 first:pt-0 flex flex-col space-y-3">
                    
                    {/* First Row: Title & Delete */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 relative">
                        <Edit3 className="absolute left-3 top-3 w-4 h-4 text-slate-550" />
                        <input
                          type="text"
                          value={task.title}
                          onChange={(e) => handleEditParsedTask(task.tempId, 'title', e.target.value)}
                          className="w-full bg-[#0F172A] border border-slate-750 focus:border-indigo-500 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none"
                          placeholder="Task Title"
                        />
                      </div>
                      <button
                        onClick={() => handleDeleteParsedTask(task.tempId)}
                        className="p-2 bg-slate-800 hover:bg-red-500/10 border border-slate-750 hover:border-red-550/20 text-slate-405 hover:text-red-450 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Second Row: Metadata Controls */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Estimated Minutes */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center">
                          <Clock className="w-3 h-3 mr-1" /> Est Mins
                        </label>
                        <input
                          type="number"
                          value={task.estimated_minutes}
                          onChange={(e) => handleEditParsedTask(task.tempId, 'estimated_minutes', Number(e.target.value))}
                          className="w-full bg-[#0F172A] border border-slate-750 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Urgency */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Urgency (1-10)</label>
                        <select
                          value={task.urgency}
                          onChange={(e) => handleEditParsedTask(task.tempId, 'urgency', Number(e.target.value))}
                          className="w-full bg-[#0F172A] border border-slate-750 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          {Array.from({ length: 10 }).map((_, i) => (
                            <option key={i+1} value={i+1}>{i+1}</option>
                          ))}
                        </select>
                      </div>

                      {/* Impact */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Impact (1-10)</label>
                        <select
                          value={task.impact}
                          onChange={(e) => handleEditParsedTask(task.tempId, 'impact', Number(e.target.value))}
                          className="w-full bg-[#0F172A] border border-slate-750 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          {Array.from({ length: 10 }).map((_, i) => (
                            <option key={i+1} value={i+1}>{i+1}</option>
                          ))}
                        </select>
                      </div>

                      {/* Category */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</label>
                        <select
                          value={task.category}
                          onChange={(e) => handleEditParsedTask(task.tempId, 'category', e.target.value)}
                          className="w-full bg-[#0F172A] border border-slate-750 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 capitalize"
                        >
                          <option value="general">general</option>
                          <option value="work">work</option>
                          <option value="personal">personal</option>
                          <option value="finance">finance</option>
                          <option value="health">health</option>
                        </select>
                      </div>

                    </div>

                    {/* Third Row: Deadline */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center">
                        <CalendarRange className="w-3 h-3 mr-1" /> Deadline Date/Time
                      </label>
                      <input
                        type="datetime-local"
                        value={task.deadline || ''}
                        onChange={(e) => handleEditParsedTask(task.tempId, 'deadline', e.target.value)}
                        className="w-full bg-[#0F172A] border border-slate-750 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                  </div>
                ))
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-[#0F172A]/40 border-t border-slate-800 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-5 py-2.5 border border-slate-800 hover:border-slate-700 bg-slate-800/30 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 rounded-xl font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTasks}
                disabled={parsedTasks.length === 0}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 hover:scale-[1.01] transition-all disabled:opacity-50"
              >
                Confirm &amp; Save ({parsedTasks.length} Tasks)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* AGENTIC EXECUTION TERMINAL OVERLAY */}
      {showExecutionModal && (
        <div className="fixed inset-0 bg-[#0F172A]/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#101725] border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Terminal Header */}
            <div className="px-6 py-4 bg-[#080d17] border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Terminal className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold tracking-wider uppercase text-indigo-300 font-mono flex items-center space-x-2">
                  <span>Agent Executor Shell</span>
                  {isExecuting && <span className="w-1.5 h-3.5 bg-indigo-500 animate-ping inline-block"></span>}
                </h3>
              </div>
              <button 
                onClick={() => !isExecuting && setShowExecutionModal(false)}
                disabled={isExecuting}
                className="text-slate-500 hover:text-slate-300 disabled:opacity-30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Terminal Body */}
            <div className="flex-1 p-6 overflow-y-auto bg-[#040810] font-mono text-xs text-green-400 space-y-2.5 min-h-[240px] max-h-[350px]">
              {executionLogs.map((log, idx) => {
                let textClass = 'text-green-400';
                if (log.startsWith('[error]')) textClass = 'text-red-400';
                else if (log.startsWith('[system]')) textClass = 'text-indigo-400 font-semibold';
                return (
                  <div key={idx} className={`${textClass} leading-relaxed break-all`}>
                    {log}
                  </div>
                );
              })}
              {isExecuting && (
                <div className="text-indigo-400 animate-pulse">
                  [agent] Computing next action with Gemini...
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>

            {/* Artifact Panel */}
            {executionArtifact && (
              <div className="p-6 bg-[#0B101D] border-t border-slate-850 space-y-4 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center">
                    <Cpu className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Generated Work Artifact
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-slate-100 rounded-lg text-xs font-bold transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Draft'}</span>
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto bg-[#070b14] border border-slate-850 rounded-xl p-4 text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap max-h-[200px]">
                  {executionArtifact}
                </div>
              </div>
            )}

            {/* Terminal Footer */}
            <div className="px-6 py-4 bg-[#080d17] border-t border-slate-850 flex items-center justify-end">
              <button
                onClick={() => setShowExecutionModal(false)}
                disabled={isExecuting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-600/25 transition-all disabled:opacity-40"
              >
                {isExecuting ? 'Agent executing...' : 'Close & Sync Dashboard'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
