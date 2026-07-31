import { NextRequest, NextResponse } from 'next/server';
import { runAssistantCore } from '@/lib/assistant-core';

export async function POST(req: NextRequest) {
  try {
    const { message, history, imageBase64, activeSkills, pendingActionId } = await req.json();

    const { response, uiUpdate, actionDrafted } = await runAssistantCore({
      message,
      history,
      imageBase64,
      activeSkills,
      pendingActionId,
      isTelephony: false // Web UI requires brackets for TTS tone
    });

    return NextResponse.json({
      response,
      uiUpdate,
      actionDrafted
    });

  } catch (error) {
    console.error("Error in Assistant API:", error);
    return NextResponse.json({ response: "I'm sorry, I encountered a system error.", error: true }, { status: 500 });
  }
}

