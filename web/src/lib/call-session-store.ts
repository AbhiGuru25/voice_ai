import fs from 'fs';
import path from 'path';

// Define the shape of our server-side call session
export interface CallSession {
    call_id: string;
    history: any[];
    pendingActionId: string | null;
    updated_at: number;
}

// Use /tmp for serverless environments (Vercel)
const STORE_PATH = '/tmp/call-sessions.json';

function getStore(): Record<string, CallSession> {
    try {
        if (!fs.existsSync(STORE_PATH)) {
            fs.writeFileSync(STORE_PATH, JSON.stringify({}));
        }
        return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
    } catch {
        return {};
    }
}

function saveStore(store: Record<string, CallSession>) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

// Retrieve or create a new session
export function getCallSession(call_id: string): CallSession {
    const store = getStore();
    
    // Clean up expired sessions (older than 1 hour)
    const ONE_HOUR = 60 * 60 * 1000;
    const now = Date.now();
    for (const key in store) {
        if (now - store[key].updated_at > ONE_HOUR) {
            delete store[key];
        }
    }
    
    if (!store[call_id]) {
        store[call_id] = {
            call_id,
            history: [],
            pendingActionId: null,
            updated_at: now
        };
    } else {
        store[call_id].updated_at = now;
    }
    
    saveStore(store);
    return store[call_id];
}

// Update the session state
export function updateCallSession(
    call_id: string, 
    newHistoryItems: any[], 
    pendingActionId: string | null = null,
    clearPendingAction: boolean = false
) {
    const store = getStore();
    if (!store[call_id]) return;
    
    // Append new history
    store[call_id].history.push(...newHistoryItems);
    
    // Truncate history to prevent unbounded growth (keep last 20 messages)
    if (store[call_id].history.length > 20) {
        // Always keep the original system prompt if it was added (role: system)
        const hasSystem = store[call_id].history[0]?.role === 'system';
        const keepCount = 20;
        
        if (hasSystem) {
            const systemMsg = store[call_id].history[0];
            const tail = store[call_id].history.slice(-(keepCount - 1));
            store[call_id].history = [systemMsg, ...tail];
        } else {
            store[call_id].history = store[call_id].history.slice(-keepCount);
        }
    }
    
    // Update pending action state
    if (clearPendingAction) {
        store[call_id].pendingActionId = null;
    } else if (pendingActionId) {
        store[call_id].pendingActionId = pendingActionId;
    }
    
    store[call_id].updated_at = Date.now();
    saveStore(store);
}
