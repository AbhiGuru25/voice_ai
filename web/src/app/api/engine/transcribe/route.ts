import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not set' }, { status: 500 });
    }

    console.log(`Received audio file for transcription: ${file.name}, size: ${file.size} bytes`);

    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
      response_format: "json",
    });

    console.log('Transcription result:', transcription.text);

    return NextResponse.json({
      text: transcription.text
    });

  } catch (error) {
    console.error('Error in transcription:', error);
    return NextResponse.json({ error: 'Internal Server Error during transcription' }, { status: 500 });
  }
}
