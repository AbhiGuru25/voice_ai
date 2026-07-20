import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface ParsedIntent {
  category: 'mandi_price' | 'weather' | 'govt_scheme' | 'general_agri' | 'set_alert' | 'confirm_action' | 'cancel_action' | 'unknown';
  parameters: {
    crop?: string;
    location?: string;
    topic?: string;
    question?: string;
    condition?: 'above' | 'below';
    target_price?: number;
  };
}

export async function parseIntentWithGemini(query: string): Promise<ParsedIntent> {
  if (!process.env.GROQ_API_KEY) {
    console.warn("No GROQ_API_KEY found, returning mock intent");
    return { category: 'mandi_price', parameters: { crop: 'wheat', location: 'ahmedabad' } };
  }

  try {
    const prompt = `
      You are an intent router for an agricultural voice assistant in India.
      Analyze the user's query and categorize it into ONE of the following categories:
      - "mandi_price": asking for the current price of a crop in a specific market. (Extract "crop" and "location").
      - "set_alert": asking to be notified or alerted when a crop price crosses a certain threshold. (Extract "crop", "location", "condition" (either 'above' or 'below'), and "target_price" as a number).
      - "weather": asking for the weather forecast in a location. (Extract "location").
      - "govt_scheme": asking about a government subsidy, scheme, or program. (Extract "topic").
      - "general_agri": asking for general farming advice, pest control, or fertilizers. (Extract "question").
      - "confirm_action": user says yes, haan, correct, confirm, sure, okay, or do it. (Used to confirm a pending action).
      - "cancel_action": user says no, nahi, cancel, na, wait, or stop. (Used to cancel a pending action).
      - "unknown": if the query does not fit any of the above.
      
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
