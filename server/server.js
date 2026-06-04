import http from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "sync-store.json");
const PORT = process.env.PORT || 8787;

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadStore() {
  if (!fs.existsSync(DATA_FILE)) return { spaces: {} };
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { spaces: {} };
  }
}

function saveStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function generateSyncId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[crypto.randomInt(chars.length)];
  }
  return id;
}

function generateToken() {
  return crypto.randomBytes(24).toString("hex");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Sync-Id, X-Sync-Token",
  });
  res.end(json);
}

function authenticate(req) {
  const syncId = req.headers["x-sync-id"];
  const token = req.headers["x-sync-token"];
  if (!syncId || !token) return { error: "缺少同步凭证", status: 401 };

  const store = loadStore();
  const space = store.spaces[syncId];
  if (!space || space.token !== token) {
    return { error: "同步 ID 或密钥无效", status: 403 };
  }
  return { store, space, syncId };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Sync-Id, X-Sync-Token",
    });
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      return send(res, 200, { ok: true, service: "habit-planet-sync", version: "1.0.0" });
    }

    if (req.method === "POST" && url.pathname === "/api/sync/create") {
      const store = loadStore();
      let syncId;
      do { syncId = generateSyncId(); } while (store.spaces[syncId]);
      const token = generateToken();
      store.spaces[syncId] = { token, createdAt: new Date().toISOString(), updatedAt: null, payload: null };
      saveStore(store);
      return send(res, 200, { syncId, token });
    }

    if (req.method === "POST" && url.pathname === "/api/sync/verify") {
      const body = await readBody(req);
      const { syncId, token } = body;
      if (!syncId || !token) return send(res, 400, { error: "请提供 syncId 和 token" });
      const store = loadStore();
      const space = store.spaces[syncId];
      if (!space || space.token !== token) return send(res, 403, { error: "同步 ID 或密钥无效" });
      return send(res, 200, { ok: true, syncId, updatedAt: space.updatedAt, hasData: !!space.payload });
    }

    if (req.method === "GET" && url.pathname === "/api/sync/data") {
      const auth = authenticate(req);
      if (auth.error) return send(res, auth.status, { error: auth.error });
      const { space } = auth;
      if (!space.payload) return send(res, 200, { data: null, updatedAt: null });
      return send(res, 200, {
        data: space.payload.data,
        settings: space.payload.settings,
        updatedAt: space.updatedAt,
        deviceId: space.payload.deviceId,
      });
    }

    if (req.method === "PUT" && url.pathname === "/api/sync/data") {
      const auth = authenticate(req);
      if (auth.error) return send(res, auth.status, { error: auth.error });
      const body = await readBody(req);
      const { data, settings, deviceId } = body;
      if (!data || !Array.isArray(data.habits) || !Array.isArray(data.checkIns)) {
        return send(res, 400, { error: "数据格式无效" });
      }
      const now = new Date().toISOString();
      auth.space.payload = { data, settings: settings || {}, deviceId: deviceId || "unknown" };
      auth.space.updatedAt = now;
      saveStore(auth.store);
      return send(res, 200, { ok: true, updatedAt: now });
    }

    send(res, 404, { error: "Not found" });
  } catch (err) {
    send(res, 500, { error: err.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`习惯星球同步服务运行在 http://localhost:${PORT}`);
});
