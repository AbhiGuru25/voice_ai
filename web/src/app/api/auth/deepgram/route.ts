import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Deepgram API Key is missing" }, { status: 500 });
  }

  try {
    // Generate a short-lived token using the Deepgram REST API
    const response = await fetch('https://api.deepgram.com/v1/projects', {
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const { projects } = await response.json();
    const projectId = projects[0].project_id;

    // Create a temporary key that expires in 1 hour (3600 seconds)
    const keyResponse = await fetch(`https://api.deepgram.com/v1/projects/${projectId}/keys`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        comment: 'Temporary client key',
        scopes: ['usage:write'],
        time_to_live_in_seconds: 3600
      })
    });

    const keyData = await keyResponse.json();
    return NextResponse.json({ key: keyData.key });
  } catch (error) {
    console.error("Deepgram Token Error:", error);
    return NextResponse.json({ error: "Failed to generate Deepgram token" }, { status: 500 });
  }
}
