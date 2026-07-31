import { NextRequest, NextResponse } from 'next/server';
import { runAssistantCore } from '@/lib/assistant-core';
import { getCallSession, updateCallSession } from '@/lib/call-session-store';

export async function POST(req: NextRequest) {
  try {
    const { call_id, transport_type, caller_number, message, client_metadata } = await req.json();

    if (!call_id || !message) {
      return NextResponse.json({ error: "call_id and message are required" }, { status: 400 });
    }

    // 1. Hydrate Session History and State
    const session = getCallSession(call_id);
    const activeSkills = client_metadata?.active_skills || [];

    // 2. Run Intelligence Core
    const { response, actionDrafted, toolCallsExecuted } = await runAssistantCore({
      message,
      history: session.history,
      activeSkills,
      pendingActionId: session.pendingActionId,
      isTelephony: true // Disables emotion tags which break TTS
    });

    // 3. Update Session History
    const newHistoryItems = [
      { role: "user", content: message },
      { role: "assistant", content: response }
    ];
    
    updateCallSession(
        call_id, 
        newHistoryItems, 
        actionDrafted, 
        // If an automation was successfully executed, we clear the pending action lock
        toolCallsExecuted.includes('execute_automation')
    );

    // 4. Return Standardized Output
    return NextResponse.json({
      response,
      tool_calls_executed: toolCallsExecuted,
      action_drafted: actionDrafted,
      end_call: false
    });

  } catch (error) {
    console.error("Error in Telephony Adapter API:", error);
    return NextResponse.json({ 
        response: "I'm sorry, I encountered a system error on my end.", 
        end_call: false 
    }, { status: 500 });
  }
}
