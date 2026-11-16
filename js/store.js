// Capa de datos. En el artifact usa la capacidad `db` de Claude (persistente y compartida).
// Fuera de Claude (desarrollo local) cae a localStorage con la misma interfaz.

const segs = (p) => p.split("/").filter(Boolean).length;
const isCollection = (p) => segs(p) % 2 === 1;

export function newId() {
  const a = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  const r = crypto.getRandomValues(new Uint8Array(16));
  for (const b of r) s += a[b % a.length];
  return s;
}

// Serializa escrituras por documento: una a la vez, como pide la capacidad db.
function makeQueue() {
  const chains = new Map();
  return (path, fn) => {
    const prev = chains.get(path) || Promise.resolve();
    const next = prev.catch(() => {}).then(fn);
    chains.set(path, next);
    next.finally(() => { if (chains.get(path) === next) chains.delete(path); });
    return next;
  };
}

class CloudStore {
  constructor(db) { this.db = db; this.kind = "cloud"; this.q = makeQueue(); }
  listen(path, cb, onError) {
    const done = (snap) => cb(isCollection(path)
      ? snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      : (snap.exists ? { id: snap.id, ...snap.data() } : null), { fromCache: snap.metadata?.fromCache });
    const ref = isCollection(path) ? this.db.collection(path) : this.db.doc(path);
    return ref.onSnapshot(done, (e) => onError && onError(e));
  }
  set(path, data) { return this.q(path, () => this.db.doc(path).set(clean(data))); }
  update(path, data) { return this.q(path, () => this.db.doc(path).update(clean(data))); }
  async add(coll, data) { const id = newId(); await this.set(`${coll}/${id}`, data); return id; }
  remove(path) { return this.q(path, () => this.db.doc(path).delete()); }
}

class LocalStore {
  constructor() {
    this.kind = "local";
    this.key = "lcp-store-v1";
    this.listeners = new Set();
    try { this.data = JSON.parse(localStorage.getItem(this.key) || "{}"); } catch { this.data = {}; }
  }
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch {} this.emit(); }
  emit() { for (const l of this.listeners) l.fire(); }
  read(path) {
    if (isCollection(path)) {
      const n = segs(path);
      return Object.entries(this.data)
        .filter(([k]) => k.startsWith(path + "/") && segs(k) === n + 1)
        .map(([k, v]) => ({ id: k.split("/").pop(), ...v }));
    }
    const v = this.data[path];
    return v ? { id: path.split("/").pop(), ...v } : null;
  }
  listen(path, cb) {
    const l = { fire: () => cb(this.read(path), { fromCache: false }) };
    this.listeners.add(l);
    setTimeout(l.fire, 0);
    return () => this.listeners.delete(l);
  }
  async set(path, data) { this.data[path] = clean(data); this.save(); }
  async update(path, data) {
    if (!this.data[path]) throw { code: "invalid_argument", message: "no existe" };
    this.data[path] = deepMerge(this.data[path], clean(data)); this.save();
  }
  async add(coll, data) { const id = newId(); await this.set(`${coll}/${id}`, data); return id; }
  async remove(path) { delete this.data[path]; this.save(); }
}

function clean(o) { return JSON.parse(JSON.stringify(o)); }
function deepMerge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k]) ? deepMerge(a[k], v) : v;
  }
  return out;
}

export async function createStore() {
  const c = globalThis.claude;
  if (c && typeof c.use === "function") {
    try {
      const db = await c.use("db");
      if (db) return new CloudStore(db);
    } catch {}
    return null; // dentro de Claude pero sin db: la app muestra el estado sin acceso
  }
  return new LocalStore();
}

export async function getCapability(name) {
  const c = globalThis.claude;
  if (!c || typeof c.use !== "function") return null;
  try { return await c.use(name); } catch { return null; }
}
