export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text, voiceId, useSSML } = req.body;
    
    if (!process.env.GOOGLE_CLOUD_API_KEY) {
      return res.status(500).json({ error: 'Google Cloud API key not configured' });
    }
    
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_CLOUD_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: useSSML ? { ssml: text } : { text },
          voice: { languageCode: voiceId?.substring(0, 5) || 'en-US', name: voiceId || 'en-US-Neural2-D' },
          audioConfig: { 
            audioEncoding: 'MP3',
            pitch: 0,
            speakingRate: 1.0
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.error?.message || 'Google TTS API failed' });
    }

    const data = await response.json();
    
    if (!data.audioContent) {
      return res.status(500).json({ error: 'No audio content returned from Google' });
    }
    
    return res.status(200).json({ audioContent: data.audioContent });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
