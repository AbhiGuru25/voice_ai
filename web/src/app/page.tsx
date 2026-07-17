'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/data/supabase';

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [result, setResult] = useState<{
    response?: string;
    intent?: any;
    agenticAction?: any;
    error?: string;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Fetch persistent alerts from Supabase on load
  useEffect(() => {
    const fetchAlerts = async () => {
      const { data, error } = await supabase
        .from('alert_subscriptions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (data && !error) {
        setActiveAlerts(data);
      }
    };
    fetchAlerts();
    
    // Cleanup audio player on unmount
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  const speakResponse = async (text: string) => {
    try {
      // 1. Fetch the Google TTS audio URL from our backend
      const res = await fetch('/api/engine/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      
      if (data.url) {
        // 2. Play the audio
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
        }
        
        const audio = new Audio(data.url);
        audioPlayerRef.current = audio;
        
        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);
        
        await audio.play();
      }
    } catch (error) {
      console.error("Error playing TTS audio:", error);
      setIsSpeaking(false);
    }
  };

  const startRecording = async () => {
    try {
      // Stop TTS if user starts speaking again
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        setIsSpeaking(false);
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioSubmit(audioBlob);
        stream.getTracks().forEach(track => track.stop()); 
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioSubmit = async (audioBlob: Blob) => {
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      const transcribeRes = await fetch('/api/engine/transcribe', {
        method: 'POST',
        body: formData,
      });

      const transcribeData = await transcribeRes.json();
      
      if (transcribeData.error) {
        throw new Error(transcribeData.error);
      }

      const transcribedText = transcribeData.text;
      setQuery(transcribedText);

      if (transcribedText) {
        await processTextQuery(transcribedText);
      }

    } catch (err: any) {
      console.error(err);
      setResult({ error: err.message || 'Failed to process voice request.' });
      setLoading(false);
    }
  };

  const processTextQuery = async (textToProcess: string) => {
    try {
      const res = await fetch('/api/engine/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToProcess }),
      });

      const data = await res.json();
      setResult(data);

      if (data.agenticAction) {
        setActiveAlerts(prev => [data.agenticAction, ...prev]);
      }
      
      // TRIGGER UPGRADED TEXT-TO-SPEECH
      if (data.response) {
        await speakResponse(data.response);
      }
      
    } catch (err) {
      setResult({ error: 'Failed to process request.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    setResult(null);
    await processTextQuery(query);
  };

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-emerald-500/30 flex flex-col">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="absolute inset-0 bg-[url('https://grain.com/images/grain-pattern.png')] opacity-5 mix-blend-overlay"></div>
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
        
        <div className="max-w-6xl mx-auto px-6 py-16 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium mb-6 border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Upgraded Realistic Voice AI (Phase 7)
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Proactive Voice AI for <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Bharat</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Experience the new, 100% free Google TTS Engine integration providing a natural-sounding Indian female voice.
          </p>
        </div>
      </div>

      {/* Main Console & Sidebar */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: Input & Output */}
        <div className="flex-1 flex flex-col">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm shadow-2xl mb-8">
            <div className="flex justify-center mb-8">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`relative flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 shadow-2xl ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse ring-8 ring-red-500/20' 
                    : 'bg-emerald-500 hover:bg-emerald-400 hover:scale-105'
                }`}
              >
                {isRecording && (
                  <span className="absolute -inset-4 rounded-full border-2 border-red-500 animate-ping opacity-20"></span>
                )}
                <svg className={`w-10 h-10 ${isRecording ? 'text-white' : 'text-slate-900'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isRecording ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  )}
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="relative">
              <div className="relative">
                <input
                  id="query"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Or type here..."
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-4 pr-32 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-lg"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={loading || !query || isRecording}
                  className="absolute right-2 top-2 bottom-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : 'Send'}
                </button>
              </div>
            </form>
          </div>

          {/* Results Area */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex-1 flex flex-col min-h-[300px]">
            <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Engine Response Pipeline</span>
              {isSpeaking && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20">
                  <span className="text-xs font-medium text-cyan-400 uppercase tracking-wider">Voice: Active (Google)</span>
                  <div className="flex gap-0.5 h-3 items-end">
                    <div className="w-1 bg-cyan-400 rounded-t-sm animate-[bounce_0.8s_infinite_0s]"></div>
                    <div className="w-1 bg-cyan-400 rounded-t-sm animate-[bounce_0.8s_infinite_0.2s]"></div>
                    <div className="w-1 bg-cyan-400 rounded-t-sm animate-[bounce_0.8s_infinite_0.4s]"></div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 flex-1 overflow-auto">
              {!result && !loading && !isRecording && (
                <div className="h-full flex items-center justify-center text-slate-600 text-sm">Awaiting simulation input...</div>
              )}
              
              {isRecording && (
                <div className="h-full flex items-center justify-center flex-col gap-4">
                  <div className="text-red-400 font-medium animate-pulse">Listening to your voice...</div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-1.5 bg-red-500 rounded-full animate-ping" style={{ height: `${Math.random() * 20 + 10}px`, animationDelay: `${i * 100}ms` }}></div>
                    ))}
                  </div>
                </div>
              )}

              {loading && !isRecording && (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <div className="text-emerald-500/70 text-sm animate-pulse text-center">
                    {!query ? 'Transcribing audio with Whisper...' : 'Analyzing intent and saving to Database...'}
                  </div>
                </div>
              )}

              {result && result.error && (
                <div className="text-red-400 font-medium">Error: {result.error}</div>
              )}

              {result && !result.error && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div>
                    <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">1. Synthesized Voice Reply (Google TTS)</h3>
                    <div className={`bg-emerald-500/10 border rounded-lg p-5 text-emerald-300 font-medium text-lg leading-relaxed transition-all duration-500 ${isSpeaking ? 'border-cyan-500/50 shadow-[inset_0_0_30px_rgba(6,182,212,0.15)]' : 'border-emerald-500/30 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]'}`}>
                      "{result.response}"
                    </div>
                  </div>

                  {result.intent && (
                    <div>
                      <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">2. Groq AI Intent Extraction</h3>
                      <pre className="bg-slate-950 border border-slate-800 p-4 rounded-lg text-sm text-cyan-400 overflow-x-auto shadow-inner">
                        {JSON.stringify(result.intent, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Agentic Dashboard */}
        <div className="lg:w-80 flex flex-col gap-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm shadow-xl flex-1 flex flex-col relative overflow-hidden">
            {/* Database indicator */}
            <div className="absolute top-0 right-0 bg-emerald-500 text-slate-900 text-[10px] font-bold px-3 py-1 rounded-bl-lg shadow-md z-10 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
              LIVE DB
            </div>

            <h3 className="text-sm font-semibold tracking-wider text-slate-300 uppercase flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Active Agentic Tasks
            </h3>
            
            <div className="flex-1 overflow-auto space-y-3">
              {activeAlerts.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-8 border border-dashed border-slate-700 rounded-xl">
                  No active monitors found in Supabase.<br/>Ask the engine to set a price alert!
                </div>
              ) : (
                activeAlerts.map((alert, i) => (
                  <div key={alert.id || i} className="bg-slate-900 border border-slate-700 p-4 rounded-xl animate-in fade-in slide-in-from-right-4 relative group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">Cron Job Active</span>
                      <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
                    </div>
                    <p className="text-sm text-slate-300 font-medium capitalize">
                      {alert.crop} in {alert.location}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Target: {alert.condition} ₹{alert.target_price}
                    </p>
                    {alert.id && (
                      <p className="text-[9px] text-slate-600 mt-2 font-mono break-all group-hover:text-slate-400 transition-colors">
                        DB ID: {alert.id.substring(0,8)}...
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
      </div>
    </main>
  );
}
