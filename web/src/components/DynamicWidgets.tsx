'use client';

import { motion } from 'framer-motion';

export default function DynamicWidgets({ uiUpdate }: { uiUpdate: any }) {
  // A mock persistent schedule for the side panel
  const schedule = [
    { id: 1, time: "10:00 AM", title: "Product Sync", attendees: "Design, Eng" },
    { id: 2, time: "1:30 PM", title: "Lunch with Sarah", attendees: "Sarah" },
    { id: 3, time: "4:00 PM", title: "All-Hands Meeting", attendees: "Everyone" },
  ];

  // If a new meeting was scheduled via the AI, we'll append it for visual effect
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
    <div className="w-full h-full flex flex-col pt-12 pr-12 pb-12">
      
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-wide text-white mb-1">Your Day</h2>
        <p className="text-slate-400 text-sm">Wednesday, Oct 22</p>
      </div>

      {/* Calendar List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-4 custom-scrollbar">
        {activeSchedule.map((item) => {
          const isHighlighted = highlightedTitle === item.title;
          
          return (
            <motion.div
              key={item.id}
              initial={item.id === 99 ? { opacity: 0, x: 20 } : { opacity: 1, x: 0 }}
              animate={{ opacity: 1, x: 0 }}
              className={`
                relative p-5 rounded-2xl border transition-all duration-500 overflow-hidden
                ${isHighlighted 
                  ? 'bg-blue-900/40 border-blue-400/50 shadow-[0_0_30px_rgba(59,130,246,0.3)]' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                }
                backdrop-blur-md
              `}
            >
              {/* Highlight Glow Effect */}
              {isHighlighted && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 skew-x-12 pointer-events-none"
                />
              )}

              <div className="flex items-start gap-4 relative z-10">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm
                  ${isHighlighted ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-slate-800 text-slate-300'}
                `}>
                  {item.time.split(':')[0]}
                </div>
                
                <div className="flex-1">
                  <h3 className={`text-lg font-bold mb-1 ${isHighlighted ? 'text-white' : 'text-slate-200'}`}>
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>{item.time}</span>
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
