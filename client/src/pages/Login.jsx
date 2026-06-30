import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../api';
import { setToken, setUser, isAuthenticated } from '../utils/auth';
import { Zap, Mail, Lock, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If already logged in, redirect to dashboard
    if (isAuthenticated()) {
      navigate('/dashboard');
    }

    // Check if session expired
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === 'true') {
      setInfoMessage('Your session has expired. Please log in again.');
    }
  }, [navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      setToken(response.data.token);
      setUser(response.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.error || 'Failed to log in. Please check your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] px-4 py-12 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-md bg-[#1E293B] border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 relative">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Zap className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-100">
            DeadlinePiolet
          </h1>
          <p className="text-sm text-slate-400">
            The AI task manager that fights for your schedule.
          </p>
        </div>

        {error && (
          <div className="flex items-start space-x-2.5 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="flex items-start space-x-2.5 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm animate-pulse">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-550" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#0F172A] border border-slate-750 focus:border-indigo-500 rounded-xl pl-11 pr-4 py-3 text-slate-200 placeholder-slate-550 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-550" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0F172A] border border-slate-750 focus:border-indigo-500 rounded-xl pl-11 pr-4 py-3 text-slate-200 placeholder-slate-550 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-bold transition-all duration-200 hover:scale-[1.01] shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : 'Log In'}
          </button>
        </form>

        <div className="text-center text-sm text-slate-400 pt-2">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Create one now
          </Link>
        </div>

        <div className="border-t border-slate-800 pt-4 text-center">
          <div className="text-xs text-slate-500 bg-slate-900/40 p-3 rounded-xl border border-slate-850">
            <p className="font-semibold text-slate-400">Quick Hackathon Access:</p>
            <p className="mt-1">
              Email: <code className="text-amber-400 font-mono">demo@lifesaver.app</code> <br />
              Password: <code className="text-amber-400 font-mono">demo123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
