import { NextRequest, NextResponse } from 'next/server';
import { runAssistantCore } from '@/lib/assistant-core';
import { getCallSession, updateCallSession } from '@/lib/call-session-store';

export async function POST(req: NextRequest) {
  try {
    // Vapi Custom LLM sends an OpenAI-compatible payload
    const body = await req.json();
    const { messages } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    // Extract the latest user message
    const lastMessageObj = messages[messages.length - 1];
    const message = lastMessageObj.content;

    // Vapi might pass headers we can use for session tracking, but fallback to a default for testing
    const call_id = req.headers.get('x-vapi-call-id') || req.headers.get('x-call-id') || 'default-vapi-call';

    // 1. Hydrate Session State (we only need this to track pendingActionId across turns)
    const session = getCallSession(call_id);

    // 2. Run Intelligence Core
    // We ignore Vapi's history array because Vapi sends the entire transcript, but we only want to 
    // run the newest message through our core (which maintains its own truncated history in the session store)
    const { response, actionDrafted, toolCallsExecuted } = await runAssistantCore({
      message,
      history: session.history,
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
        toolCallsExecuted.includes('execute_automation')
    );

    // 4. Return OpenAI-Compatible Response (Required by Vapi)
    return NextResponse.json({
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "voice-ai-brain",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: response
          },
          finish_reason: "stop"
        }
      ]
    });

  } catch (error) {
    console.error("Error in Telephony Adapter API:", error);
    // Return an OpenAI-compatible error response so Vapi doesn't crash silently
    return NextResponse.json({
        choices: [
            {
                message: {
                    role: "assistant",
                    content: "I'm sorry, I encountered a system error on my end."
                }
            }
        ]
    });
  }
}
