const url = 'http://localhost:3000/api/telephony-adapter';

async function testTelephony() {
  console.log("Sending simulated phone call request...");
  
  const payload = {
    call_id: "test-call-123",
    transport_type: "vapi",
    caller_number: "+1234567890",
    message: "What is the capital of France?"
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("\n[Telephony Adapter Response]:\n", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error connecting to adapter:", error);
  }
}

testTelephony();
