import { NextRequest, NextResponse } from 'next/server';
import { getMockMandiPrice } from '@/lib/data/mandi-mock';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const crop = searchParams.get('crop');
    const location = searchParams.get('location');

    if (!crop || !location) {
      return NextResponse.json({ error: 'Crop and location are required' }, { status: 400 });
    }

    const fetchedData = await getMockMandiPrice(crop.toLowerCase(), location.toLowerCase());
    
    if (fetchedData) {
      return NextResponse.json({
        crop: fetchedData.crop,
        location: fetchedData.location,
        current_price: fetchedData.price,
        unit: fetchedData.unit
      });
    } else {
      // Fallback random price if mock data doesn't have it, so n8n can still test logic
      const randomPrice = Math.floor(Math.random() * (3000 - 1500 + 1) + 1500);
      return NextResponse.json({
        crop,
        location,
        current_price: randomPrice,
        unit: 'quintal',
        note: 'Fallback random price generated for testing'
      });
    }

  } catch (error) {
    console.error('Error checking price:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
