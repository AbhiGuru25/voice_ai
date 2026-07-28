import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  // requestUrl.origin will be "https://[your-actual-vercel-url]"
  const redirectUri = `${requestUrl.origin}/api/auth/callback/google`;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events'
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Forces consent screen so we definitely get a refresh token
    redirect_uri: redirectUri
  });

  return NextResponse.redirect(url);
}
