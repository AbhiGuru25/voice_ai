import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Twilio expects XML (TwiML) to instruct it on what to do when a call connects.
    const twiml = `
      <Response>
        <Say voice="Polly.Aditi">Namaste. Welcome to Voice A I for Bharat. Please tell me how I can help you today.</Say>
        <Record 
          action="/api/ivr/process" 
          method="POST" 
          maxLength="10" 
          playBeep="true" 
          transcribe="false"
        />
        <Say voice="Polly.Aditi">I did not hear anything. Goodbye.</Say>
      </Response>
    `;

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Error in IVR incoming:', error);
    return new NextResponse('<Response><Say>Sorry, system error.</Say></Response>', { 
      status: 500, 
      headers: { 'Content-Type': 'text/xml' } 
    });
  }
}
