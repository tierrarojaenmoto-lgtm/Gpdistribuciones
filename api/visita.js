// api/visita.js  (Vercel Serverless Function)
// Avisa a Slack la primera vez que una IP visita la web.
// Variables de entorno necesarias (en Vercel > Settings > Environment Variables):
//   SLACK_WEBHOOK_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

const crypto = require('crypto');

const BOTS = /bot|crawl|spider|slurp|bing|google|yandex|baidu|duckduck|facebookexternalhit|preview|monitor|uptime|curl|wget|python-requests|headless/i;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();

  const ua = req.headers['user-agent'] || '';
  if (BOTS.test(ua)) return res.status(204).end();

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
             req.socket?.remoteAddress || '';
  if (!ip) return res.status(204).end();

  const { SLACK_WEBHOOK_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env;
  if (!SLACK_WEBHOOK_URL || !UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    console.error('Faltan variables de entorno');
    return res.status(500).end();
  }

  try {
    // Guardamos solo un hash de la IP (mejor para privacidad)
    const key = 'ip:' + crypto.createHash('sha256').update(ip).digest('hex');

    // SET key 1 NX -> devuelve "OK" solo si la clave NO existía (IP nueva)
    const r = await fetch(UPSTASH_REDIS_REST_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
      body: JSON.stringify(['SET', key, '1', 'NX'])
    });
    const { result } = await r.json();
    if (result !== 'OK') return res.status(204).end(); // IP ya vista

    const pais = req.headers['x-vercel-ip-country'] || '?';
    const ciudad = decodeURIComponent(req.headers['x-vercel-ip-city'] || '?');
    const hora = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text:
          `🆕 *Nueva IP en el catálogo*\n` +
          `*IP:* \`${ip}\`\n` +
          `*Ubicación aprox.:* ${ciudad}, ${pais}\n` +
          `*Dispositivo:* ${ua.slice(0, 120)}\n` +
          `*Hora:* ${hora}`
      })
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).end();
  }
};
      
