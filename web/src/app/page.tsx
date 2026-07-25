'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { Inter } from 'next/font/google';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -400]);

  return (
    <div className={`min-h-screen bg-black text-white selection:bg-blue-500/30 overflow-x-hidden ${inter.className}`}>
      
      {/* 1. Global Animated Topographical Background */}
      <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center opacity-30">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-[150vw] h-[150vw] md:w-[100vw] md:h-[100vw] rounded-full border-[1px] border-blue-900/20 absolute"
        />
        <motion.div 
          animate={{ scale: [1, 1.05, 1], rotate: [0, -5, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="w-[120vw] h-[120vw] md:w-[80vw] md:h-[80vw] rounded-full border-[1px] border-blue-800/20 absolute"
        />
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 10, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="w-[90vw] h-[90vw] md:w-[60vw] md:h-[60vw] rounded-full border-[1px] border-blue-700/20 absolute"
        />
        <motion.div 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="w-[60vw] h-[60vw] md:w-[40vw] md:h-[40vw] rounded-[40%] border-[2px] border-blue-500/30 absolute"
        />
        {/* Core Glow */}
        <div className="absolute w-96 h-96 bg-blue-600 rounded-full blur-[150px] opacity-20" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-8 py-6 flex justify-between items-center bg-black/50 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <span className="text-white font-semibold tracking-wider text-sm">VOICE PLATFORM</span>
        </div>
        <Link href="/realtime" className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-sm font-medium transition-all backdrop-blur-md">
          Launch Dashboard
        </Link>
      </nav>

      <main className="relative z-10">
        
        {/* HERO SECTION */}
        <section className="min-h-screen flex flex-col items-center justify-center px-4 pt-20">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
              Build smarter assistants, <br className="hidden md:block"/> automate tasks, and connect your tools at <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">lightning speed.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto font-light">
              The most reliable voice agents platform for developers.
            </p>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/realtime" className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold text-lg transition-all shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_50px_rgba(59,130,246,0.6)]">
                Start Building Now
              </Link>
            </motion.div>
          </motion.div>

          {/* Floating Orb Graphic */}
          <motion.div 
            style={{ y: y1 }}
            className="mt-24 relative w-64 h-64 md:w-96 md:h-96"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-900 to-cyan-400 rounded-full blur-3xl opacity-30 animate-pulse" />
            <div className="absolute inset-4 rounded-full border border-white/10 backdrop-blur-xl bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center overflow-hidden shadow-[inset_0_0_50px_rgba(59,130,246,0.2)]">
               <motion.div 
                 animate={{ scale: [1, 1.2, 1] }}
                 transition={{ duration: 2, repeat: Infinity }}
                 className="w-20 h-20 bg-blue-500 rounded-full blur-xl"
               />
               <div className="absolute top-8 left-12 w-24 h-12 rounded-full bg-white/20 rotate-[-30deg] blur-md" />
            </div>
          </motion.div>
        </section>

        {/* FEATURES SHOWCASE */}
        <section className="py-32 px-4 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            
            {/* Feature 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-10 md:p-14 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-lg flex flex-col justify-center relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] group-hover:bg-blue-500/20 transition-all duration-700" />
              <h3 className="text-3xl md:text-4xl font-bold mb-4 relative z-10">Build your first voice agent in less than five minutes.</h3>
              <div className="mt-8 flex gap-3 relative z-10">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                   <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
              </div>
            </motion.div>

            {/* Feature 2: Calendar UI Mockup matching the video */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="p-10 md:p-14 rounded-3xl bg-gradient-to-b from-blue-900/20 to-black border border-blue-500/20 backdrop-blur-xl relative overflow-hidden flex flex-col"
            >
              <h3 className="text-2xl font-medium text-slate-300 mb-10 z-10">Automate your schedule.</h3>
              
              <div className="flex-1 relative w-full rounded-2xl border border-white/10 bg-black/40 overflow-hidden z-10 shadow-2xl p-6 flex flex-col gap-4">
                {/* Mock Calendar Grid */}
                <div className="flex gap-4 text-[10px] text-slate-500 uppercase tracking-widest border-b border-white/10 pb-4">
                  <span className="flex-1">Tue Oct 21</span>
                  <span className="flex-1 text-blue-400">Wed Oct 22</span>
                  <span className="flex-1">Thu Oct 23</span>
                </div>
                
                <div className="relative h-32 w-full mt-4">
                  <div className="absolute top-4 left-1/3 w-1/3 h-20 bg-blue-600/30 border border-blue-400/50 rounded-lg p-2 flex flex-col">
                    <span className="text-xs font-bold text-white">All-hands meeting</span>
                    <span className="text-[10px] text-blue-200">4:00 - 5:00pm</span>
                  </div>
                </div>

                {/* AI Chat Bubble from video */}
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-blue-900/40 backdrop-blur-md border border-blue-400/30 shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center gap-4"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0 animate-pulse" />
                  <p className="text-sm text-white font-medium">Sure, so your all-hands meeting is coming up at 4pm. Did you want to sync with your team first?</p>
                </motion.div>
              </div>
            </motion.div>

            {/* Feature 3: Lowest Latency (Topographical) */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="md:col-span-2 p-16 md:p-24 rounded-3xl border border-white/5 bg-black relative overflow-hidden flex items-center justify-center text-center min-h-[500px]"
            >
              {/* Internal topographical rings */}
              <div className="absolute inset-0 flex items-center justify-center opacity-40">
                <div className="w-[800px] h-[800px] border border-blue-500/20 rounded-[35%] animate-[spin_20s_linear_infinite]" />
                <div className="absolute w-[600px] h-[600px] border border-blue-400/20 rounded-[40%] animate-[spin_15s_linear_infinite_reverse]" />
                <div className="absolute w-[400px] h-[400px] border border-blue-300/30 rounded-[45%] animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black" />
              </div>

              <h2 className="text-4xl md:text-6xl font-bold tracking-tight relative z-10 text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-200">
                With the lowest latency <br/> and the highest reliability.
              </h2>
            </motion.div>
            
            {/* Feature 4 */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="md:col-span-2 p-12 text-center"
            >
              <h3 className="text-2xl md:text-4xl font-light text-slate-300">
                Deployed in platforms worldwide for real-time human-like interactions.
              </h3>
            </motion.div>

          </div>
        </section>
        
        {/* FOOTER */}
        <footer className="border-t border-white/10 py-12 text-center text-slate-600 text-sm">
          <p>© 2026 Voice Platform. All rights reserved.</p>
        </footer>

      </main>
    </div>
  );
}
