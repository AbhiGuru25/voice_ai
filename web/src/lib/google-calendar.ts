let cachedEvents: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export async function getTodaysEvents() {
  if (!process.env.AUTOMATION_WEBHOOK_URL) {
    return {
        events: [],
        error: "AUTOMATION_WEBHOOK_URL is not configured.",
        mock: true
    };
  }

  // 1. Short-term Memory Cache
  if (cachedEvents && (Date.now() - cacheTimestamp < CACHE_TTL)) {
    console.log("Serving calendar events from cache");
    return { events: cachedEvents, error: null, mock: false };
  }

  try {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };
    
    // 2. Shared Secret Auth
    if (process.env.N8N_WEBHOOK_SECRET) {
        headers['Authorization'] = `Bearer ${process.env.N8N_WEBHOOK_SECRET}`;
    }

    // 3. Graceful Failure (Timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(process.env.AUTOMATION_WEBHOOK_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: "get_calendar", details: {} }),
        signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
        throw new Error(`n8n webhook returned status ${response.status}`);
    }

    const data = await response.json();
    
    let normalizedEvents: any[] = [];
    if (Array.isArray(data)) {
        normalizedEvents = data.map(e => ({
            title: e.summary || "Untitled Event",
            time: e.start?.dateTime || e.start?.date || "Unknown Time"
        }));
    } else if (data && typeof data === 'object') {
        // If n8n returns a single object instead of an array
        normalizedEvents = [{
            title: data.summary || "Untitled Event",
            time: data.start?.dateTime || data.start?.date || "Unknown Time"
        }];
    }

    cachedEvents = normalizedEvents;
    cacheTimestamp = Date.now();

    return { events: normalizedEvents, error: null, mock: false };
  } catch (error: any) {
    console.error("Failed to fetch calendar from n8n:", error);
    return {
        events: [],
        error: "I couldn't reach your calendar right now to check your schedule. Please try again later.",
        mock: false
    };
  }
}
