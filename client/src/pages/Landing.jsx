import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';
import { 
  Zap, Mic, Calendar, ShieldAlert, TrendingUp, 
  ArrowRight, Sparkles, Code, Server, Database, BrainCircuit,
  Cpu, Flame
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const loggedIn = isAuthenticated();

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 relative overflow-hidden flex flex-col justify-between">
      
      {/* Background glowing mesh circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -z-10"></div>
      <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[130px] -z-10"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[110px] -z-10"></div>

      {/* HEADER / NAV */}
      <header className="max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Zap className="w-5 h-5" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-100">
            DeadlinePiolet ⚡
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {loggedIn ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-500/25 transition-all hover:scale-[1.02]"
            >
              Enter Dashboard
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-semibold text-slate-300 hover:text-slate-100 transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-slate-100 rounded-xl font-bold text-sm transition-all hover:scale-[1.02]"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="max-w-7xl w-full mx-auto px-6 py-12 md:py-20 z-10 flex-1 flex flex-col justify-center space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full text-xs font-semibold text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Google Gemini-Powered Hackathon Entry</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-150 leading-tight">
            The AI task manager that <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">
              doesn't remind you — it fights for you.
            </span>
          </h1>

          <p className="text-base md:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Dump your chaotic panic thoughts (or dictate them live). Our AI extracts structured tasks, builds an aggressive time-blocked war plan, and **autonomously executes** tasks for you.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
            {loggedIn ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-indigo-500/20 flex items-center justify-center space-x-2 hover:scale-[1.02] transition-all"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/register')}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-indigo-500/20 flex items-center justify-center space-x-2 hover:scale-[1.02] transition-all"
                >
                  <span>Get Started for Free</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-slate-100 rounded-2xl font-bold text-base transition-all hover:scale-[1.02]"
                >
                  Try the Demo User
                </button>
              </>
            )}
          </div>
        </div>

        {/* FEATURES GRID */}
        <div className="space-y-6">
          <h2 className="text-center text-xs font-bold uppercase tracking-widest text-slate-500">
            Pillars of the App
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1: Autonomous Agent */}
            <div className="bg-[#1E293B] border border-slate-800/80 p-6 rounded-2xl space-y-4 hover:border-indigo-500/30 hover:shadow-indigo-500/5 hover:shadow-2xl transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-all">
                <Cpu className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-200 flex items-center">
                  <span>Agent Execution</span>
                  <span className="ml-2 text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30 font-mono">20% DEPTH</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Delegate tasks to our autonomous Gemini agent. It deconstructs the task and **generates the actual work** (reports, drafts, templates) so you don't start from scratch.
                </p>
              </div>
            </div>

            {/* Feature 2: Gemini War Plan */}
            <div className="bg-[#1E293B] border border-slate-800/80 p-6 rounded-2xl space-y-4 hover:border-slate-750 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:bg-violet-500/20 transition-all">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-200">Time-Blocked War Plan</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Gemini maps your tasks into an aggressive hourly timeline, dynamically scheduling around your real **Google Calendar** events and focus hours.
                </p>
              </div>
            </div>

            {/* Feature 3: Real-Time SSE Coach */}
            <div className="bg-[#1E293B] border border-slate-800/80 p-6 rounded-2xl space-y-4 hover:border-slate-750 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:bg-red-500/20 transition-all">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-200">Real-Time SSE Coach</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  A persistent Server-Sent Events stream pushes direct, no-nonsense coaching interventions and notifications when you fall behind or drift.
                </p>
              </div>
            </div>

            {/* Feature 4: Habits & Streaks */}
            <div className="bg-[#1E293B] border border-slate-800/80 p-6 rounded-2xl space-y-4 hover:border-slate-750 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-all">
                <Flame className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-200">Habits &amp; Streak Goals</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Track habits and maintain daily completion streaks. Algorithmic priority scoring dynamically boosts task weights as deadlines approach.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* TECH STACK PANEL */}
        <div className="bg-[#1E293B]/50 border border-slate-800/60 rounded-3xl p-8 max-w-4xl mx-auto space-y-6">
          <h3 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center justify-center">
            <Code className="w-4 h-4 mr-2 text-indigo-400" />
            Hackathon Tech Stack (15% Google Technologies)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-[#0F172A]/55 rounded-2xl border border-slate-850 flex flex-col items-center justify-center space-y-2">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-bold text-slate-300">Google Gemini API</span>
            </div>
            <div className="p-4 bg-[#0F172A]/55 rounded-2xl border border-slate-850 flex flex-col items-center justify-center space-y-2">
              <Calendar className="w-5 h-5 text-violet-400" />
              <span className="text-xs font-bold text-slate-300">Google Calendar OAuth</span>
            </div>
            <div className="p-4 bg-[#0F172A]/55 rounded-2xl border border-slate-850 flex flex-col items-center justify-center space-y-2">
              <Mic className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-bold text-slate-300">Web Speech API</span>
            </div>
            <div className="p-4 bg-[#0F172A]/55 rounded-2xl border border-slate-850 flex flex-col items-center justify-center space-y-2">
              <Database className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold text-slate-300">SQLite + Node.js</span>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-850 bg-[#0F172A] py-6 text-center text-xs text-slate-550 z-10">
        <p>&copy; {new Date().getFullYear()} DeadlinePiolet ⚡. Built for speed and focus.</p>
      </footer>

    </div>
  );
}
