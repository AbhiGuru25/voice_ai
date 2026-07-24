'use client';

import { motion } from 'framer-motion';

export default function OrbVisualizer({ isSpeaking, volumeLevel = 0.5 }: { isSpeaking: boolean, volumeLevel?: number }) {
  const baseScale = isSpeaking ? 1.05 : 1;
  const dynamicScale = baseScale + (volumeLevel * 0.4); // slightly less aggressive scaling so it doesn't pop out of the container
  
  return (
    <div className="relative flex items-center justify-center w-[400px] h-[400px]">
      
      {/* 1. Ambient Background Glow (Massive) */}
      <motion.div
        animate={{
          scale: isSpeaking ? [1, 1.2, 1] : 1,
          opacity: isSpeaking ? [0.3, 0.6, 0.3] : 0.1,
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full bg-blue-600 blur-[100px] mix-blend-screen pointer-events-none"
      />

      {/* 2. Audio-Reactive Shockwave Ring */}
      <motion.div
        animate={{
          scale: isSpeaking ? (1 + volumeLevel * 1.5) : 1,
          opacity: isSpeaking ? (0.8 - volumeLevel * 0.5) : 0,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="absolute w-48 h-48 rounded-full border-[3px] border-blue-400 blur-[2px] opacity-0"
      />
      
      {/* 3. The Glass Orb Core */}
      <motion.div
        animate={{
          scale: isSpeaking ? dynamicScale : 1,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20, mass: 0.5 }}
        className="relative z-10 w-48 h-48 rounded-full flex items-center justify-center overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(30, 58, 138, 0.6) 0%, rgba(15, 23, 42, 0.9) 100%)',
          boxShadow: `
            inset 0 0 40px rgba(59, 130, 246, 0.5),
            inset -15px -15px 30px rgba(0, 0, 0, 0.8),
            inset 15px 15px 30px rgba(255, 255, 255, 0.15),
            0 0 ${isSpeaking ? 60 + volumeLevel * 100 : 30}px rgba(59, 130, 246, ${isSpeaking ? 0.8 : 0.3})
          `,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Core Energy Center */}
        <motion.div 
          animate={{
            scale: isSpeaking ? [1, 1.5, 1] : 1,
            opacity: isSpeaking ? [0.6, 1, 0.6] : 0.4
          }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="absolute w-20 h-20 bg-blue-400 rounded-full blur-[25px]"
        />

        {/* Specular highlight (Glass reflection) */}
        <div className="absolute top-4 left-6 w-16 h-8 rounded-full bg-gradient-to-b from-white/40 to-transparent rotate-[-30deg] blur-[1px]"></div>
        
        {/* Inner texture/grid (Sci-Fi detail) */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
      </motion.div>
      
      {/* 4. Idle State Particles */}
      {!isSpeaking && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute w-64 h-64 rounded-full border border-blue-500/20 border-dashed pointer-events-none"
        />
      )}
      {!isSpeaking && (
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute w-56 h-56 rounded-full border-t-2 border-r-2 border-blue-400/10 pointer-events-none"
        />
      )}
    </div>
  );
}
