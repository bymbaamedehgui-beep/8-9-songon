// api/score.js — Оноо хадгалах / унших / устгах
const R = process.env.UPSTASH_REDIS_REST_URL;
const T = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd) {
  const res = await fetch(R, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + T, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  if (!res.ok) throw new Error('Upstash HTTP ' + res.status);
  const j = await res.json();
  return j.result;
}

async function get(key) {
  const raw = await redis(['GET', key]);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

async function set(key, val) {
  return redis(['SET', key, JSON.stringify(val)]);
}

// Upstash env байхгүй / холбогдож чадаагүй үед 500 (FUNCTION_INVOCATION_FAILED) биш ойлгомжтой JSON буцаана.
const NO_BACKEND = { error: 'Сервер тохируулагдаагүй байна (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN алга). Оноо хадгалагдахгүй.', code: 'NO_BACKEND' };

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!R || !T) return res.status(503).json(NO_BACKEND);
  try {
    return await route(req, res);
  } catch (e) {
    console.error('api/score:', e && e.message);
    return res.status(502).json({ error: 'Өгөгдлийн сантай холбогдож чадсангүй. Түр хүлээгээд дахин оролдоно уу.', code: 'BACKEND_ERROR' });
  }
};

async function route(req, res) {
  // GET /api/score?code=TS12-ABC3 → тухайн room-ын бүх оноо
  if (req.method === 'GET') {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'code шаардлагатай' });
    const scores = (await get('scores:' + code)) || [];
    return res.status(200).json(scores);
  }

  // POST /api/score — оноо хадгалах
  if (req.method === 'POST') {
    const { code, name, score, shots, correct, time, ts } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'code, name шаардлагатай' });

    // Оноо хадгалах
    const scores = (await get('scores:' + code)) || [];
    const idx = scores.findIndex(r => r.name === name);
    const rec = { name, score, shots, correct, time, ts,
                  acc: shots > 0 ? Math.round(correct/shots*100) : 0 };
    if (idx >= 0) scores[idx] = rec; else scores.push(rec);
    scores.sort((a, b) => b.score - a.score);
    await set('scores:' + code, scores);

    // Room дотор тоглосон хүний тоог шинэчлэх
    const room = (await get('room:' + code));
    if (room) {
      room.playerCount = scores.length;
      room.lastActivity = Date.now();
      await set('room:' + code, room);
    }

    return res.status(200).json({ ok: true, rank: scores.findIndex(r => r.name === name) + 1 });
  }

  // DELETE /api/score?code=TS12-ABC3
  if (req.method === 'DELETE') {
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'code шаардлагатай' });
    await redis(['DEL', 'scores:' + code]);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
