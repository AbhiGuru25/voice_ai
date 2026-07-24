'use client';

import { useState, useEffect, useRef } from 'react';
import OrbVisualizer from '@/components/OrbVisualizer';
import DynamicWidgets from '@/components/DynamicWidgets';

export default function RealtimeAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [uiState, setUiState] = useState<any>(null);
  const [transcript, setTranscript] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<any>(null);
  const simulationIntervalRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API for STT
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        await processUserQuery(text);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (e: any) => {
        console.error("Speech recognition error", e);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      alert("SpeechRecognition is not supported in this browser. Please use Chrome.");
    }

    // Initialize TTS
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    
    return () => {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [history]); // Depend on history so the closure has the latest history

  const startListening = () => {
    if (isSpeaking && synthRef.current) {
      synthRef.current.cancel(); // Interrupt the AI
      setIsSpeaking(false);
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    }
    
    setUiState(null); // Clear widgets on new query
    setTranscript('');
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Already started");
      }
    }
  };

  const processUserQuery = async (text: string) => {
    try {
      const newHistory = [...history, { role: "user", content: text }];
      
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: history }),
      });
      
      const data = await res.json();
      
      if (data.uiUpdate) {
        setUiState(data.uiUpdate);
      }
      
      if (data.response) {
        setHistory([...newHistory, { role: "assistant", content: data.response }]);
        speakResponse(data.response);
      }
    } catch (err) {
      console.error("Error calling assistant API:", err);
    }
  };

  const speakResponse = (text: string) => {
    if (!synthRef.current) return;
    
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Pick a good voice if available
    const voices = synthRef.current.getVoices();
    const goodVoice = voices.find((v: any) => v.name.includes("Google") || v.name.includes("Premium"));
    if (goodVoice) utterance.voice = goodVoice;
    
    utterance.rate = 1.1; // Make it sound slightly faster/more conversational

    utterance.onstart = () => {
      setIsSpeaking(true);
      // Simulate audio frequency data for the orb
      simulationIntervalRef.current = setInterval(() => {
        setVolumeLevel(Math.random() * 0.8 + 0.2); // Random level between 0.2 and 1.0
      }, 100);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setVolumeLevel(0);
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };

    synthRef.current.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center relative overflow-hidden font-sans">
      
      {/* Background ambient gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-900/20 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      <header className="absolute top-8 left-0 right-0 text-center z-10">
        <h1 className="text-2xl font-bold tracking-widest text-slate-300 uppercase">Executive Voice AI</h1>
        <p className="text-slate-500 text-sm mt-2">Powered by Groq Llama 3</p>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl px-6 flex-1">
        
        {/* Dynamic Widget Area (Top) */}
        <div className="h-48 w-full flex items-end justify-center mb-8">
          <DynamicWidgets uiUpdate={uiState} />
        </div>

        {/* The Animated Orb */}
        <div className="mb-12 cursor-pointer" onClick={startListening}>
          <OrbVisualizer isSpeaking={isSpeaking} volumeLevel={volumeLevel} />
        </div>

        {/* Status Text & Controls */}
        <div className="text-center h-24">
          <p className="text-slate-400 font-medium mb-4 h-6">
            {isListening ? "Listening..." : isSpeaking ? "Speaking..." : "Tap the orb or press Spacebar to speak"}
          </p>
          
          <p className="text-xl font-medium text-blue-100 max-w-2xl mx-auto italic opacity-80">
            {transcript ? `"${transcript}"` : ""}
          </p>
        </div>
        
      </main>
      
      {/* Invisible global key listener for spacebar */}
      <button 
        className="fixed inset-0 opacity-0 z-0 focus:outline-none" 
        onKeyDown={(e) => {
          if (e.code === 'Space' && !isListening && !isSpeaking) {
            startListening();
          }
        }}
        autoFocus
      />
    </div>
  );
}
