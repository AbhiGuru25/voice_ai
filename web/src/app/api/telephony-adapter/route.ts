import { NextRequest, NextResponse } from 'next/server';
import { runAssistantCore } from '@/lib/assistant-core';
import { getCallSession, updateCallSession } from '@/lib/call-session-store';

export async function POST(req: NextRequest) {
  let stream = false;
  try {
    const body = await req.json();
    stream = body.stream;
    const { messages } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    // Extract the latest message
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

    if (stream) {
      const encoder = new TextEncoder();
      const sseStream = new ReadableStream({
        start(controller) {
          const chunk = {
            id, object: "chat.completion.chunk", created, model: "voice-ai-brain",
            choices: [{ index: 0, delta: { content: response }, finish_reason: null }]
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          
          const stopChunk = {
            id, object: "chat.completion.chunk", created, model: "voice-ai-brain",
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(stopChunk)}\n\n`));
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      });
      return new NextResponse(sseStream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
      });
    }

    return NextResponse.json({
      id, object: "chat.completion", created, model: "voice-ai-brain",
      choices: [{ index: 0, message: { role: "assistant", content: response }, finish_reason: "stop" }]
    });

  } catch (error: any) {
    console.error("Error in Telephony Adapter API:", error);
    const errorMsg = "System error: " + (error.message || "unknown");
    
    if (stream) {
        const encoder = new TextEncoder();
        const sseStream = new ReadableStream({
            start(controller) {
                const chunk = {
                    id: "error", object: "chat.completion.chunk", created: 0, model: "voice-ai-brain",
                    choices: [{ index: 0, delta: { content: errorMsg }, finish_reason: "stop" }]
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                controller.close();
            }
        });
        return new NextResponse(sseStream, {
            headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
        });
    }

    return NextResponse.json({
        choices: [{ message: { role: "assistant", content: errorMsg } }]
    });
  }
}
