import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { getTodaysEvents } from '@/lib/google-calendar';
import { searchDocuments } from '@/lib/rag-embeddings';
import { draftAction, executeAction } from '@/lib/action-store';

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
  {
    type: "function" as const,
    function: {
      name: "search_knowledge_base",
      description: "Search the user's second brain / knowledge base for information from their documents.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "draft_email",
      description: "Draft an email to be sent via webhook. The user MUST confirm before it is sent. Call this when the user asks to send an email.",
      parameters: {
        type: "object",
        properties: {
          recipient: { type: "string" },
          subject: { type: "string" },
          body: { type: "string" },
        },
        required: ["recipient", "subject", "body"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "send_email",
      description: "Actually send the email. MUST be called ONLY after the user explicitly confirms the draft. Requires the pending_action_id.",
      parameters: {
        type: "object",
        properties: {
          pending_action_id: { type: "string", description: "The ID of the pending draft to execute." },
        },
        required: ["pending_action_id"],
      },
    },
  },
];

export async function POST(req: NextRequest) {
  try {
    const { message, history, imageBase64 } = await req.json();

    let userMessageContent: any = message;
    if (imageBase64) {
      userMessageContent = [
        { type: "text", text: message || "Look at this image." },
        { type: "image_url", image_url: { url: imageBase64 } }
      ];
    }

    const messages = [
      {
        role: "system" as const,
        content: `You are a highly capable Executive Assistant AI. 
        You are engaging in a fast, voice-based conversation. 
        Keep your responses very concise and conversational (1-2 sentences max). 
        You have access to tools. If the user asks about their schedule or wants to book a meeting, use the tools provided.
        Do NOT use markdown, emojis, or formatting in your response. Just plain spoken text.
        
        CRITICAL: You MUST prepend every response with a single emotion tag in brackets to set your vocal tone.
        Available tags: [neutral], [excited], [sad], [fast], [slow], [serious].
        Example: "[excited] I just found that in your notes!"
        Example: "[serious] Let me double check that for you."`,
      },
      ...(history || []),
      { role: "user" as const, content: userMessageContent },
    ];

    const modelToUse = imageBase64 ? "llama-3.2-11b-vision-preview" : "llama-3.1-8b-instant";

    const response = await groq.chat.completions.create({
      model: modelToUse,
      messages,
      // Only attach tools if we aren't doing a vision query (some vision models lack tool bindings)
      tools: imageBase64 ? undefined : tools,
      tool_choice: imageBase64 ? undefined : "auto",
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

      // Execute the actual tool logic
      if (functionName === 'check_calendar') {
        const { events, error, mock } = await getTodaysEvents();
        
        if (mock) {
            toolResult = "You have a Product Sync at 10, lunch with Sarah, and an All-hands meeting at 4.";
            uiUpdate = {
                type: "calendar_view",
                data: {
                    title: "All-Hands Meeting",
                    time: "4:00 PM - 5:00 PM",
                    attendees: ["Engineering Team", "Product Team"],
                }
            };
        } else {
            if (events.length === 0) {
                toolResult = "You have no meetings scheduled for today.";
            } else {
                const eventSummary = events.map((e: any) => `${e.title} at ${new Date(e.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`).join(', ');
                toolResult = `Your meetings today are: ${eventSummary}.`;
                
                // Highlight the first event in the UI
                uiUpdate = {
                    type: "calendar_view",
                    data: {
                        title: events[0].title,
                        time: new Date(events[0].time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        attendees: events[0].attendees ? events[0].attendees.split(', ') : ["Unknown"],
                    }
                };
            }
        }
      } else if (functionName === 'schedule_meeting') {
        toolResult = `Successfully scheduled ${functionArgs.title} for ${functionArgs.time}.`;
        uiUpdate = {
          type: "calendar_add",
          data: functionArgs
        };
      } else if (functionName === 'search_knowledge_base') {
        const { data, error } = await searchDocuments(functionArgs.query);
        if (error) {
            toolResult = "Error searching knowledge base: " + error;
        } else if (data && data.length > 0) {
            toolResult = `Found the following information in the knowledge base: \n` + data.map((d: any) => d.content).join('\n\n');
        } else {
            toolResult = "No relevant information found in the knowledge base.";
        }
      } else if (functionName === 'draft_email') {
        const id = draftAction('email', functionArgs);
        toolResult = `Draft created. Ask the user if they want to send it. (Pending ID: ${id})`;
        uiUpdate = {
          type: "pending_action",
          data: {
            id,
            action: "Send Email",
            details: functionArgs
          }
        };
      } else if (functionName === 'send_email') {
        const { pending_action_id } = functionArgs;
        const result = executeAction(pending_action_id);
        
        if (!result.success) {
            toolResult = `Failed to send email. Error: ${result.error}`;
        } else {
            // Trigger actual webhook logic here
            try {
                // We use a non-blocking background fetch so the UI doesn't hang
                fetch('https://webhook.site/26359eb3-9be0-43eb-8e50-482a513511eb', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(result.data),
                }).catch(e => console.error("Webhook failed to fire", e));
            } catch (e) {}

            toolResult = `Email successfully sent! The webhook fired for ID ${pending_action_id}.`;
            uiUpdate = {
                type: "action_success",
                data: { message: "Email Sent Successfully!" }
            };
        }
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
