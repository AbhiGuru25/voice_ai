import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface ParsedIntent {
  category: 'mandi_price' | 'weather' | 'govt_scheme' | 'general_agri' | 'set_alert' | 'confirm_action' | 'cancel_action' | 'buyer_connect' | 'task_reschedule' | 'scheme_apply' | 'unknown';
  parameters: {
    crop?: string;
    location?: string;
    topic?: string;
    question?: string;
    condition?: 'above' | 'below';
    target_price?: number;
    task?: string;
    new_day?: string;
  };
}

export async function parseIntentWithGemini(query: string, userProfile?: any): Promise<ParsedIntent> {
  if (!process.env.GROQ_API_KEY) {
    console.warn("No GROQ_API_KEY found, returning mock intent");
    return { category: 'mandi_price', parameters: { crop: 'wheat', location: 'ahmedabad' } };
  }

  try {
    let contextString = "";
    if (userProfile) {
      contextString = `
      Caller Context:
      - Name: ${userProfile.name}
      - Primary Crop: ${userProfile.primary_crop}
      - Location: ${userProfile.location}
      - Land Size: ${userProfile.land_size_acres} acres
      
      Use this context to understand their requests if they do not explicitly mention their crop or location.
      `;
    }

    const prompt = `
      You are an intent router for an agricultural voice assistant in India.
      ${contextString}
      
      Analyze the user's query and categorize it into ONE of the following execution categories:
      - "mandi_price": asking for the current price of a crop. Even if they don't mention the crop or location, STILL classify as "mandi_price".
      - "set_alert": asking to be notified when a crop price crosses a threshold. Even if details are missing, classify as "set_alert".
      - "weather": asking for the weather forecast.
      - "buyer_connect": asking to connect with a buyer, sell their crop, or find a merchant.
      - "task_reschedule": asking to delay, pause, or move a farming task (like fertilizer, irrigation) due to rain/weather.
      - "scheme_apply": asking to apply for, enroll in, or submit a form for a government scheme like PM-Kisan.
      - "govt_scheme": asking ONLY for information about a scheme, not to apply.
      - "general_agri": asking for general farming advice.
      - "confirm_action": user says yes, haan, correct, confirm, sure, okay, or do it. (Used to confirm an execution action).
      - "cancel_action": user says no, nahi, cancel, na, wait, or stop.
      - "unknown": ONLY if the query is completely unrelated to agriculture, weather, or the above actions.
      
      Return the output as a strict JSON object with NO markdown formatting.
      Format: {"category": "category_name", "parameters": {"key": "value"}}
      
      User Query: "${query}"
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a routing agent that outputs only strict JSON without any markdown blocks or backticks.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    let text = chatCompletion.choices[0]?.message?.content || '{}';
    
    if (text.startsWith('\`\`\`json')) {
      text = text.replace(/^\`\`\`json\n/, '').replace(/\n\`\`\`$/, '');
    } else if (text.startsWith('\`\`\`')) {
      text = text.replace(/^\`\`\`\n/, '').replace(/\n\`\`\`$/, '');
    }

    const parsed = JSON.parse(text);
    return {
      category: parsed.category || 'unknown',
      parameters: parsed.parameters || {},
    };
  } catch (error) {
    console.error('Error parsing intent with Groq:', error);
    return { category: 'unknown', parameters: {} };
  }
}
