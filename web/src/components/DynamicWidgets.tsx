'use client';

import { motion } from 'framer-motion';

export default function DynamicWidgets({ uiUpdate }: { uiUpdate: any }) {
  if (!uiUpdate) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="bg-slate-800/80 backdrop-blur-md border border-slate-700 p-6 rounded-2xl shadow-2xl w-full max-w-sm mx-auto text-white"
    >
      {uiUpdate.type === 'calendar_view' && (
        <div>
          <div className="flex items-center gap-3 mb-4 border-b border-slate-700 pb-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <p className="text-sm text-slate-400 font-medium">Upcoming Event</p>
              <h3 className="text-lg font-bold">{uiUpdate.data.title}</h3>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-slate-300">
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{uiUpdate.data.time}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              <span>{uiUpdate.data.attendees.join(', ')}</span>
            </div>
          </div>
        </div>
      )}
      
      {uiUpdate.type === 'calendar_add' && (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h3 className="text-xl font-bold mb-1">Meeting Scheduled</h3>
          <p className="text-slate-400">{uiUpdate.data.title} at {uiUpdate.data.time}</p>
        </div>
      )}
    </motion.div>
  );
}
