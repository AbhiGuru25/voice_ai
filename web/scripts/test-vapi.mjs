const url = 'http://localhost:3000/api/telephony-adapter';

async function testVapiPayload() {
  const payload = {
    model: "custom",
    messages: [
      { role: "system", "content": "System prompt" },
      { role: "assistant", "content": "Hello." },
      { role: "user", "content": "Hello?" }
    ],
    stream: true // VAPI PROBABLY SENDS THIS!
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vapi-call-id': 'test-123'
      },
      body: JSON.stringify(payload)
    });

    console.log("Status:", response.status);
    console.log("Headers:", response.headers);
    const text = await response.text();
    console.log("Response:", text);
  } catch (error) {
    console.error("Error:", error);
  }
}

testVapiPayload();
