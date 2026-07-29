import fs from 'fs';
import path from 'path';
import os from 'os';

const STORE_PATH = path.join(os.tmpdir(), 'action_audit_log.json');

interface ActionPayload {
    id: string;
    type: string;
    data: any;
    status: 'pending' | 'executed' | 'expired';
    created_at: number;
    executed_at?: number;
}

function getStore(): ActionPayload[] {
    try {
        if (!fs.existsSync(STORE_PATH)) {
            fs.writeFileSync(STORE_PATH, JSON.stringify([]));
        }
        return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
    } catch {
        return [];
    }
}

function saveStore(store: ActionPayload[]) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function draftAction(type: string, data: any): string {
    const store = getStore();
    const id = `act_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    
    store.push({
        id,
        type,
        data,
        status: 'pending',
        created_at: Date.now()
    });
    
    saveStore(store);
    return id;
}

export function executeAction(id: string): { success: boolean, data?: any, error?: string } {
    const store = getStore();
    const actionIndex = store.findIndex(a => a.id === id);
    
    if (actionIndex === -1) {
        return { success: false, error: "Security Exception: Invalid or missing Action ID. Cannot execute." };
    }
    
    const action = store[actionIndex];
    
    // Check Idempotency
    if (action.status === 'executed') {
        return { success: false, error: "Idempotency Exception: This action has already been executed." };
    }
    
    // Check Expiry (2 minutes = 120,000 ms)
    const TWO_MINUTES = 2 * 60 * 1000;
    if (Date.now() - action.created_at > TWO_MINUTES) {
        action.status = 'expired';
        saveStore(store);
        return { success: false, error: "Expiry Exception: This action draft has expired. Please draft a new one." };
    }
    
    // Mark Executed
    action.status = 'executed';
    action.executed_at = Date.now();
    saveStore(store);
    
    return { success: true, data: action.data };
}
