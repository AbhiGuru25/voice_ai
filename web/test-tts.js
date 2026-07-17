const googleTTS = require('google-tts-api');

async function test() {
  const text = "Done! I have set an alert. I will physically call you back as soon as the price of wheat in ahmedabad goes above ₹2500.";
  try {
    const base64 = await googleTTS.getAudioBase64(text, {
      lang: 'hi',
      slow: false,
      host: 'https://translate.google.com',
      timeout: 10000,
    });
    console.log("Success with 'hi' Base64 length:", base64.length);
  } catch (e) {
    console.error("Error with 'hi':", e.message);
  }

  try {
    const base64 = await googleTTS.getAudioBase64(text, {
      lang: 'en-IN',
      slow: false,
      host: 'https://translate.google.com',
      timeout: 10000,
    });
    console.log("Success with 'en-IN' Base64 length:", base64.length);
  } catch (e) {
    console.error("Error with 'en-IN':", e.message);
  }
}
test();
