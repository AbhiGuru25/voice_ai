'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/data/supabase';

const SUGGESTIONS = [
  { icon: '🌾', text: 'What is the price of wheat in Surat?' },
  { icon: '⛅', text: 'Will it rain tomorrow in Jamnagar?' },
  { icon: '🔔', text: 'Alert me when wheat goes above 2500 in Ahmedabad' }
];

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
    
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  const speakResponse = async (text: string, lang?: string) => {
    try {
      const res = await fetch('/api/engine/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang }),
      });
      const data = await res.json();
      
      if (data.url) {
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
    setQuery('');

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      const transcribeRes = await fetch('/api/engine/transcribe', {
        method: 'POST',
        body: formData,
      });

      const transcribeData = await transcribeRes.json();
      
      if (transcribeData.error) throw new Error(transcribeData.error);

      const transcribedText = transcribeData.text;

      // Handle Whisper hallucination on silent audio
      if (!transcribedText || transcribedText.trim().toLowerCase() === 'you' || transcribedText.trim() === '') {
        setResult({ error: "I couldn't hear anything. Please check if your computer's microphone is muted in Windows settings." });
        setLoading(false);
        return;
      }

      setQuery(transcribedText);

      if (transcribedText) {
        await processTextQuery(transcribedText);
      }
    } catch (err: any) {
      setResult({ error: err.message || 'Failed to process voice request.' });
      setLoading(false);
    }
  };

  const processTextQuery = async (textToProcess: string) => {
    setLoading(true);
    setResult(null);
    setQuery(textToProcess);
    
    try {
      const res = await fetch('/api/engine/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToProcess }),
      });

      const data = await res.json();
      setResult(data);

      if (data.agenticAction && data.agenticAction.status === 'active') {
        setActiveAlerts(prev => {
          // Prevent duplicates in UI
          const exists = prev.find(a => a.id === data.agenticAction.id);
          if (exists) return prev;
          return [data.agenticAction, ...prev];
        });
      }
      
      if (data.response) {
        await speakResponse(data.response, data.intent?.language);
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
    await processTextQuery(query);
  };

  const handleSuggestionClick = (text: string) => {
    processTextQuery(text);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-green-600/20 flex flex-col relative overflow-hidden">
      
      {/* Background Gradient Mesh (Glassmorphism effect) */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-green-200 mix-blend-multiply filter blur-[100px] animate-float" style={{ animationDelay: '0s' }}></div>
        <div className="absolute top-[20%] right-[-5%] w-[35%] h-[35%] rounded-full bg-orange-100 mix-blend-multiply filter blur-[100px] animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-emerald-100 mix-blend-multiply filter blur-[120px] animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Header / Hero Section */}
      <header className="relative z-10 bg-white/70 backdrop-blur-md border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)] shrink-0">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-400 via-green-500 to-orange-400"></div>
        <div className="max-w-6xl mx-auto px-6 py-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-green-700 text-sm font-semibold mb-5 border border-green-100 shadow-sm transition-transform hover:scale-105 cursor-default">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Agentic AI for Bharat (v1.1)
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-800 mb-4">
            Voice-First Intelligence for <span className="text-green-600">Agriculture</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
            Real-time market insights, proactive weather alerts, and intelligent voice interactions in your native language.
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: Input & Output */}
        <div className="flex-1 flex flex-col">
          
          {/* Main Interaction Card (Glassmorphism) */}
          <div className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-8 mb-8 relative group transition-all duration-500 hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)]">
            
            <div className="flex flex-col items-center justify-center mb-8">
              <p className="text-slate-400 text-sm font-bold mb-5 uppercase tracking-widest">
                {isRecording ? 'Listening to you...' : 'Tap to Speak'}
              </p>
              
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`relative flex items-center justify-center w-32 h-32 rounded-full transition-all duration-500 shadow-xl ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-red-500/40' 
                    : 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 hover:scale-105 hover:shadow-green-500/30'
                }`}
              >
                {/* Ripple Effect when recording */}
                {isRecording && (
                  <>
                    <span className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-30"></span>
                    <span className="absolute -inset-4 rounded-full border-2 border-red-300 animate-ping opacity-20" style={{ animationDelay: '300ms' }}></span>
                  </>
                )}
                
                {/* Dynamic Icon */}
                {isRecording ? (
                  <div className="flex items-center gap-1.5 h-8">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-1.5 bg-white rounded-full animate-waveform" style={{ animationDelay: `${i * 150}ms` }}></div>
                    ))}
                  </div>
                ) : (
                  <svg className="w-12 h-12 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                )}
              </button>
            </div>

            {/* Suggestion Chips */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {SUGGESTIONS.map((sug, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleSuggestionClick(sug.text)}
                  disabled={loading || isRecording}
                  className="bg-slate-100 hover:bg-green-50 text-slate-600 hover:text-green-700 hover:border-green-200 border border-transparent text-sm font-medium px-4 py-2 rounded-full transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <span>{sug.icon}</span>
                  {sug.text}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="relative mt-2">
              <div className="relative group/input">
                <input
                  id="query"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type your query manually..."
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 pr-32 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-green-400 focus:ring-4 focus:ring-green-500/10 transition-all text-lg shadow-inner"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={loading || !query || isRecording}
                  className="absolute right-2 top-2 bottom-2 bg-slate-800 hover:bg-slate-900 text-white font-medium px-6 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : 'Send'}
                </button>
              </div>
            </form>
          </div>

          {/* Results Area */}
          <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex-1 flex flex-col min-h-[350px]">
            <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Engine Response
              </span>
              
              {isSpeaking && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 animate-slide-up">
                  <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Voice Active</span>
                  <div className="flex items-center gap-0.5 h-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="w-1 bg-green-600 rounded-full animate-waveform" style={{ animationDelay: `${i * 200}ms` }}></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-8 flex-1 overflow-auto">
              {!result && !loading && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <svg className="w-12 h-12 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  <p className="text-sm font-medium">Ready to assist you.</p>
                </div>
              )}

              {loading && (
                <div className="h-full flex flex-col items-center justify-center gap-6 animate-in fade-in">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin"></div>
                  </div>
                  <div className="text-slate-500 font-medium text-sm animate-pulse">
                    {!query ? 'Transcribing audio...' : 'Analyzing intent with AI...'}
                  </div>
                </div>
              )}

              {result && result.error && (
                <div className="bg-red-50 text-red-700 border border-red-200 p-5 rounded-2xl font-medium animate-slide-up flex items-start gap-3">
                  <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  {result.error}
                </div>
              )}

              {result && !result.error && (
                <div className="space-y-8">
                  <div className="animate-slide-up" style={{ animationDelay: '0ms' }}>
                    <h3 className="text-[11px] text-slate-400 uppercase tracking-widest mb-3 font-bold ml-2">AI Response</h3>
                    <div className={`bg-white border rounded-2xl p-6 text-slate-800 font-medium text-xl leading-relaxed transition-all duration-500 relative overflow-hidden ${isSpeaking ? 'border-green-300 shadow-[0_8px_30px_rgba(22,163,74,0.12)] ring-4 ring-green-500/10' : 'border-slate-200 shadow-sm'}`}>
                      {isSpeaking && <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>}
                      "{result.response}"
                    </div>
                  </div>

                  {result.intent && (
                    <div className="animate-slide-up" style={{ animationDelay: '150ms' }}>
                      <h3 className="text-[11px] text-slate-400 uppercase tracking-widest mb-3 font-bold ml-2">Extracted Logic</h3>
                      <div className="bg-slate-900 rounded-2xl p-5 shadow-inner relative overflow-hidden group">
                        <div className="absolute top-0 right-0 px-3 py-1 bg-slate-800 text-slate-400 text-[10px] font-mono rounded-bl-lg">JSON</div>
                        <pre className="text-sm text-green-400 font-mono overflow-x-auto">
                          {JSON.stringify(result.intent, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Agentic Dashboard */}
        <div className="lg:w-80 flex flex-col gap-6">
          <div className="bg-white/80 backdrop-blur-md border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl p-6 flex-1 flex flex-col relative overflow-hidden transition-all hover:shadow-[0_8px_40px_rgb(0,0,0,0.06)]">
            
            {/* Database indicator */}
            <div className="absolute top-0 right-0 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-bl-2xl shadow-sm z-10 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              DB SYNCED
            </div>

            <div className="mb-6 mt-2">
              <h3 className="text-lg font-extrabold text-slate-800">Active Monitors</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Real-time cron jobs via Supabase</p>
            </div>
            
            <div className="flex-1 overflow-auto space-y-4 pr-1">
              {activeAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                    <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  </div>
                  <p className="text-sm font-medium text-slate-500">No active alerts.</p>
                  <p className="text-xs text-slate-400 mt-1">Try setting a price alert.</p>
                </div>
              ) : (
                activeAlerts.map((alert, i) => (
                  <div key={alert.id || i} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:border-green-200 hover:-translate-y-1 relative group cursor-default animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-100 uppercase tracking-wider">Active</span>
                      <button className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" title="Cancel Alert">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <p className="text-base text-slate-800 font-extrabold capitalize leading-tight">
                      {alert.crop} <span className="text-slate-400 font-medium text-sm">in</span> {alert.location}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1.5 rounded-lg">
                      <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                      <p className="text-xs text-slate-600 font-bold">
                        {alert.condition} ₹{alert.target_price}
                      </p>
                    </div>
                    {alert.id && (
                      <p className="text-[9px] text-slate-300 mt-3 font-mono break-all group-hover:text-slate-400 transition-colors">
                        {alert.id}
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
