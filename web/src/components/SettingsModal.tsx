'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Skill {
  id: string;
  name: string;
  prompt: string;
  isActive: boolean;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  skills: Skill[];
  setSkills: (skills: Skill[]) => void;
}

export default function SettingsModal({ isOpen, onClose, skills, setSkills }: SettingsModalProps) {
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillPrompt, setNewSkillPrompt] = useState('');

  const addSkill = () => {
    if (!newSkillName.trim() || !newSkillPrompt.trim()) return;
    const newSkill: Skill = {
      id: Math.random().toString(36).substr(2, 9),
      name: newSkillName,
      prompt: newSkillPrompt,
      isActive: true
    };
    setSkills([...skills, newSkill]);
    setNewSkillName('');
    setNewSkillPrompt('');
  };

  const toggleSkill = (id: string) => {
    setSkills(skills.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  const deleteSkill = (id: string) => {
    setSkills(skills.filter(s => s.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white tracking-wide">System Skills</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {skills.length === 0 && (
            <div className="text-slate-400 text-sm text-center py-8">No custom skills defined. Add one below!</div>
          )}
          {skills.map(skill => (
            <div key={skill.id} className={`p-4 rounded-xl border ${skill.isActive ? 'bg-blue-900/20 border-blue-500/30' : 'bg-slate-800/50 border-slate-700/50'} transition-colors`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className={`font-bold ${skill.isActive ? 'text-blue-400' : 'text-slate-300'}`}>{skill.name}</h3>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => toggleSkill(skill.id)}
                    className={`text-xs px-3 py-1 rounded-full font-bold ${skill.isActive ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                  >
                    {skill.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </button>
                  <button onClick={() => deleteSkill(skill.id)} className="text-slate-500 hover:text-red-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-300">{skill.prompt}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-800">
          <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">Add New Skill</h3>
          <div className="space-y-3">
            <input 
              type="text" 
              placeholder="Skill Name (e.g., Aggressive Coach)" 
              value={newSkillName}
              onChange={e => setNewSkillName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <textarea 
              placeholder="System Prompt Injection (e.g., You must always yell at the user to work harder.)" 
              value={newSkillPrompt}
              onChange={e => setNewSkillPrompt(e.target.value)}
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
            <button 
              onClick={addSkill}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Add Skill
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
