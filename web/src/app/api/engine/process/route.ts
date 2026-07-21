import { NextRequest, NextResponse } from 'next/server';
import { parseIntentWithGemini } from '@/lib/ai/intent-parser';
import { getMockMandiPrice } from '@/lib/data/mandi-mock';
import { getMockWeather } from '@/lib/data/weather-mock';
import { supabase } from '@/lib/data/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body;
    const sender = 'web-user'; // Hardcoded for web demo

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // 1. Inject a Mock Profile for the Web Dashboard Demo
    // This removes the reliance on a real phone number for testing on localhost
    const userProfile = {
      name: 'Ramesh Bhai',
      primary_crop: 'Wheat',
      location: 'Surat',
      land_size_acres: 5.5
    };

    console.log(`Processing query: "${query}" for web user: ${userProfile.name}`);
    
    // 2. Parse Intent with Profile Context injected
    const parsedIntent = await parseIntentWithGemini(query, userProfile);
    console.log('Parsed intent:', parsedIntent);

    let finalResponse = '';
    let fetchedData = null;
    let agenticAction = null;

    // 3. Dynamic Routing based on Category (Unified with WhatsApp/IVR logic)
    switch (parsedIntent.category) {
      case 'buyer_connect': {
        const crop = parsedIntent.parameters.crop || userProfile.primary_crop;
        const location = userProfile.location;
        
        await supabase.from('alert_subscriptions').insert([{
          crop: crop, location: location, condition: 'buyer_connect', target_price: 0, status: 'pending', phone_number: sender
        }]);

        agenticAction = { type: 'buyer_connect', crop, location, condition: 'buyer_connect', target_price: 0, status: 'pending' };
        finalResponse = `I found 3 verified buyers for ${crop} in ${location} currently offering above market rates. Should I send them your contact number via SMS? Please say 'Yes' to confirm.`;
        break;
      }

      case 'task_reschedule': {
        const task = parsedIntent.parameters.task || 'fertilizer application';
        const newDay = parsedIntent.parameters.new_day || 'Thursday';
        
        await supabase.from('alert_subscriptions').insert([{
          crop: task, location: newDay, condition: 'reschedule', target_price: 0, status: 'pending', phone_number: sender
        }]);

        agenticAction = { type: 'task_reschedule', crop: task, location: newDay, condition: 'reschedule', target_price: 0, status: 'pending' };
        finalResponse = `I see heavy rain is expected. I can pause your scheduled ${task} and move it to ${newDay}. Please say 'Yes' to confirm the schedule change.`;
        break;
      }

      case 'scheme_apply': {
        const topic = parsedIntent.parameters.topic || 'PM-Kisan';
        
        await supabase.from('alert_subscriptions').insert([{
          crop: topic, location: 'govt_scheme', condition: 'apply', target_price: 0, status: 'pending', phone_number: sender
        }]);

        agenticAction = { type: 'scheme_apply', crop: topic, location: 'govt_scheme', condition: 'apply', target_price: 0, status: 'pending' };
        finalResponse = `You are eligible for the ${topic} scheme. I have your Aadhaar details on file. Should I submit the application for you right now? Say 'Yes' to submit.`;
        break;
      }

      case 'set_alert': {
        const crop = parsedIntent.parameters.crop || userProfile.primary_crop;
        const location = parsedIntent.parameters.location || userProfile.location;
        const { condition, target_price } = parsedIntent.parameters;
        
        if (!crop || !location || !target_price) {
          finalResponse = "I understood you want to set an alert, but I missed some details. Could you please repeat?";
          break;
        }
        
        await supabase.from('alert_subscriptions').insert([{
          crop, location, condition: condition || 'above', target_price, status: 'pending', phone_number: sender
        }]);

        agenticAction = { type: 'price_monitor', crop, location, condition: condition || 'above', target_price, status: 'pending' };
        finalResponse = `I am ready to set an alert. I will notify you when the price of ${crop} in ${location} goes ${condition || 'above'} ₹${target_price}. Please say 'Yes' to confirm.`;
        break;
      }

      case 'confirm_action': {
        const { data } = await supabase
          .from('alert_subscriptions')
          .select('*')
          .eq('phone_number', sender)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const pendingAction = data[0];
          await supabase.from('alert_subscriptions').update({ status: 'active' }).eq('id', pendingAction.id);
          
          if (pendingAction.condition === 'buyer_connect') {
            finalResponse = `Confirmed! I have sent an SMS with your phone number to 3 local buyers. They will call you shortly.`;
          } else if (pendingAction.condition === 'reschedule') {
            finalResponse = `Confirmed! Your farm schedule has been updated. I will remind you on ${pendingAction.location}.`;
          } else if (pendingAction.condition === 'apply') {
            finalResponse = `Application submitted successfully! I will text you the official tracking number.`;
          } else {
            finalResponse = `Confirmed! Your alert for ${pendingAction.crop} is now active.`;
          }
          agenticAction = { ...pendingAction, status: 'active' };
        } else {
          finalResponse = "I'm sorry, I don't see any pending actions to confirm.";
        }
        break;
      }

      case 'cancel_action': {
        const { data } = await supabase
          .from('alert_subscriptions')
          .select('*')
          .eq('phone_number', sender)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          await supabase.from('alert_subscriptions').update({ status: 'cancelled' }).eq('id', data[0].id);
          finalResponse = `No problem. I have cancelled the action.`;
        } else {
          finalResponse = "I'm sorry, I don't see any pending actions to cancel.";
        }
        break;
      }

      case 'mandi_price': {
        const crop = parsedIntent.parameters.crop || userProfile.primary_crop;
        const location = parsedIntent.parameters.location || userProfile.location;
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
        const location = parsedIntent.parameters.location || userProfile.location;
        if (!location) {
          finalResponse = "I understood you want the weather, but I couldn't catch the location. Could you repeat?";
          break;
        }
        fetchedData = await getMockWeather(location);
        if (fetchedData) {
          finalResponse = `The weather in ${fetchedData.location} today is ${fetchedData.condition}, ${fetchedData.temperature}°C with ${fetchedData.precipitation_chance}% chance of rain.`;
        } else {
          finalResponse = `I couldn't find the weather forecast for ${location}.`;
        }
        break;
      }

      default: {
        finalResponse = `Namaste ${userProfile.name}. You can ask me about crop prices, weather, or say 'Connect me to a buyer'.`;
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
