'use client';

import { motion } from 'framer-motion';

export default function DynamicWidgets({ uiUpdate }: { uiUpdate: any }) {
  const schedule = [
    { id: 1, time: "10:00 AM", title: "Product Sync", attendees: "Design, Eng" },
    { id: 2, time: "1:30 PM", title: "Lunch with Sarah", attendees: "Sarah" },
    { id: 3, time: "4:00 PM", title: "All-Hands Meeting", attendees: "Everyone" },
  ];

  let activeSchedule = [...schedule];
  let highlightedTitle = "";

  if (uiUpdate?.type === 'calendar_view') {
    highlightedTitle = uiUpdate.data.title;
  } else if (uiUpdate?.type === 'calendar_add') {
    activeSchedule.push({
      id: 99,
      time: uiUpdate.data.time,
      title: uiUpdate.data.title,
      attendees: "TBD"
    });
    highlightedTitle = uiUpdate.data.title;
  }

  return (
    <div className="w-full h-full flex flex-col p-6 md:pt-12 md:pr-12 md:pb-12 md:pl-8">
      
      {/* Header */}
      <div className="mb-6 md:mb-8 text-center md:text-left mt-4 md:mt-0">
        <h2 className="text-xl md:text-2xl font-bold tracking-wide text-white mb-1">Your Day</h2>
        <p className="text-slate-400 text-xs md:text-sm">Wednesday, Oct 22</p>
      </div>

      {/* Calendar List */}
      <div className="flex-1 overflow-y-auto space-y-3 md:space-y-4 md:pr-4 custom-scrollbar">
        {activeSchedule.map((item) => {
          const isHighlighted = highlightedTitle === item.title;
          
          return (
            <motion.div
              key={item.id}
              initial={item.id === 99 ? { opacity: 0, x: 20 } : { opacity: 1, x: 0 }}
              animate={{ opacity: 1, x: 0 }}
              className={`
                relative p-4 md:p-5 rounded-xl md:rounded-2xl border transition-all duration-500 overflow-hidden
                ${isHighlighted 
                  ? 'bg-blue-900/40 border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.3)] md:shadow-[0_0_30px_rgba(59,130,246,0.3)]' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                }
                backdrop-blur-md
              `}
            >
              {isHighlighted && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 skew-x-12 pointer-events-none"
                />
              )}

              <div className="flex items-start gap-3 md:gap-4 relative z-10">
                <div className={`
                  w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-xs md:text-sm shrink-0
                  ${isHighlighted ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)] md:shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-slate-800 text-slate-300'}
                `}>
                  {item.time.split(':')[0]}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className={`text-base md:text-lg font-bold mb-1 truncate ${isHighlighted ? 'text-white' : 'text-slate-200'}`}>
                    {item.title}
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs md:text-sm text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="truncate">{item.time}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:border-l sm:border-slate-700 sm:pl-3">
                      <svg className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      <span className="truncate">{item.attendees}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

    </div>
  );
}
