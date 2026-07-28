import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  // Ensure this matches the redirect URI in Google Cloud Console
  process.env.NODE_ENV === 'production' 
    ? 'https://voice-ai-henna.vercel.app/api/auth/google' // Fallback or standard vercel URL
    : 'http://localhost:3000/api/auth/google'
);

// We need the refresh token from env
// If not present, we will gracefully degrade
if (process.env.GOOGLE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });
}

export async function getTodaysEvents() {
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    return {
        events: [],
        error: "Google Calendar is not authenticated yet. Please authorize first.",
        mock: true
    };
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Start of today
    const timeMin = new Date();
    timeMin.setHours(0, 0, 0, 0);
    
    // End of today
    const timeMax = new Date();
    timeMax.setHours(23, 59, 59, 999);

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = res.data.items || [];
    
    return {
      events: events.map((e: any) => ({
        title: e.summary,
        time: e.start.dateTime || e.start.date,
        attendees: e.attendees ? e.attendees.map((a: any) => a.email || a.displayName).join(', ') : 'No attendees'
      })),
      error: null,
      mock: false
    };

  } catch (error: any) {
    console.error("Error fetching calendar:", error);
    return {
      events: [],
      error: error.message,
      mock: true
    };
  }
}
