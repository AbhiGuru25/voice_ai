import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  try {
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/api/auth/callback/google`;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    // Since this is deployed to Vercel (read-only filesystem), we show the token to the user
    // so they can copy-paste it into their Vercel Environment Variables.
    if (tokens.refresh_token) {
      return new NextResponse(`
        <html>
          <body style="background: #0f172a; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh;">
            <div style="text-align: center; max-width: 600px; padding: 20px;">
              <h1 style="color: #3b82f6;">Success!</h1>
              <p>Your Google Calendar is now authenticated.</p>
              <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; word-break: break-all;">
                  <p style="color: #94a3b8; font-size: 12px; text-transform: uppercase; margin-top: 0;">Your Refresh Token</p>
                  <code style="color: #10b981; font-size: 16px;">${tokens.refresh_token}</code>
              </div>
              <p style="font-size: 14px; color: #94a3b8; margin-bottom: 30px;">
                  Copy this token and add it to your Vercel Environment Variables as <strong>GOOGLE_REFRESH_TOKEN</strong>.
              </p>
              <a href="/realtime" style="padding: 10px 20px; background: #3b82f6; color: white; border-radius: 8px; text-decoration: none;">Return to Dashboard</a>
            </div>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }

    // If we only got an access token, they need to revoke and re-auth
    return NextResponse.json({ error: "No refresh token received. Make sure you revoked previous access in your Google Account." }, { status: 400 });

  } catch (error) {
    console.error("OAuth Error:", error);
    return NextResponse.json({ error: "Failed to authenticate" }, { status: 500 });
  }
}
