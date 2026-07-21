'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/data/supabase';

export default function AdminDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Fetch recent interactions
      const { data: logsData, error: logsError } = await supabase
        .from('interaction_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (logsData && !logsError) setLogs(logsData);

      // Fetch active alerts/actions
      const { data: alertsData, error: alertsError } = await supabase
        .from('alert_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (alertsData && !alertsError) setAlerts(alertsData);
      
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 3 seconds for that "Live Demo" feel during pitches
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Calculate Metrics
  const totalInteractions = logs.length > 0 ? logs.length : 0; 
  // In a real app, you'd do a count query, but for demo we just show recent
  
  const totalActiveActions = alerts.filter(a => a.status === 'active').length;
  const buyerConnects = alerts.filter(a => a.condition === 'buyer_connect').length;
  const schemeApplies = alerts.filter(a => a.condition === 'apply').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-8">
      
      {/* Header */}
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Agentic Command Center</h1>
          <p className="text-slate-500 font-medium mt-1">Live metrics and interaction feeds across all channels (Web, IVR, WhatsApp)</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm font-bold text-slate-700 tracking-widest uppercase">System Live</span>
        </div>
      </header>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm border-t-4 border-t-blue-500">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Actions Logged</h3>
          <p className="text-4xl font-extrabold text-slate-800">{alerts.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm border-t-4 border-t-green-500">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Active Triggers</h3>
          <p className="text-4xl font-extrabold text-slate-800">{totalActiveActions}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm border-t-4 border-t-orange-500">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Buyer Connects</h3>
          <p className="text-4xl font-extrabold text-slate-800">{buyerConnects}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm border-t-4 border-t-purple-500">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Scheme Applications</h3>
          <p className="text-4xl font-extrabold text-slate-800">{schemeApplies}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Live Feed Table (Takes up 2/3) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
            <h2 className="text-white font-bold tracking-wide">Live Interaction Feed</h2>
            {loading && <span className="text-xs text-slate-400">Syncing...</span>}
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4 font-bold">User</th>
                  <th className="px-6 py-4 font-bold">Intent</th>
                  <th className="px-6 py-4 font-bold">Query / Audio Input</th>
                  <th className="px-6 py-4 font-bold text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 && !loading && (
                  <tr><td colSpan={4} className="text-center py-8 text-slate-400">No recent interactions</td></tr>
                )}
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                        {log.phone_number || 'web-user'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        log.intent_category === 'buyer_connect' || log.intent_category === 'scheme_apply' || log.intent_category === 'task_reschedule' 
                          ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                          : 'bg-green-100 text-green-700 border border-green-200'
                      }`}>
                        {log.intent_category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 font-medium truncate max-w-[300px]">
                      "{log.query}"
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-slate-400">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Database State (Takes up 1/3) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-slate-800 font-bold tracking-wide">Active Subscriptions & Tasks</h2>
          </div>
          <div className="p-6 flex-1 overflow-auto space-y-4">
            {alerts.length === 0 && !loading && (
              <div className="text-center text-slate-400 text-sm mt-10">Database is empty</div>
            )}
            {alerts.map((alert) => (
              <div key={alert.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                    alert.status === 'active' ? 'bg-green-100 text-green-700' 
                    : alert.status === 'pending' ? 'bg-amber-100 text-amber-700' 
                    : 'bg-slate-200 text-slate-500'
                  }`}>
                    {alert.status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{alert.phone_number}</span>
                </div>
                <h4 className="font-bold text-slate-800 capitalize mb-1">{alert.condition}</h4>
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">{alert.crop}</span> in {alert.location}
                  {alert.target_price > 0 && ` @ ₹${alert.target_price}`}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
