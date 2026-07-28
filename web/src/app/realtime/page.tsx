'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Inter } from 'next/font/google';
import OrbVisualizer from '@/components/OrbVisualizer';
import DynamicWidgets from '@/components/DynamicWidgets';
import SettingsModal, { Skill } from '@/components/SettingsModal';

const inter = Inter({ subsets: ['latin'] });

// Type definitions for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function RealtimeAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [uiState, setUiState] = useState<any>(null);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [visionMode, setVisionMode] = useState<"none" | "screen" | "webcam">("none");
  const [isDragging, setIsDragging] = useState(false);
  const [emotionState, setEmotionState] = useState('neutral');
  const [sessionId, setSessionId] = useState('');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [textInput, setTextInput] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const simulationIntervalRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Generate or retrieve Session ID for persistent memory
    let sid = localStorage.getItem('voice_ai_session');
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem('voice_ai_session', sid);
    }
    setSessionId(sid);

    // Load Skills
    try {
      const savedSkills = localStorage.getItem('voice_ai_skills');
      if (savedSkills) setSkills(JSON.parse(savedSkills));
    } catch (e) {}

    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'hi-IN'; // Native Hindi support for free!
      
      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = async (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        // INTERRUPT: Stop AI if user starts speaking
        if ((interimTranscript || finalTranscript) && isSpeaking) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
          setAiResponse("Interrupted...");
          if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
        }

        if (finalTranscript) {
          setTranscript(prev => prev ? prev + " " + finalTranscript : finalTranscript);
          await processUserQuery(finalTranscript);
        } else if (interimTranscript) {
          setTranscript(prev => prev ? prev + " " + interimTranscript : interimTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed') {
            setIsListening(false);
        }
      };

      recognition.onend = () => {
        // Auto-restart if we are supposed to be listening
        // Only if we haven't manually stopped
        if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch(e) {}
        }
      };

      recognitionRef.current = recognition;
    } else {
      console.error("Web Speech API not supported in this browser.");
    }

    return () => {
      stopSystem();
    };
  }, [isSpeaking]);

  // Save skills on change
  useEffect(() => {
    if (skills.length > 0) {
      localStorage.setItem('voice_ai_skills', JSON.stringify(skills));
    }
  }, [skills]);

  const stopSystem = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null; // Prevent auto-restart
    }
    window.speechSynthesis.cancel();
    if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    setIsListening(false);
    setIsSpeaking(false);
    setEmotionState('neutral');
  };

  const startListening = () => {
    if (!recognitionRef.current) return;
    
    setUiState(null);
    setTranscript('');
    setAiResponse('');
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setEmotionState('neutral');
    if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    
    try {
      recognitionRef.current.start();
    } catch (e) {
      // Already started
    }
  };

  const startVision = async (mode: "screen" | "webcam" | "none") => {
    try {
      if (mode === "none") {
        if (videoRef.current && videoRef.current.srcObject) {
           const stream = videoRef.current.srcObject as MediaStream;
           stream.getTracks().forEach(track => track.stop());
           videoRef.current.srcObject = null;
        }
        setVisionMode("none");
        return;
      }
      
      let stream;
      if (mode === "screen") {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setVisionMode(mode);
      
      // Listen for user manually stopping the stream
      stream.getVideoTracks()[0].onended = () => {
        setVisionMode("none");
        if (videoRef.current) videoRef.current.srcObject = null;
      };
      
    } catch (err) {
      console.error("Failed to start vision:", err);
      setVisionMode("none");
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    
    // Stop speaking if AI is talking
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    
    setTranscript(textInput);
    processUserQuery(textInput);
    setTextInput('');
  };

  const processUserQuery = async (text: string) => {
    try {
      let imageBase64 = null;
      
      // Capture a frame if vision is active
      if (visionMode !== "none" && videoRef.current) {
        const canvas = document.createElement("canvas");
        // Downscale slightly for speed and to respect token limits
        canvas.width = 640; 
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          imageBase64 = canvas.toDataURL("image/jpeg", 0.5);
        }
      }

      setHistory(prev => {
        const newHistory = [...prev, { role: "user", content: text }];
        
        const activeSkills = skills.filter(s => s.isActive);
        
        fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history: newHistory, imageBase64, activeSkills }),
        }).then(res => res.json()).then(async data => {
          if (data.uiUpdate) setUiState(data.uiUpdate);
          
          if (data.response) {
            setHistory(h => [...h, { role: "assistant", content: data.response }]);
            setAiResponse(data.response);
            playNativeTTS(data.response);
            
            // Asynchronously embed this conversation turn into the RAG Second Brain for long-term memory
            // We do not wait for this to finish, nor do we show a UI update. Silent memory formation.
            const turnMemory = `User said: ${text}\nAssistant replied: ${data.response}`;
            fetch('/api/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: `Conversation_${sessionId || 'Session'}`, text: turnMemory }),
            }).catch(e => console.error("Memory embed failed", e));
          }
        }).catch(err => {
            console.error("API Error:", err);
            setAiResponse("Connection error.");
        });

        return newHistory;
      });
      
      setAiResponse("Thinking...");
      
    } catch (err) {
      console.error("Error calling assistant API:", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const isText = file.name.endsWith('.txt') || file.name.endsWith('.md');

    if (!isText && !isPdf) {
        setUiState({ type: "ingest_failed", data: { message: "Only .txt, .md, and .pdf files are supported for now." } });
        return;
    }

    // For raw text, keep the strict 50KB limit to avoid timeout
    if (isText && file.size > 50000) { 
        setUiState({ type: "ingest_failed", data: { message: "Text file too large. Please keep it under 50KB." } });
        return;
    }

    setUiState({ type: "ingesting", data: { filename: file.name, progress: "Extracting text..." } });

    try {
        let textToIngest = "";

        if (isPdf) {
            setUiState({ type: "ingesting", data: { filename: file.name, progress: "Loading PDF Engine..." } });
            // Dynamically import to avoid Next.js Out-Of-Memory build errors
            // @ts-ignore
            const pdfjsLib = await import('pdfjs-dist/build/pdf.min.mjs');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                setUiState({ type: "ingesting", data: { filename: file.name, progress: `Reading page ${i}/${pdf.numPages}` } });
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(" ");
                fullText += pageText + "\n";
            }
            textToIngest = fullText.trim();
            
            if (!textToIngest) {
                setUiState({ type: "ingest_failed", data: { message: "No extractable text found in this PDF (might be scanned images)." } });
                return;
            }
        } else {
            textToIngest = await file.text();
        }

        // To prevent Vercel timeouts on massive PDFs, we slice the text into 50,000 char blocks (approx 100 chunks) and batch request it
        const batchSize = 50000;
        let successCount = 0;
        const totalBatches = Math.ceil(textToIngest.length / batchSize);

        for (let i = 0; i < totalBatches; i++) {
            setUiState({ type: "ingesting", data: { filename: file.name, progress: `Embedding batch ${i + 1}/${totalBatches}...` } });
            
            const textBatch = textToIngest.slice(i * batchSize, (i + 1) * batchSize);
            const response = await fetch('/api/ingest', {
                method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, text: textBatch }),
        });

        const data = await response.json();

        if (response.ok) {
            successCount += data.chunksProcessed || 0;
        } else {
            throw new Error(data.error || "Failed to process document.");
        }
    }

    setUiState({ type: "ingest_success", data: { message: `Successfully embedded ${successCount} semantic chunks into memory.` } });

    } catch (error: any) {
        console.error("Drop error:", error);
        setUiState({ type: "ingest_failed", data: { message: error.message || "Network error during ingestion." } });
    }
  };

  const playNativeTTS = (text: string) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // Stop anything currently playing

    // --- DEFENSIVE EMOTION PARSING ---
    let cleanText = text;
    let pitch = 1.0;
    let rate = 1.0;
    let currentMood = 'neutral';

    // Case-insensitive regex to capture all tags in brackets e.g. [EXCITED], [fast, sad]
    const tagMatches = text.match(/\[(.*?)\]/gi);
    
    if (tagMatches) {
        // Strip all brackets from the spoken text
        cleanText = text.replace(/\[(.*?)\]/gi, '').trim();
        
        // Analyze the tags
        const allTags = tagMatches.join(' ').toLowerCase();
        
        if (allTags.includes('excited')) {
            pitch = 1.3;
            rate = 1.1;
            currentMood = 'excited';
        } else if (allTags.includes('sad')) {
            pitch = 0.7;
            rate = 0.8;
            currentMood = 'sad';
        } else if (allTags.includes('fast')) {
            pitch = 1.0;
            rate = 1.3;
            currentMood = 'fast';
        } else if (allTags.includes('slow')) {
            pitch = 1.0;
            rate = 0.7;
            currentMood = 'slow';
        } else if (allTags.includes('serious')) {
            pitch = 0.8;
            rate = 0.9;
            currentMood = 'serious';
        }
    }
    
    setEmotionState(currentMood);
    // -----------------------------------

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Try to find a Hindi voice, fallback to default
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN'));
    if (hindiVoice) utterance.voice = hindiVoice;
    
    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onstart = () => {
      setIsSpeaking(true);
      simulationIntervalRef.current = setInterval(() => {
        setVolumeLevel(Math.random() * 0.8 + 0.2);
      }, 100);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setVolumeLevel(0);
      setEmotionState('neutral');
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setVolumeLevel(0);
      setEmotionState('neutral');
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div 
      className={`h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden ${inter.className} transition-colors duration-1000`}
      style={{
          backgroundColor: 
            emotionState === 'excited' ? 'rgba(30, 25, 0, 1)' :
            emotionState === 'sad' ? 'rgba(0, 10, 30, 1)' :
            emotionState === 'serious' ? 'rgba(30, 0, 0, 1)' :
            'rgb(2 6 23)' // slate-950 default
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      
      {/* 1. Animated Topographical Background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none fixed">
        <motion.div 
          animate={{ x: [0, -100, 0], y: [0, 50, 0] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] mix-blend-overlay min-h-screen"
        />
        <div className="absolute top-0 right-0 w-full md:w-1/2 h-full bg-gradient-to-l from-blue-900/30 to-transparent blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-full md:w-1/2 h-1/2 bg-gradient-to-t from-indigo-900/20 to-transparent blur-[150px]" />
      </div>

      {/* Split Screen Layout */}
      <div className={`relative z-10 w-full h-full flex flex-col md:flex-row transition-all duration-300 ${isDragging ? 'scale-[0.98] blur-[2px] opacity-50' : ''}`}>
        
        {/* LEFT PANEL: The AI Persona */}
        <div className="w-full md:w-2/3 min-h-[60vh] md:min-h-screen flex flex-col items-center justify-center relative pt-24 md:pt-20 pb-8 md:pb-12 border-b md:border-b-0 md:border-r border-white/5 bg-black/20 backdrop-blur-sm overflow-y-auto custom-scrollbar">
          
          <header className="absolute top-6 left-6 md:top-12 md:left-12 flex items-center gap-3 md:gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <span className="text-white font-bold text-lg md:text-xl">V</span>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-wider text-white uppercase">Voice AI Platform</h1>
              <p className="text-green-400 text-[10px] md:text-xs font-mono uppercase tracking-widest mt-1">100% Free Stack (Browser Native)</p>
            </div>
          </header>

          {/* Telemetry Overlay */}
          <div className="absolute top-4 right-4 md:top-8 md:right-8 bg-black/80 border border-green-500/50 p-4 rounded-xl text-green-400 font-mono text-[10px] md:text-xs z-50 shadow-[0_0_15px_rgba(34,197,94,0.2)] backdrop-blur-md min-w-[200px]">
              <h3 className="font-bold mb-2 text-green-300 border-b border-green-500/30 pb-1">Cost Telemetry</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <span>STT Network:</span> <span className="text-right">0ms (Local)</span>
                <span>TTS Network:</span> <span className="text-right">0ms (Local)</span>
                <span>Deepgram Cost:</span> <span className="text-right">$0.00/min</span>
                <span>Cartesia Cost:</span> <span className="text-right">$0.00/min</span>
              </div>
          </div>

          {/* The Animated Orb */}
          <div className="mt-4 md:mt-12 mb-4 md:mb-10 cursor-pointer z-50 transform scale-[0.6] md:scale-100" onClick={startListening}>
            <OrbVisualizer isSpeaking={isSpeaking} volumeLevel={volumeLevel} />
          </div>

          {/* Vision Controls & Video Preview */}
          <div className="flex flex-col items-center gap-4 mb-8 z-50">
            <div className="flex gap-4">
              <button 
                onClick={() => visionMode === "screen" ? startVision("none") : startVision("screen")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${visionMode === "screen" ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.8)]' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
              >
                {visionMode === "screen" ? "Stop Screen Share" : "Share Screen"}
              </button>
              <button 
                onClick={() => visionMode === "webcam" ? startVision("none") : startVision("webcam")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${visionMode === "webcam" ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.8)]' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
              >
                {visionMode === "webcam" ? "Stop Camera" : "Enable Camera"}
              </button>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold text-sm transition-colors border border-slate-700"
              >
                Settings
              </button>
            </div>
            
            {/* Hidden video element used purely for canvas capture, or small preview */}
            <video 
              ref={videoRef} 
              className={`w-48 h-32 object-cover rounded-xl border border-white/20 shadow-2xl ${visionMode !== "none" ? "opacity-100 block" : "opacity-0 hidden"}`} 
              autoPlay 
              playsInline 
              muted 
            />
          </div>

          {/* Jarvis Chat Interface (Floating Glass Card) */}
          <div className="w-full max-w-2xl px-4 md:px-8 flex flex-col gap-2 md:gap-6 z-10">
            
            {/* User Transcript */}
            <div className="flex justify-end w-full">
              {transcript && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-3 md:px-6 md:py-4 rounded-2xl rounded-tr-sm md:rounded-3xl max-w-xs md:max-w-lg shadow-xl"
                >
                  <p className="text-slate-200 text-sm md:text-lg">{transcript}</p>
                </motion.div>
              )}
            </div>

            {/* AI Chat Bubble */}
            <div className="flex items-start gap-3 md:gap-4 w-full">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full border flex flex-shrink-0 items-center justify-center transition-all duration-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] ${
                  emotionState === 'excited' ? 'bg-yellow-600/20 border-yellow-500/50 text-yellow-400' :
                  emotionState === 'sad' ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' :
                  emotionState === 'serious' ? 'bg-red-600/20 border-red-500/50 text-red-400' :
                  'bg-blue-600/20 border-blue-500/50 text-blue-400'
              }`}>
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div className="flex-1">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`backdrop-blur-xl border px-4 py-3 md:px-6 md:py-5 rounded-2xl md:rounded-3xl rounded-tl-sm w-full shadow-2xl relative overflow-hidden transition-all duration-500 ${
                    emotionState === 'excited' ? 'bg-yellow-900/30 border-yellow-500/30' :
                    emotionState === 'sad' ? 'bg-blue-900/30 border-blue-500/30' :
                    emotionState === 'serious' ? 'bg-red-900/30 border-red-500/30' :
                    'bg-blue-900/30 border-blue-500/30'
                  }`}
                >
                  <motion.div 
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg]"
                  />
                  <p className="text-white text-sm md:text-xl leading-relaxed relative z-10">
                    {/* Only show the clean text in the UI by stripping tags */}
                    {aiResponse ? aiResponse.replace(/\[(.*?)\]/gi, '').trim() : "I am online. Tap the orb or press Spacebar to begin."}
                  </p>
                </motion.div>
              </div>
            </div>

          </div>

          <div className="mt-8 z-10 w-full max-w-2xl px-4 md:px-8">
            <div className="text-slate-500 text-[10px] md:text-xs tracking-widest uppercase font-mono text-center mb-4">
              {isListening ? "Mic Hot. Say anything to interrupt..." : "System Idle"}
            </div>
            
            <form onSubmit={handleTextSubmit} className="flex gap-2 w-full">
              <input 
                type="text" 
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="Or type a message..." 
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 backdrop-blur-md transition-all text-sm"
              />
              <button 
                type="submit" 
                disabled={!textInput.trim() || isListening}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-6 font-bold transition-all flex items-center justify-center text-sm"
              >
                Send
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT PANEL: Tool Dashboard */}
        <div className="w-full md:w-1/3 h-[40vh] md:h-screen relative z-20">
          <DynamicWidgets uiUpdate={uiState} />
        </div>

      </div>

      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-900/20 backdrop-blur-sm border-4 border-dashed border-blue-500 rounded-3xl m-4 pointer-events-none">
            <div className="flex flex-col items-center gap-4 animate-bounce">
                <svg className="w-20 h-20 text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                <h2 className="text-4xl font-bold text-white tracking-widest uppercase">Drop File Here</h2>
                <p className="text-blue-300 font-mono">.txt, .md, and .pdf supported (images skipped)</p>
            </div>
        </div>
      )}

      {/* Global Spacebar Listener */}
      <button 
        className="fixed inset-0 opacity-0 z-0 focus:outline-none" 
        onKeyDown={(e) => {
          if (e.code === 'Space' && !isListening && !isSpeaking && !isSettingsOpen) startListening();
          else if (e.code === 'Escape') {
              stopSystem();
              setIsSettingsOpen(false);
          }
        }}
        autoFocus
      />
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        skills={skills} 
        setSkills={setSkills} 
      />
    </div>
  );
}
