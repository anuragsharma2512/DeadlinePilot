import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Sparkles, AlertTriangle } from 'lucide-react';

export default function TaskInput({ onParse, isLoading }) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  
  const recognitionRef = useRef(null);
  const silenceTimeoutRef = useRef(null);

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setMicSupported(true);
    }
  }, []);

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Stop any existing recording
    if (isRecording) {
      stopRecording();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript || interimTranscript) {
        setText((prev) => {
          const base = prev.trim();
          const newSpeech = (finalTranscript + interimTranscript).trim();
          return base ? `${base} ${newSpeech}` : newSpeech;
        });

        // Auto-submit after 2 seconds of silence
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        silenceTimeoutRef.current = setTimeout(() => {
          stopRecording();
          handleSubmit();
        }, 2000);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      stopRecording();
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    setIsRecording(false);
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!text.trim() || isLoading) return;
    
    stopRecording();
    onParse(text);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="bg-[#1E293B] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Dump your chaotic thoughts here... (e.g. 'Need to finish the slide deck by 5pm today, also buy milk and call Bob at 3pm')"
          className="w-full h-28 bg-[#0F172A] border border-slate-750 focus:border-indigo-500 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none transition-all"
          disabled={isLoading}
        />
        
        {/* Recording pulse overlay */}
        {isRecording && (
          <div className="absolute top-3 right-3 flex items-center space-x-2 bg-red-500/15 border border-red-500/30 px-3 py-1 rounded-full animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-xs font-semibold text-red-400">Listening...</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {micSupported ? (
            <button
              type="button"
              onClick={startRecording}
              className={`p-2.5 rounded-xl border transition-all duration-200 ${
                isRecording
                  ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
                  : 'bg-[#0F172A] border-slate-750 hover:border-slate-600 text-slate-400 hover:text-slate-200'
              }`}
              title={isRecording ? 'Stop Recording' : 'Start Voice Input'}
              disabled={isLoading}
            >
              <Mic className="w-5 h-5" />
            </button>
          ) : (
            <span 
              className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 text-slate-600 cursor-not-allowed"
              title="Voice input only supported in Chrome"
            >
              <MicOff className="w-5 h-5" />
            </span>
          )}
          
          <span className="text-xs text-slate-500 hidden sm:inline">
            {isRecording ? 'Speak clearly. 2s silence will auto-submit.' : 'Tip: Mention deadlines & importance'}
          </span>
        </div>

        <button
          type="submit"
          disabled={!text.trim() || isLoading}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
            !text.trim() || isLoading
              ? 'bg-slate-800 text-slate-500 border border-transparent cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.02]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{isLoading ? 'Parsing...' : 'Parse with AI'}</span>
        </button>
      </div>
    </form>
  );
}
