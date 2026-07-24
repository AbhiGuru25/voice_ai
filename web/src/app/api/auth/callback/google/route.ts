import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3000/api/auth/callback/google'
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    // In a real production app, you'd save this to a database per user.
    // Since this is a single-tenant prototype, we'll write it directly to the local .env.local file.
    if (tokens.refresh_token) {
      const envPath = path.join(process.cwd(), '.env.local');
      fs.appendFileSync(envPath, `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
      
      return new NextResponse(`
        <html>
          <body style="background: #0f172a; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh;">
            <div style="text-align: center;">
              <h1 style="color: #3b82f6;">Success!</h1>
              <p>Your Google Calendar is now securely connected.</p>
              <p>Please <strong>restart your local terminal (npm run dev)</strong> to load the new Refresh Token.</p>
              <br/>
              <a href="/realtime" style="padding: 10px 20px; background: #3b82f6; color: white; border-radius: 8px; text-decoration: none;">Return to Dashboard</a>
            </div>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }

    return NextResponse.json({ error: "No refresh token received. Make sure you revoked previous access." }, { status: 400 });

  } catch (error) {
    console.error("OAuth Error:", error);
    return NextResponse.json({ error: "Failed to authenticate" }, { status: 500 });
  }
}
