export interface WeatherData {
  location: string;
  condition: string;
  temperature: number;
  precipitation_chance: number;
}

const mockWeather: Record<string, WeatherData> = {
  'surat': { location: 'Surat', condition: 'Sunny', temperature: 34, precipitation_chance: 10 },
  'ahmedabad': { location: 'Ahmedabad', condition: 'Partly Cloudy', temperature: 36, precipitation_chance: 20 },
  'rajkot': { location: 'Rajkot', condition: 'Clear', temperature: 38, precipitation_chance: 5 },
  'jamnagar': { location: 'Jamnagar', condition: 'Rain', temperature: 29, precipitation_chance: 80 },
};

export async function getMockWeather(location: string): Promise<WeatherData | null> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const normalizedLocation = location.toLowerCase().trim();
  return mockWeather[normalizedLocation] || null;
}
