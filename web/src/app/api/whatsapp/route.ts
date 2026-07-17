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

    // 1. Process Voice Note (if exists)
    if (mediaUrl) {
      console.log('Downloading WhatsApp Voice Note from:', mediaUrl);
      
      // Fetch the audio file from Twilio
      const audioRes = await fetch(mediaUrl);
      const arrayBuffer = await audioRes.arrayBuffer();
      const audioFile = new File([arrayBuffer], 'whatsapp-audio.ogg', { type: 'audio/ogg' });

      // Transcribe with Whisper
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

    // 2. Parse Intent
    const parsedIntent = await parseIntentWithGemini(queryText);
    let finalResponse = '';

    // 3. Dynamic Routing
    switch (parsedIntent.category) {
      case 'set_alert': {
        const { crop, location, condition, target_price } = parsedIntent.parameters;
        if (!crop || !location || !target_price) {
          finalResponse = "I understood you want to set an alert, but I missed some details like the crop, location, or target price. Could you please repeat?";
          break;
        }
        
        await supabase.from('alert_subscriptions').insert([{
          crop,
          location,
          condition: condition || 'above',
          target_price,
          phone_number: sender
        }]);

        finalResponse = `Done! I have set an alert. I will physically call you back as soon as the price of ${crop} in ${location} goes ${condition || 'above'} ₹${target_price}.`;
        break;
      }

      case 'mandi_price': {
        const { crop, location } = parsedIntent.parameters;
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
        const { location } = parsedIntent.parameters;
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
        finalResponse = "I'm sorry, I couldn't understand. You can ask me about crop prices, weather, or set price alerts via voice note or text.";
        break;
      }
    }

    // Log the interaction
    await supabase.from('interaction_logs').insert([{
      query: queryText,
      intent_category: parsedIntent.category,
      intent_parameters: parsedIntent.parameters,
      response: finalResponse,
      phone_number: sender
    }]);

    // 4. Return TwiML to WhatsApp
    twiml.message(finalResponse);
    return new NextResponse(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });

  } catch (error) {
    console.error('Error in WhatsApp webhook:', error);
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message("Sorry, I encountered an internal error processing your request.");
    return new NextResponse(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
  }
}
