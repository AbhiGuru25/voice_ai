'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Inter } from 'next/font/google';
import OrbVisualizer from '@/components/OrbVisualizer';
import DynamicWidgets from '@/components/DynamicWidgets';
import { createClient } from '@deepgram/sdk';
import { Cartesia } from '@cartesia/cartesia-js';

const inter = Inter({ subsets: ['latin'] });

export default function RealtimeAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [uiState, setUiState] = useState<any>(null);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [latencyMetrics, setLatencyMetrics] = useState<any>(null);
  const performanceRef = useRef({ t0: 0, t1: 0, t2: 0, t3: 0 });
  
  const deepgramWsRef = useRef<any>(null);
  const cartesiaWsRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const simulationIntervalRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopSystem = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (deepgramWsRef.current) {
      deepgramWsRef.current.finish();
    }
    if (cartesiaWsRef.current) {
      cartesiaWsRef.current.disconnect();
    }
    setIsListening(false);
    setIsSpeaking(false);
  };

  const startListening = async () => {
    setUiState(null);
    setTranscript('');
    setAiResponse('');
    
    // Hard stop anything currently running before restarting the master loop
    if (isSpeaking && cartesiaWsRef.current) {
      cartesiaWsRef.current.disconnect();
      setIsSpeaking(false);
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    }
    
    setIsListening(true);

    try {
      const authRes = await fetch('/api/auth/deepgram');
      const { key: deepgramKey } = await authRes.json();
      
      if (!deepgramKey) throw new Error("No Deepgram key");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const deepgram = createClient(deepgramKey);
      
      // Continuous listen
      const connection = deepgram.listen.live({
        model: "nova-2",
        language: "hi", // Updated for Hindi/Gujarati testing
        smart_format: true,
        endpointing: 500, // 500ms of silence = end of utterance
      });

      deepgramWsRef.current = connection;

      connection.on('open', () => {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.addEventListener('dataavailable', event => {
          if (event.data.size > 0 && connection.getReadyState() === 1) {
            connection.send(event.data);
          }
        });

        mediaRecorder.start(250);
      });

      connection.on('Results', async (data: any) => {
        const transcriptSegment = data.channel.alternatives[0].transcript;
        
        // --- INTERRUPTION LOGIC ---
        // If we hear the user speaking AND Cartesia is currently talking, kill Cartesia instantly.
        if (transcriptSegment && isSpeaking && cartesiaWsRef.current) {
            cartesiaWsRef.current.disconnect();
            setIsSpeaking(false);
            setAiResponse("Interrupted...");
            if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
        }
        
        if (transcriptSegment && data.speech_final) {
          performanceRef.current.t0 = performance.now();
          performanceRef.current.t3 = 0; // Reset TTFB marker
          
          setTranscript(prev => prev ? prev + " " + transcriptSegment : transcriptSegment);
          
          // DO NOT stop recording. Keep the mic hot for the next interaction.
          // Just fire off the query to the LLM.
          await processUserQuery(transcriptSegment);
          
        } else if (transcriptSegment) {
          setTranscript(prev => prev ? prev + " " + transcriptSegment : transcriptSegment);
        }
      });

    } catch (err) {
      console.error("Microphone or Deepgram Error:", err);
      setIsListening(false);
    }
  };

  const processUserQuery = async (text: string) => {
    try {
      performanceRef.current.t1 = performance.now();

      // Create a fresh history copy specifically for this call
      setHistory(prev => {
        const newHistory = [...prev, { role: "user", content: text }];
        
        // Execute the fetch inside here to ensure we have the absolute latest state
        fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history: newHistory }),
        }).then(res => res.json()).then(async data => {
          performanceRef.current.t2 = performance.now();
          
          if (data.uiUpdate) setUiState(data.uiUpdate);
          
          if (data.response) {
            setHistory(h => [...h, { role: "assistant", content: data.response }]);
            setAiResponse(data.response);
            await playCartesiaTTS(data.response);
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

  const playCartesiaTTS = async (text: string) => {
    try {
      const authRes = await fetch('/api/auth/cartesia');
      const { key: cartesiaKey } = await authRes.json();
      
      if (!cartesiaKey) throw new Error("No Cartesia key");

      const cartesia = new Cartesia({ apiKey: cartesiaKey });
      
      setIsSpeaking(true);
      
      simulationIntervalRef.current = setInterval(() => {
        setVolumeLevel(Math.random() * 0.8 + 0.2);
      }, 100);

      const websocket = await cartesia.tts.websocket({
        container: "raw",
        encoding: "pcm_f32le",
        sampleRate: 44100
      });
      cartesiaWsRef.current = websocket;

      await websocket.connect();
      
      const source = await websocket.send({
        model_id: "sonic-multilingual", // Switched to multilingual model for Hindi
        voice: {
          mode: "id",
          id: "a0e99841-438c-4a64-b679-ae501e7d6091",
        },
        transcript: text,
        context_id: Math.random().toString(36).substring(7),
        output_format: {
          container: "raw",
          encoding: "pcm_f32le",
          sample_rate: 44100
        }
      });

      // Hook into raw websocket to catch first audio byte for latency metrics
      if (websocket.socket) {
        websocket.socket.addEventListener("message", () => {
          if (performanceRef.current.t3 === 0) {
            performanceRef.current.t3 = performance.now();
            setLatencyMetrics({
              sttToLlm: (performanceRef.current.t1 - performanceRef.current.t0).toFixed(0),
              llmResponse: (performanceRef.current.t2 - performanceRef.current.t1).toFixed(0),
              ttsFirstByte: (performanceRef.current.t3 - performanceRef.current.t2).toFixed(0),
              totalTTFB: (performanceRef.current.t3 - performanceRef.current.t0).toFixed(0)
            });
          }
        });
      }

      websocket.on("done", () => {
        setIsSpeaking(false);
        setVolumeLevel(0);
        if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      });

    } catch (err) {
      console.error("Cartesia TTS Error:", err);
      setIsSpeaking(false);
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    }
  };

  return (
    <div className={`h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden ${inter.className}`}>
      
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
      <div className="relative z-10 w-full h-full flex flex-col md:flex-row">
        
        {/* LEFT PANEL: The AI Persona */}
        <div className="w-full md:w-2/3 h-[60vh] md:h-screen flex flex-col items-center justify-center relative pt-16 md:pt-12 pb-4 md:pb-12 border-b md:border-b-0 md:border-r border-white/5 bg-black/20 backdrop-blur-sm">
          
          <header className="absolute top-6 left-6 md:top-12 md:left-12 flex items-center gap-3 md:gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <span className="text-white font-bold text-lg md:text-xl">V</span>
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-wider text-white uppercase">Voice AI Platform</h1>
              <p className="text-blue-400 text-[10px] md:text-xs font-mono uppercase tracking-widest mt-1">Deepgram + Cartesia</p>
            </div>
          </header>

          {/* Debug Telemetry Overlay */}
          {latencyMetrics && (
            <div className="absolute top-4 right-4 md:top-8 md:right-8 bg-black/80 border border-green-500/50 p-4 rounded-xl text-green-400 font-mono text-[10px] md:text-xs z-50 shadow-[0_0_15px_rgba(34,197,94,0.2)] backdrop-blur-md min-w-[250px]">
              <h3 className="font-bold mb-2 text-green-300 border-b border-green-500/30 pb-1">Latency Telemetry (TTFB)</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <span>VAD (Speech Final):</span> <span className="text-right">T0 (0ms)</span>
                <span>STT -&gt; LLM Request:</span> <span className="text-right">+{latencyMetrics.sttToLlm}ms</span>
                <span>LLM Generation (Groq):</span> <span className="text-right">+{latencyMetrics.llmResponse}ms</span>
                <span>TTS Network (Cartesia):</span> <span className="text-right">+{latencyMetrics.ttsFirstByte}ms</span>
                <div className="col-span-2 border-t border-green-500/30 mt-1 pt-2 font-bold text-green-300 flex justify-between">
                    <span>Total TTFB:</span> <span>{latencyMetrics.totalTTFB}ms</span>
                </div>
              </div>
            </div>
          )}

          {/* The Animated Orb */}
          <div className="mt-4 md:mt-20 mb-4 md:mb-16 cursor-pointer z-50 transform scale-[0.6] md:scale-100" onClick={startListening}>
            <OrbVisualizer isSpeaking={isSpeaking} volumeLevel={volumeLevel} />
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
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-600/20 border border-blue-500/50 flex flex-shrink-0 items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div className="flex-1">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-900/30 backdrop-blur-xl border border-blue-500/30 px-4 py-3 md:px-6 md:py-5 rounded-2xl md:rounded-3xl rounded-tl-sm w-full shadow-2xl relative overflow-hidden"
                >
                  <motion.div 
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg]"
                  />
                  <p className="text-white text-sm md:text-xl leading-relaxed relative z-10">
                    {aiResponse || "I am online. Tap the orb or press Spacebar to begin."}
                  </p>
                </motion.div>
              </div>
            </div>

          </div>

          <div className="mt-8 text-slate-500 text-[10px] md:text-xs tracking-widest uppercase font-mono z-10">
            {isListening ? "Mic Hot. Say anything to interrupt..." : "System Idle"}
          </div>
        </div>

        {/* RIGHT PANEL: Tool Dashboard */}
        <div className="w-full md:w-1/3 h-[40vh] md:h-screen relative z-20">
          <DynamicWidgets uiUpdate={uiState} />
        </div>

      </div>

      {/* Global Spacebar Listener */}
      <button 
        className="fixed inset-0 opacity-0 z-0 focus:outline-none" 
        onKeyDown={(e) => {
          if (e.code === 'Space' && !isListening && !isSpeaking) startListening();
          else if (e.code === 'Escape') stopSystem();
        }}
        autoFocus
      />
    </div>
  );
}
