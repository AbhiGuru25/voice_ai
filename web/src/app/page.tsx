export default function Page() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#000', color: '#00ff00', fontFamily: 'monospace' }}>
      <pre>
        {JSON.stringify({ status: "ok", service: "voice-ai-telephony", message: "Telephony API is running." }, null, 2)}
      </pre>
    </div>
  );
}
