export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const baseUrl = 'https://gateway.deltaverse.site';
  const path = req.url.replace('/api/gateway', '');
  const url = baseUrl + path;

  try {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'
    };
    if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;

    const response = await fetch(url, {
      method: req.method,
      headers,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}