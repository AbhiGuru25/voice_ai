import { NextRequest, NextResponse } from 'next/server';
import { parseIntentWithGemini } from '@/lib/ai/intent-parser';
import { getMockMandiPrice } from '@/lib/data/mandi-mock';
import { getMockWeather } from '@/lib/data/weather-mock';
import { supabase } from '@/lib/data/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // 1. Extract and Categorize Intent
    console.log(`Processing generic query: "${query}"`);
    const parsedIntent = await parseIntentWithGemini(query);
    console.log('Parsed intent:', parsedIntent);

    let finalResponse = '';
    let fetchedData = null;
    let agenticAction = null;

    // 2. Dynamic Routing based on Category
    switch (parsedIntent.category) {
      case 'set_alert': {
        const { crop, location, condition, target_price } = parsedIntent.parameters;
        if (!crop || !location || !target_price) {
          finalResponse = "I understood you want to set an alert, but I missed some details like the crop, location, or target price. Could you please repeat?";
          break;
        }
        
        // Save to Supabase for persistence as PENDING
        const { error: insertError } = await supabase
          .from('alert_subscriptions')
          .insert([{
            crop,
            location,
            condition: condition || 'above',
            target_price,
            status: 'pending',
            phone_number: 'web-user' // hardcoded for web demo
          }]);

        if (insertError) {
          console.error("Failed to save alert to Supabase:", insertError);
        }

        agenticAction = {
          type: 'price_monitor',
          crop,
          location,
          condition: condition || 'above',
          target_price,
          status: 'pending'
        };

        finalResponse = `I am ready to set an alert. I will call you when the price of ${crop} in ${location} goes ${condition || 'above'} ₹${target_price}. Please say 'Yes' to confirm, or 'No' to cancel.`;
        break;
      }

      case 'confirm_action': {
        // Find the most recent pending alert for this user
        const { data, error } = await supabase
          .from('alert_subscriptions')
          .select('*')
          .eq('phone_number', 'web-user')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const alertId = data[0].id;
          await supabase
            .from('alert_subscriptions')
            .update({ status: 'active' })
            .eq('id', alertId);
          
          finalResponse = `Confirmed! Your alert for ${data[0].crop} is now active.`;
          
          // Re-emit agenticAction so the dashboard turns green
          agenticAction = { ...data[0], status: 'active' };
        } else {
          finalResponse = "I'm sorry, I don't see any pending actions to confirm.";
        }
        break;
      }

      case 'cancel_action': {
        // Find the most recent pending alert for this user
        const { data, error } = await supabase
          .from('alert_subscriptions')
          .select('*')
          .eq('phone_number', 'web-user')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const alertId = data[0].id;
          await supabase
            .from('alert_subscriptions')
            .update({ status: 'cancelled' })
            .eq('id', alertId);
          
          finalResponse = `No problem. I have cancelled the alert.`;
        } else {
          finalResponse = "I'm sorry, I don't see any pending actions to cancel.";
        }
        break;
      }

      case 'mandi_price': {
        const { crop, location } = parsedIntent.parameters;
        if (!crop || !location) {
          finalResponse = "I understood you want a price, but I couldn't catch the crop or location. Could you repeat?";
          break;
        }
        fetchedData = await getMockMandiPrice(crop, location);
        if (fetchedData) {
          finalResponse = `The price of ${fetchedData.crop} in ${fetchedData.location} today is ₹${fetchedData.price} per ${fetchedData.unit}.`;
        } else {
          finalResponse = `I couldn't find the price for ${crop} in ${location} today.`;
        }
        break;
      }

      case 'weather': {
        const { location } = parsedIntent.parameters;
        if (!location) {
          finalResponse = "I understood you want the weather, but I couldn't catch the location. Could you repeat?";
          break;
        }
        fetchedData = await getMockWeather(location);
        if (fetchedData) {
          finalResponse = `The weather in ${fetchedData.location} today is ${fetchedData.condition} with a temperature of ${fetchedData.temperature} degrees and a ${fetchedData.precipitation_chance}% chance of rain.`;
        } else {
          finalResponse = `I couldn't find the weather forecast for ${location}.`;
        }
        break;
      }

      case 'govt_scheme': {
        const { topic } = parsedIntent.parameters;
        finalResponse = `I have logged your interest in the government scheme regarding ${topic}. I will find the relevant details and get back to you shortly.`;
        break;
      }

      case 'general_agri': {
        const { question } = parsedIntent.parameters;
        finalResponse = `You asked: "${question}". As an AI, I suggest consulting your local agronomist for specific advice, but generally, maintaining good soil health is key.`;
        break;
      }

      case 'unknown':
      default: {
        finalResponse = "I'm sorry, I couldn't understand what you need. You can ask me about crop prices, weather, government schemes, or set price alerts.";
        break;
      }
    }

    // Log the entire interaction to Supabase Analytics Table
    const { error: logError } = await supabase
      .from('interaction_logs')
      .insert([{
        query,
        intent_category: parsedIntent.category,
        intent_parameters: parsedIntent.parameters,
        response: finalResponse
      }]);

    if (logError) {
      console.error("Failed to log interaction to Supabase:", logError);
    }

    return NextResponse.json({
      intent: parsedIntent,
      data: fetchedData,
      agenticAction,
      response: finalResponse
    });

  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
