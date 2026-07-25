import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Define the tools (Agentic Actions) the LLM can use
const tools = [
  {
    type: "function" as const,
    function: {
      name: "check_calendar",
      description: "Check the user's calendar for upcoming meetings today.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "The date to check, e.g. 'today' or 'tomorrow'",
          },
        },
        required: ["date"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "schedule_meeting",
      description: "Schedule a new meeting on the calendar.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          time: { type: "string" },
          attendees: { type: "array", items: { type: "string" } },
        },
        required: ["title", "time"],
      },
    },
  },
];

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    const messages = [
      {
        role: "system" as const,
        content: `You are a highly capable Executive Assistant AI. 
        You are engaging in a fast, voice-based conversation. 
        Keep your responses very concise and conversational (1-2 sentences max). 
        You have access to tools. If the user asks about their schedule or wants to book a meeting, use the tools provided.
        Do NOT use markdown, emojis, or formatting in your response. Just plain spoken text.`,
      },
      ...(history || []),
      { role: "user" as const, content: message },
    ];

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
      tools: tools,
      tool_choice: "auto",
      max_tokens: 150,
      temperature: 0.5,
    });

    const responseMessage = response.choices[0].message;
    const toolCalls = responseMessage.tool_calls;

    // Check if the LLM decided to use a tool
    if (toolCalls && toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments || "{}");

      let toolResult = "";
      let uiUpdate = null;

      // Execute the mock tool logic
      if (functionName === 'check_calendar') {
        toolResult = "You have a Product Sync at 10, lunch with Sarah, and an All-hands meeting at 4.";
        uiUpdate = {
          type: "calendar_view",
          data: {
            title: "All-Hands Meeting",
            time: "4:00 PM - 5:00 PM",
            attendees: ["Engineering Team", "Product Team"],
          }
        };
      } else if (functionName === 'schedule_meeting') {
        toolResult = `Successfully scheduled ${functionArgs.title} for ${functionArgs.time}.`;
        uiUpdate = {
          type: "calendar_add",
          data: functionArgs
        };
      }

      // Now, make a second call to Groq to generate a natural response including the tool result
      messages.push(responseMessage); // Add the assistant's tool call
      messages.push({
        role: "tool" as const,
        tool_call_id: toolCall.id,
        content: toolResult,
      });

      const secondResponse = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages,
        max_tokens: 100,
      });

      return NextResponse.json({
        response: secondResponse.choices[0].message.content,
        uiUpdate: uiUpdate
      });
    }

    // Normal response (no tool call)
    return NextResponse.json({
      response: responseMessage.content,
      uiUpdate: null
    });

  } catch (error) {
    console.error("Error in Assistant API:", error);
    return NextResponse.json({ response: "I'm sorry, I encountered a system error.", error: true }, { status: 500 });
  }
}
