import { NextRequest, NextResponse } from 'next/server';
import * as googleTTS from 'google-tts-api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // google-tts-api limits requests to 200 characters.
    // We truncate to 199 to ensure it always succeeds.
    const safeText = text.substring(0, 199);

    const base64 = await googleTTS.getAudioBase64(safeText, {
      lang: 'hi', // 'hi' works perfectly for Indian Female voice
      slow: false,
      host: 'https://translate.google.com',
      timeout: 10000,
    });

    const audioUrl = `data:audio/mp3;base64,${base64}`;

    return NextResponse.json({ url: audioUrl });

  } catch (error) {
    console.error('Error in TTS generation:', error);
    return NextResponse.json({ error: 'Internal Server Error during TTS' }, { status: 500 });
  }
}
