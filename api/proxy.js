export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url parameter required' });

  let targetUrl;
  try { targetUrl = decodeURIComponent(url); }
  catch { return res.status(400).json({ error: 'Invalid URL' }); }

  const allowedDomains = ['studyuk.site', 'api.penpencil.co', 'videos.penpencil.co', 'd1d34p8vz63oiq.cloudfront.net', 'pw.live', 'akamaized.net', 'cloudfront.net'];
  const urlObj = new URL(targetUrl);
  if (!allowedDomains.some(d => urlObj.hostname.includes(d))) {
    return res.status(403).json({ error: 'Domain not allowed' });
  }

  try {
    const headers = { ...req.headers };
    delete headers.host;
    
    const response = await fetch(targetUrl, { method: req.method, headers, body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined });
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    if (targetUrl.includes('.m3u8') || contentType.includes('mpegurl')) {
      let text = await response.text();
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
      const proxyBase = '/api/proxy?url=';
      const cleanBaseUrl = baseUrl.split('?')[0];
      
      text = text.replace(/^(?!#)([^\r\n]+)$/gm, (line) => {
        line = line.trim();
        if (!line || line.startsWith('#')) return line;
        let segmentUrl = line.startsWith('http') ? line : cleanBaseUrl + line;
        return proxyBase + encodeURIComponent(segmentUrl + (segmentUrl.includes('?')?'&':'?') + '_cb=' + Date.now());
      });
      
      text = text.replace(/URI="([^"]+)"/g, (match, uri) => {
        let keyUrl = uri.startsWith('http') ? uri : cleanBaseUrl + uri;
        return `URI="${proxyBase + encodeURIComponent(keyUrl)}"`;
      });
      
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache');
      return res.status(200).send(text);
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    const buffer = await response.arrayBuffer();
    return res.status(200).send(Buffer.from(buffer));
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}