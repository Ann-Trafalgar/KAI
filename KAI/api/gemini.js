export const config = {
  api: { bodyParser: true }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Support both parsed and raw body
  let message;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    message = body?.message;
  } catch {
    return res.status(400).json({ error: 'Could not parse body' });
  }

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing message field' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not set in environment' });
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: "You are KAI, a friendly smart mobile assistant. Be concise and helpful. Plain sentences only, no markdown or bullet points." }]
          },
          contents: [{ parts: [{ text: message }] }]
        })
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(502).json({ error: 'Gemini failed', detail: data?.error?.message || data });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
      || "I'm not sure about that. Could you rephrase?";

    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(500).json({ error: 'Fetch failed: ' + err.message });
  }
}