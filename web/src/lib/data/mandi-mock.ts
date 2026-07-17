export interface MandiPrice {
  crop: string;
  location: string;
  price: number;
  unit: string;
  date: string;
}

const mockData: MandiPrice[] = [
  { crop: 'wheat', location: 'ahmedabad', price: 2450, unit: 'quintal', date: new Date().toISOString() },
  { crop: 'wheat', location: 'surat', price: 2500, unit: 'quintal', date: new Date().toISOString() },
  { crop: 'rice', location: 'ahmedabad', price: 3200, unit: 'quintal', date: new Date().toISOString() },
  { crop: 'rice', location: 'surat', price: 3350, unit: 'quintal', date: new Date().toISOString() },
  { crop: 'cotton', location: 'rajkot', price: 7200, unit: 'quintal', date: new Date().toISOString() },
  { crop: 'groundnut', location: 'jamnagar', price: 5800, unit: 'quintal', date: new Date().toISOString() },
];

export async function getMockMandiPrice(crop: string, location: string): Promise<MandiPrice | null> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const normalizedCrop = crop.toLowerCase().trim();
  const normalizedLocation = location.toLowerCase().trim();

  const result = mockData.find(
    item => item.crop === normalizedCrop && item.location === normalizedLocation
  );

  return result || null;
}
