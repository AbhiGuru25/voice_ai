import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import Groq from 'groq-sdk';
import { parseIntentWithGemini } from '@/lib/ai/intent-parser';
import { getMockMandiPrice } from '@/lib/data/mandi-mock';
import { getMockWeather } from '@/lib/data/weather-mock';
import { supabase } from '@/lib/data/supabase';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const mediaUrl = data.get('MediaUrl0') as string;
    const bodyText = data.get('Body') as string;
    const sender = data.get('From') as string;

    const twiml = new twilio.twiml.MessagingResponse();
    let queryText = bodyText;

    if (mediaUrl) {
      console.log('Downloading WhatsApp Voice Note from:', mediaUrl);
      const audioRes = await fetch(mediaUrl);
      const arrayBuffer = await audioRes.arrayBuffer();
      const audioFile = new File([arrayBuffer], 'whatsapp-audio.ogg', { type: 'audio/ogg' });

      const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-large-v3",
        response_format: "json",
      });

      queryText = transcription.text;
      console.log('Transcribed WhatsApp audio:', queryText);
    }

    if (!queryText) {
      twiml.message("Please send a text message or a voice note.");
      return new NextResponse(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }

    // --- NEW: UNIFIED PROFILE MEMORY ---
    let userProfile = null;
    const { data: profiles } = await supabase
      .from('farmer_profiles')
      .select('*')
      .eq('phone_number', sender)
      .limit(1);

    if (profiles && profiles.length > 0) {
      userProfile = profiles[0];
    }

    // Parse Intent with Profile Context injected
    const parsedIntent = await parseIntentWithGemini(queryText, userProfile);
    let finalResponse = '';

    // --- NEW: EXECUTION INTENTS ---
    switch (parsedIntent.category) {
      case 'buyer_connect': {
        const crop = parsedIntent.parameters.crop || userProfile?.primary_crop || 'your crop';
        const location = userProfile?.location || 'your area';
        
        await supabase.from('alert_subscriptions').insert([{
          crop: crop, location: location, condition: 'buyer_connect', target_price: 0, status: 'pending', phone_number: sender
        }]);

        finalResponse = `I found 3 verified buyers for ${crop} in ${location} currently offering above market rates. Should I send them your contact number via SMS? Please reply 'Yes' to confirm.`;
        break;
      }

      case 'task_reschedule': {
        const task = parsedIntent.parameters.task || 'fertilizer application';
        const newDay = parsedIntent.parameters.new_day || 'Thursday';
        
        await supabase.from('alert_subscriptions').insert([{
          crop: task, location: newDay, condition: 'reschedule', target_price: 0, status: 'pending', phone_number: sender
        }]);

        finalResponse = `I see heavy rain is expected. I can pause your scheduled ${task} and move it to ${newDay}. Please reply 'Yes' to confirm the schedule change.`;
        break;
      }

      case 'scheme_apply': {
        const topic = parsedIntent.parameters.topic || 'PM-Kisan';
        
        await supabase.from('alert_subscriptions').insert([{
          crop: topic, location: 'govt_scheme', condition: 'apply', target_price: 0, status: 'pending', phone_number: sender
        }]);

        finalResponse = `You are eligible for the ${topic} scheme. I have your Aadhaar details on file. Should I submit the application for you right now? Reply 'Yes' to submit.`;
        break;
      }

      case 'set_alert': {
        const crop = parsedIntent.parameters.crop || userProfile?.primary_crop;
        const location = parsedIntent.parameters.location || userProfile?.location;
        const { condition, target_price } = parsedIntent.parameters;
        
        if (!crop || !location || !target_price) {
          finalResponse = "I understood you want to set an alert, but I missed some details like the crop, location, or target price. Could you please repeat?";
          break;
        }
        
        await supabase.from('alert_subscriptions').insert([{
          crop, location, condition: condition || 'above', target_price, status: 'pending', phone_number: sender
        }]);

        finalResponse = `I am ready to set an alert. I will notify you when the price of ${crop} in ${location} goes ${condition || 'above'} ₹${target_price}. Please reply 'Yes' to confirm.`;
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
            finalResponse = `Application submitted successfully! I will text you the official tracking number shortly.`;
          } else {
            finalResponse = `Confirmed! Your alert for ${pendingAction.crop} is now active.`;
          }
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
        const crop = parsedIntent.parameters.crop || userProfile?.primary_crop;
        const location = parsedIntent.parameters.location || userProfile?.location;
        if (!crop || !location) {
          finalResponse = "I understood you want a price, but I couldn't catch the crop or location. Could you repeat?";
          break;
        }
        const fetchedData = await getMockMandiPrice(crop, location);
        if (fetchedData) {
          finalResponse = `The price of ${fetchedData.crop} in ${fetchedData.location} today is ₹${fetchedData.price} per ${fetchedData.unit}.`;
        } else {
          finalResponse = `I couldn't find the price for ${crop} in ${location} today.`;
        }
        break;
      }

      case 'weather': {
        const location = parsedIntent.parameters.location || userProfile?.location;
        if (!location) {
          finalResponse = "I understood you want the weather, but I missed the location.";
          break;
        }
        const fetchedData = await getMockWeather(location);
        if (fetchedData) {
          finalResponse = `The weather in ${fetchedData.location} today is ${fetchedData.condition}, ${fetchedData.temperature}°C with ${fetchedData.precipitation_chance}% chance of rain.`;
        } else {
          finalResponse = `I couldn't find the weather for ${location}.`;
        }
        break;
      }

      default: {
        finalResponse = `Namaste${userProfile ? ' ' + userProfile.name : ''}. You can ask me about crop prices, weather, or say 'Connect me to a buyer'.`;
        break;
      }
    }

    // --- NEW: TRANSLATE RESPONSE ---
    let translatedResponse = finalResponse;
    if (parsedIntent.language && parsedIntent.language !== 'en') {
      const { translateResponse } = await import('@/lib/ai/translator');
      translatedResponse = await translateResponse(finalResponse, parsedIntent.language);
      console.log(`Translated response from English to ${parsedIntent.language}:`, translatedResponse);
    }

    // Log the interaction
    await supabase.from('interaction_logs').insert([{
      query: queryText,
      intent_category: parsedIntent.category,
      intent_parameters: parsedIntent.parameters,
      response: translatedResponse,
      phone_number: sender
    }]);

    twiml.message(translatedResponse);
    return new NextResponse(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });

  } catch (error) {
    console.error('Error in WhatsApp webhook:', error);
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message("Sorry, I encountered an internal error processing your request.");
    return new NextResponse(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
  }
}
