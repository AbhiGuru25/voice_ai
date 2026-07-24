'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function OrbVisualizer({ isSpeaking, volumeLevel = 0.5 }: { isSpeaking: boolean, volumeLevel?: number }) {
  // Normalize volumeLevel somewhat to keep the scale reasonable
  const baseScale = isSpeaking ? 1.2 : 1;
  const dynamicScale = baseScale + (volumeLevel * 0.8);
  
  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Outer glow ring */}
      <motion.div
        animate={{
          scale: isSpeaking ? [1, 1.1, 1] : 1,
          opacity: isSpeaking ? [0.4, 0.7, 0.4] : 0.2,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute inset-0 rounded-full bg-blue-500 blur-3xl opacity-30 mix-blend-screen"
      />
      
      {/* Audio Reactive Inner Sphere */}
      <motion.div
        animate={{
          scale: isSpeaking ? dynamicScale : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
          mass: 0.5
        }}
        className="relative z-10 w-32 h-32 rounded-full"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #60a5fa, #2563eb, #1e3a8a)',
          boxShadow: 'inset -10px -10px 20px rgba(0,0,0,0.5), 0 0 40px rgba(59, 130, 246, 0.6)'
        }}
      >
        {/* Specular highlight for 3D effect */}
        <div className="absolute top-4 left-4 w-8 h-8 bg-white rounded-full opacity-40 blur-sm"></div>
      </motion.div>
      
      {/* Listening status particles (optional) */}
      {!isSpeaking && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border border-blue-500/20 border-dashed"
        />
      )}
    </div>
  );
}
