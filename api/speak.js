export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text, voiceId, isSSML } = req.body || {};

    const rawText = typeof text === 'string' ? text : '';
    if (!rawText.trim()) return res.status(400).json({ error: 'Missing text' });

    const looksLikeSSML = Boolean(isSSML) || rawText.trim().startsWith('<speak');
    const input = looksLikeSSML ? { ssml: rawText } : { text: rawText };

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_CLOUD_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input,
          voice: {
            languageCode: voiceId?.substring(0, 5) || 'en-US',
            name: voiceId || 'en-US-Neural2-D'
          },
          audioConfig: {
            audioEncoding: 'MP3',
            // Slightly more natural cadence + phone-call texture
            speakingRate: 0.98,
            pitch: 0.0,
            volumeGainDb: 0.0,
            effectsProfileId: ['telephony-class-application']
          }
        })
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.error) {
      const msg = data?.error?.message || data?.error || `TTS failed (${response.status})`;
      return res.status(500).json({ error: msg });
    }

    if (!data?.audioContent) return res.status(500).json({ error: 'TTS did not return audioContent' });

    return res.status(200).json({ audioContent: data.audioContent });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
