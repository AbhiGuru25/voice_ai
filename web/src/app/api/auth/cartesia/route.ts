import { NextResponse } from 'next/server';

export async function GET() {
  // Cartesia SDK currently relies on the raw API key for WebSockets
  // We return it here so it is not exposed in the static Next.js client bundle.
  const apiKey = process.env.CARTESIA_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: "Cartesia API Key is missing" }, { status: 500 });
  }

  return NextResponse.json({ key: apiKey });
}
