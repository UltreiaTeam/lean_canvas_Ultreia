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

class SupabaseStore {
  constructor(sb, user) { this.sb = sb; this.user = user; this.kind = "supabase"; this.q = makeQueue(); this.owned = new Set(); }
  pid(path) { return path.split("/")[1]; }
  query(path) {
    let q = this.sb.from("docs").select("path,data");
    if (path === "projects") return q.like("path", "projects/%").not("path", "like", "projects/%/%");
    if (isCollection(path)) {
      const n = segs(path) + 1;
      return { n, q: q.eq("project_id", this.pid(path)).like("path", path + "/%") };
    }
    return q.eq("path", path);
  }
  listen(path, cb, onError) {
    let alive = true, timer = null;
    const fetchNow = async () => {
      const built = this.query(path);
      const { data, error } = await (built.q || built);
      if (!alive) return;
      if (error) { onError && onError({ code: "unavailable", message: error.message }); return; }
      const n = built.n;
      const rows = (data || []).filter((r) => !n || segs(r.path) === n);
      if (isCollection(path)) cb(rows.map((r) => ({ id: r.path.split("/").pop(), ...r.data })), { fromCache: false });
      else cb(rows[0] ? { id: rows[0].path.split("/").pop(), ...rows[0].data } : null, { fromCache: false });
    };
    const kick = () => { clearTimeout(timer); timer = setTimeout(fetchNow, 120); };
    const filter = path === "projects" ? undefined : `project_id=eq.${this.pid(path)}`;
    const ch = this.sb.channel("w-" + path + "-" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "*", schema: "public", table: "docs", ...(filter ? { filter } : {}) }, kick)
      .subscribe();
    fetchNow();
    return () => { alive = false; clearTimeout(timer); this.sb.removeChannel(ch); };
  }
  async ensureOwner(pid) {
    if (this.owned.has(pid)) return;
    const { error } = await this.sb.from("project_members").insert({ project_id: pid, user_id: this.user.id, email: (this.user.email || "").toLowerCase(), role: "owner" });
    if (error && error.code !== "23505" && !/row-level security/i.test(error.message)) throw { code: "invalid_argument", message: error.message };
    this.owned.add(pid);
  }
  async write(path, data) {
    if (path.startsWith("projects/") && segs(path) === 2) {
      const { data: existing } = await this.sb.from("docs").select("path").eq("path", path).maybeSingle();
      if (!existing) await this.ensureOwner(this.pid(path));
    }
    const { error } = await this.sb.from("docs").upsert({ path, project_id: this.pid(path), data: clean(data), updated_at: new Date().toISOString() });
    if (error) throw { code: /row-level security|permission/i.test(error.message) ? "invalid_argument" : "unavailable", message: error.message };
  }
  set(path, data) { return this.q(path, () => this.write(path, data)); }
  update(path, data) {
    return this.q(path, async () => {
      const { data: row, error } = await this.sb.from("docs").select("data").eq("path", path).maybeSingle();
      if (error) throw { code: "unavailable", message: error.message };
      if (!row) throw { code: "invalid_argument", message: "no existe" };
      await this.write(path, deepMerge(row.data || {}, clean(data)));
    });
  }
  async add(coll, data) { const id = newId(); await this.set(`${coll}/${id}`, data); return id; }
  remove(path) { return this.q(path, async () => { const { error } = await this.sb.from("docs").delete().eq("path", path); if (error) throw { code: "invalid_argument", message: error.message }; }); }
  // Miembros del proyecto
  async members(pid) { const { data } = await this.sb.from("project_members").select("user_id,email,role").eq("project_id", pid).order("created_at"); return data || []; }
  async removeMember(pid, userId) { const { error } = await this.sb.from("project_members").delete().eq("project_id", pid).eq("user_id", userId); if (error) throw { code: "invalid_argument", message: error.message }; }
  // Invitaciones por link
  async inviteLink(pid) {
    let { data } = await this.sb.from("project_invites").select("token").eq("project_id", pid).order("created_at", { ascending: false }).limit(1);
    let token = data && data[0] && data[0].token;
    if (!token) {
      const r = await this.sb.from("project_invites").insert({ project_id: pid }).select("token").single();
      if (r.error) throw { code: "invalid_argument", message: r.error.message };
      token = r.data.token;
    }
    return location.origin + location.pathname + "#invitar-" + token;
  }
  async resetInvite(pid) {
    const { error } = await this.sb.from("project_invites").delete().eq("project_id", pid);
    if (error) throw { code: "invalid_argument", message: error.message };
    return this.inviteLink(pid);
  }
  async acceptInvite(token) {
    const { data, error } = await this.sb.rpc("accept_invite", { tok: token });
    if (error) throw { code: "invalid_argument", message: error.message };
    return data;
  }
}

// ---------- Supabase: cliente, sesión y coach ----------
let sbClient = null;
export async function supabaseClient() {
  if (sbClient) return sbClient;
  const { SUPABASE_URL, SUPABASE_KEY } = await import("./config.js");
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  if (!globalThis.supabase?.createClient) {
    await new Promise((ok, fail) => { const t = document.createElement("script"); t.src = new URL("../vendor/supabase.js", import.meta.url).href; t.onload = ok; t.onerror = fail; document.head.appendChild(t); });
  }
  sbClient = globalThis.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" } });
  return sbClient;
}

// Adaptador con la misma forma que la capacidad `sample` de Claude: sample.json(prompt, {modelTier, signal})
export function supabaseSample(sb) {
  const call = async (prompt, opts = {}) => {
    const { data, error } = await sb.functions.invoke("coach", { body: { prompt, tier: opts.modelTier || "default" } });
    if (opts.signal?.aborted) throw { code: "cancelled" };
    if (error) {
      let code = "upstream_error";
      try { const b = await error.context.json(); code = b.code || code; } catch {}
      throw { code, message: error.message };
    }
    return { text: data?.text || "", truncated: false };
  };
  const fn = (prompt, opts) => call(prompt, opts);
  fn.json = async (prompt, opts) => {
    const { text } = await call(prompt, opts);
    const t = text.trim();
    const tries = [t, (t.match(/```(?:json)?\s*([\s\S]*?)```/) || [])[1], t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)];
    for (const x of tries) { if (!x) continue; try { return JSON.parse(x); } catch {} }
    throw { code: "invalid_json", text };
  };
  return fn;
}

export async function createStore() {
  const sb = await supabaseClient();
  if (sb) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return { kind: "auth", sb };
    return new SupabaseStore(sb, session.user);
  }
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
