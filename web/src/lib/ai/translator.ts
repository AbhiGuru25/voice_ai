import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function translateResponse(englishText: string, targetLanguageCode: string): Promise<string> {
  if (targetLanguageCode === 'en' || !process.env.GROQ_API_KEY) {
    return englishText;
  }

  let languageName = 'Hindi';
  if (targetLanguageCode === 'gu') languageName = 'Gujarati';

  try {
    const prompt = `
      Translate the following English response into natural conversational ${languageName} suitable for an Indian farmer. 
      Keep it short, clear, and exactly matching the original meaning. Do not add conversational filler unless it's a greeting.
      Output ONLY the translated text and nothing else.
      
      English: "${englishText}"
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a translator. Output only the ${languageName} translation, without quotes, backticks, or any markdown.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
    });

    return chatCompletion.choices[0]?.message?.content?.trim() || englishText;
  } catch (error) {
    console.error('Error translating response:', error);
    return englishText; // Fallback to English if translation fails
  }
}
