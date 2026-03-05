// api/room.js — Upstash Redis ашиглан room үүсгэх/унших
const R = process.env.UPSTASH_REDIS_REST_URL;
const T = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd) {
  const res = await fetch(R, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + T, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  const j = await res.json();
  return j.result;
}

async function get(key) {
  const raw = await redis(['GET', key]);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

async function set(key, val, ex) {
  const args = ['SET', key, JSON.stringify(val)];
  if (ex) args.push('EX', ex);
  return redis(args);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET /api/room?code=TS12-ABC3
  if (req.method === 'GET') {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'code шаардлагатай' });
    const data = await get('room:' + code);
    if (!data) return res.status(404).json({ error: 'Room олдсонгүй' });
    return res.status(200).json(data);
  }

  // POST /api/room — шинэ room хадгалах (24 цаг)
  if (req.method === 'POST') {
    const data = req.body;
    if (!data?.code) return res.status(400).json({ error: 'code шаардлагатай' });
    await set('room:' + data.code, data);
    const rooms = (await get('all_rooms')) || [];
    if (!rooms.includes(data.code)) {
      rooms.unshift(data.code);
      await set('all_rooms', rooms.slice(0, 50));
    }
    return res.status(200).json({ ok: true });
  }

  // DELETE /api/room?code=123456 — room устгах
  if (req.method === 'DELETE') {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'code шаардлагатай' });
    await redis(['DEL', 'room:' + code]);
    const rooms = (await get('all_rooms')) || [];
    const updated = rooms.filter(r => r !== code);
    await set('all_rooms', updated);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
