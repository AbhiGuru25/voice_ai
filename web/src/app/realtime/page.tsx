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
  
  const deepgramWsRef = useRef<any>(null);
  const cartesiaWsRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const simulationIntervalRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop recording cleanly
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (deepgramWsRef.current) {
      deepgramWsRef.current.finish();
    }
    setIsListening(false);
  };

  const startListening = async () => {
    // Reset state
    setUiState(null);
    setTranscript('');
    setAiResponse('');
    
    // Stop any current Cartesia speech
    if (isSpeaking && cartesiaWsRef.current) {
      setIsSpeaking(false);
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    }
    
    setIsListening(true);

    try {
      // 1. Fetch Deepgram Auth Token
      const authRes = await fetch('/api/auth/deepgram');
      const { key: deepgramKey } = await authRes.json();
      
      if (!deepgramKey) throw new Error("No Deepgram key");

      // 2. Capture Mic Audio
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 3. Connect to Deepgram WebSocket
      const deepgram = createClient(deepgramKey);
      const connection = deepgram.listen.live({
        model: "nova-2",
        language: "en-US",
        smart_format: true,
        endpointing: 500, // wait 500ms of silence to trigger endpoint
      });

      deepgramWsRef.current = connection;

      connection.on('open', () => {
        // Use MediaRecorder to stream chunks to Deepgram
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.addEventListener('dataavailable', event => {
          if (event.data.size > 0 && connection.getReadyState() === 1) {
            connection.send(event.data);
          }
        });

        mediaRecorder.start(250); // Send chunks every 250ms
      });

      connection.on('Results', async (data: any) => {
        const transcriptSegment = data.channel.alternatives[0].transcript;
        if (transcriptSegment && data.speech_final) {
          setTranscript(prev => prev + " " + transcriptSegment);
          
          // Endpoint reached (user finished speaking sentence)
          stopRecording();
          await processUserQuery(transcriptSegment);
        } else if (transcriptSegment) {
          setTranscript(prev => prev + " " + transcriptSegment);
        }
      });

    } catch (err) {
      console.error("Microphone or Deepgram Error:", err);
      setIsListening(false);
    }
  };

  const processUserQuery = async (text: string) => {
    try {
      const newHistory = [...history, { role: "user", content: text }];
      setAiResponse("Thinking...");
      
      // Fire to Groq LLM (via Next.js API to hide Groq key)
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: history }),
      });
      
      const data = await res.json();
      
      if (data.uiUpdate) setUiState(data.uiUpdate);
      
      if (data.response) {
        setHistory([...newHistory, { role: "assistant", content: data.response }]);
        setAiResponse(data.response);
        await playCartesiaTTS(data.response);
      }
    } catch (err) {
      console.error("Error calling assistant API:", err);
      setAiResponse("Connection error.");
    }
  };

  const playCartesiaTTS = async (text: string) => {
    try {
      // 1. Fetch Cartesia Key
      const authRes = await fetch('/api/auth/cartesia');
      const { key: cartesiaKey } = await authRes.json();
      
      if (!cartesiaKey) throw new Error("No Cartesia key");

      // 2. Initialize Cartesia WebSocket
      const cartesia = new Cartesia({ apiKey: cartesiaKey });
      
      // 3. Play audio
      setIsSpeaking(true);
      
      // Simulate audio frequencies for the orb (since Web Audio API analysis on remote streams is complex for MVP)
      simulationIntervalRef.current = setInterval(() => {
        setVolumeLevel(Math.random() * 0.8 + 0.2);
      }, 100);

      // We use Cartesia's WebPlayer
      const websocket = cartesia.tts.websocket({
        container: "raw",
        encoding: "pcm_f32le",
        sampleRate: 44100
      });
      cartesiaWsRef.current = websocket;

      await websocket.connect();
      
      const source = await websocket.send({
        model_id: "sonic-english",
        voice: {
          mode: "id",
          id: "a0e99841-438c-4a64-b679-ae501e7d6091", // High quality voice ID
        },
        transcript: text,
      });

      // Simple playback trigger, stopping visualizer when done
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
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex relative overflow-hidden ${inter.className}`}>
      
      {/* 1. Animated Topographical Background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <motion.div 
          animate={{ x: [0, -100, 0], y: [0, 50, 0] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] mix-blend-overlay"
        />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-900/30 to-transparent blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-t from-indigo-900/20 to-transparent blur-[150px]" />
      </div>

      {/* Split Screen Layout */}
      <div className="relative z-10 w-full flex">
        
        {/* LEFT PANEL: The AI Persona */}
        <div className="w-2/3 h-full flex flex-col items-center justify-center relative pt-12 border-r border-white/5 bg-black/20 backdrop-blur-sm">
          
          <header className="absolute top-12 left-12 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider text-white uppercase">Voice AI Platform</h1>
              <p className="text-blue-400 text-xs font-mono uppercase tracking-widest mt-1">Deepgram + Cartesia</p>
            </div>
          </header>

          {/* The Animated Orb */}
          <div className="mt-20 mb-16 cursor-pointer z-50" onClick={startListening}>
            <OrbVisualizer isSpeaking={isSpeaking} volumeLevel={volumeLevel} />
          </div>

          {/* Jarvis Chat Interface (Floating Glass Card) */}
          <div className="w-full max-w-2xl px-8 flex flex-col gap-6 z-10">
            
            {/* User Transcript */}
            <div className="flex justify-end w-full">
              {transcript && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 backdrop-blur-md border border-white/10 px-6 py-4 rounded-3xl rounded-tr-sm max-w-lg shadow-xl"
                >
                  <p className="text-slate-200 text-lg">{transcript}</p>
                </motion.div>
              )}
            </div>

            {/* AI Chat Bubble */}
            <div className="flex items-start gap-4 w-full">
              <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500/50 flex flex-shrink-0 items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div className="flex-1">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-900/30 backdrop-blur-xl border border-blue-500/30 px-6 py-5 rounded-3xl rounded-tl-sm w-full shadow-2xl relative overflow-hidden"
                >
                  <motion.div 
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg]"
                  />
                  <p className="text-white text-xl leading-relaxed relative z-10">
                    {aiResponse || "I am online. Tap the orb or press Spacebar to begin."}
                  </p>
                </motion.div>
              </div>
            </div>

          </div>

          <div className="absolute bottom-12 text-slate-500 text-sm tracking-widest uppercase font-mono z-10">
            {isListening ? "Listening (Deepgram Active)..." : "System Idle"}
          </div>
        </div>

        {/* RIGHT PANEL: Tool Dashboard */}
        <div className="w-1/3 h-full relative z-20">
          <DynamicWidgets uiUpdate={uiState} />
        </div>

      </div>

      {/* Global Spacebar Listener */}
      <button 
        className="fixed inset-0 opacity-0 z-0 focus:outline-none" 
        onKeyDown={(e) => {
          if (e.code === 'Space' && !isListening && !isSpeaking) startListening();
        }}
        autoFocus
      />
    </div>
  );
}
