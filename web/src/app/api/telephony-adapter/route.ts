import { NextRequest, NextResponse } from 'next/server';
import { runAssistantCore } from '@/lib/assistant-core';
import { getCallSession, updateCallSession } from '@/lib/call-session-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, stream } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    const lastMessageObj = messages[messages.length - 1];
    const message = lastMessageObj.content;

    const call_id = req.headers.get('x-vapi-call-id') || req.headers.get('x-call-id') || 'default-vapi-call';
    const session = getCallSession(call_id);

    const { response, actionDrafted, toolCallsExecuted } = await runAssistantCore({
      message,
      history: session.history,
      isTelephony: true
    });

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

    const created = Math.floor(Date.now() / 1000);
    const id = `chatcmpl-${Date.now()}`;

    // If Vapi requests a stream, we MUST return a Server-Sent Events stream.
    if (stream) {
      const encoder = new TextEncoder();
      const sseStream = new ReadableStream({
        start(controller) {
          // Send the single chunk containing the full response
          const chunk = {
            id,
            object: "chat.completion.chunk",
            created,
            model: "voice-ai-brain",
            choices: [
              {
                index: 0,
                delta: { content: response },
                finish_reason: null
              }
            ]
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          
          // Send the stop chunk
          const stopChunk = {
            id,
            object: "chat.completion.chunk",
            created,
            model: "voice-ai-brain",
            choices: [
              {
                index: 0,
                delta: {},
                finish_reason: "stop"
              }
            ]
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(stopChunk)}\n\n`));
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      });

      return new NextResponse(sseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Otherwise, return standard JSON
    return NextResponse.json({
      id,
      object: "chat.completion",
      created,
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
    return NextResponse.json({
        choices: [{ message: { role: "assistant", content: "I'm sorry, I encountered a system error on my end." } }]
    });
  }
}
