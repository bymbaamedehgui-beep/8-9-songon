// api/rooms.js — Бүх room жагсаалт
const R = process.env.UPSTASH_REDIS_REST_URL;
const T = process.env.UPSTASH_REDIS_REST_TOKEN;

async function get(key) {
  const res = await fetch(R, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + T, 'Content-Type': 'application/json' },
    body: JSON.stringify(['GET', key])
  });
  if (!res.ok) throw new Error('Upstash HTTP ' + res.status);
  const j = await res.json();
  try { return JSON.parse(j.result); } catch { return j.result || []; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  // Upstash env байхгүй үед 500 биш ойлгомжтой 503 JSON
  if (!R || !T) return res.status(503).json({ error: 'Сервер тохируулагдаагүй байна (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN алга).', code: 'NO_BACKEND' });
  try {
    const rooms = (await get('all_rooms')) || [];
    return res.status(200).json(rooms);
  } catch (e) {
    console.error('api/rooms:', e && e.message);
    return res.status(502).json({ error: 'Өгөгдлийн сантай холбогдож чадсангүй.', code: 'BACKEND_ERROR' });
  }
}
