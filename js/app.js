import { CELLS, RISKS, STATUSES, LEVELS, DECISIONS, STAGES, FICHAS, BUILD_ORDER, MINDSET } from "./content.js";
import { createStore, getCapability, newId, supabaseSample } from "./store.js";
import { MODES, runCoach, coachErrorCopy, HIDE_CODES } from "./coach.js";
import { seedExample } from "./seed.js";

// ---------- utilidades ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nl = (s) => esc(s).replace(/\n/g, "<br>");
const fmtDate = (t) => (t ? new Date(t).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }) : "");
const risk = (h) => (Number(h.importance) || 0) * (Number(h.uncertainty) || 0);
const chip = (st) => { const s = STATUSES[st] || STATUSES.pendiente; return `<span class="chip c-${s.color}">${s.label}</span>`; };
const ICON = {
  home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  canvas: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 15h18M9 4v11M15 4v11M12 4v11"/>',
  flask: '<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  test: '<path d="M4 4h16v6H4zM4 14h16v6H4z"/><path d="M8 7h.01M8 17h.01"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6L20 8"/><path d="M20 3v5h-5"/>',
  flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
  folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
};
const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n] || ""}</svg>`;

// ---------- estado ----------
const S = {
  store: null, uid: null, sample: null, downloads: null, coachHidden: false,
  projects: null, projectsErr: null,
  pid: null, P: null, unsubs: [], unsubProjects: null, slow: false,
  view: "inicio", sub: null, versionView: null,
  coach: {}, // clave -> {state:'loading'|'done'|'error', result, msg, ctl}
  modal: null, pendingRender: false,
};

function toast(msg) {
  let t = $(".toast"); if (t) t.remove();
  t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
}

// ---------- rutas: #inicio · #p-<id> · #p-<id>-<vista> · #p-<id>-ficha-<clave> ----------
function parseRoute() {
  const h = location.hash.slice(1);
  const m = h.match(/^p-([a-z0-9]+)(?:-([a-z]+))?(?:-([a-z]+))?$/);
  if (!m) return { pid: null, view: "inicio" };
  return { pid: m[1], view: m[2] || "resumen", sub: m[3] || null };
}
const href = (view, sub) => `#p-${S.pid}${view && view !== "resumen" ? "-" + view : ""}${sub ? "-" + sub : ""}`;
function go(view, sub) { location.hash = href(view, sub); }

// ---------- datos del proyecto ----------
function closeProject() { S.unsubs.forEach((u) => u && u()); S.unsubs = []; S.P = null; S.pid = null; S.versionView = null; }

function openProject(pid) {
  closeProject();
  S.pid = pid;
  const P = { project: undefined, versions: null, hypotheses: null, experiments: null, learnings: null, changelog: null };
  S.P = P; S.slow = false;
  const timer = setTimeout(() => { S.slow = true; render(); }, 10000);
  const base = `projects/${pid}`;
  const onErr = (e) => { clearTimeout(timer); P.error = e?.code || "unavailable"; render(); };
  const sub = (key, path) => S.unsubs.push(S.store.listen(path, (val, meta) => {
    P[key] = val; if (!meta?.fromCache) clearTimeout(timer); S.slow = false; scheduleRender();
  }, onErr));
  sub("project", base);
  sub("versions", `${base}/versions`);
  sub("hypotheses", `${base}/hypotheses`);
  sub("experiments", `${base}/experiments`);
  sub("learnings", `${base}/learnings`);
  sub("changelog", `${base}/changelog`);
}

const ready = () => S.P && S.P.project !== undefined && S.P.versions && S.P.hypotheses && S.P.experiments && S.P.learnings && S.P.changelog;
const versions = () => [...(S.P.versions || [])].sort((a, b) => a.n - b.n);
const currentVersion = () => versions().find((v) => v.id === S.P.project?.currentVersion) || versions().at(-1);
const shownVersion = () => versions().find((v) => v.id === S.versionView) || currentVersion();
const hyps = () => [...(S.P.hypotheses || [])].sort((a, b) => String(a.code).localeCompare(String(b.code)));
const exps = () => [...(S.P.experiments || [])].sort((a, b) => String(a.code).localeCompare(String(b.code)));
const hypById = (id) => (S.P.hypotheses || []).find((h) => h.id === id);
const learningFor = (eid) => (S.P.learnings || []).find((l) => l.experimentId === eid);
const blocks = () => currentVersion()?.blocks || {};
const path = (...p) => ["projects", S.pid, ...p].join("/");
async function touch() { try { await S.store.update(path(), { updatedAt: Date.now() }); } catch {} }

async function save(fn, okMsg) {
  try { await fn(); if (okMsg) toast(okMsg); touch(); }
  catch (e) {
    if (e?.code === "invalid_argument") toast("No tenés permiso para editar este proyecto.");
    else if (e?.code === "quota_exceeded") toast("Se alcanzó el límite de almacenamiento del proyecto.");
    else toast("No se pudo guardar. Probá de nuevo.");
  }
}

// ---------- progreso ----------
function fichaFilled(key) { const b = blocks(); return CELLS.filter((c) => c.ficha === key).every((c) => (b[c.key] || "").trim()); }
function progress() {
  const p = S.P.project || {};
  const H = hyps(), E = exps(), L = S.P.learnings || [];
  const filled = Object.keys(FICHAS).filter(fichaFilled).length;
  const done = {
    mindset: !!(p.idea || "").trim(),
    bloques: filled === 9,
    canvas: filled === 9 && H.length >= 5,
    hipotesis: H.length >= 5 && E.some((e) => e.committed),
    aprendizajes: L.length > 0,
    plan: (p.plan?.phases || []).filter((ph) => (ph.gate || "").trim()).length >= 3,
  };
  const current = STAGES.find((s) => !done[s.key])?.key || "plan";
  return { done, current, filled, count: Object.values(done).filter(Boolean).length };
}

// ---------- render ----------
function scheduleRender() {
  const a = document.activeElement;
  if (a && a.matches("input,textarea,select") && a.closest("main,.modal")) { S.pendingRender = true; return; }
  render();
}
document.addEventListener("focusout", () => setTimeout(() => {
  if (!S.pendingRender) return;
  const a = document.activeElement;
  if (a && a.matches("input,textarea,select") && a.closest("main,.modal")) return;
  S.pendingRender = false; render();
}, 0));

function render() {
  const root = $("#app");
  if (S.store?.kind === "auth") { root.innerHTML = loginView(); return; }
  if (!S.store) { root.innerHTML = `<div class="loading">${S.storeFailed ? "No se pudo conectar con el servidor. Revisá tu conexión y recargá la página." : "Cargando…"}</div>`; return; }
  const scrollY = window.scrollY;
  root.innerHTML = S.pid ? projectShell() : projectsView();
  renderModal();
  autosize();
  window.scrollTo(0, scrollY);
}
function autosize(scope = document) { scope.querySelectorAll('textarea').forEach((t) => { if (CSS.supports?.('field-sizing', 'content')) return; t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; }); }
document.addEventListener('input', (e) => { if (e.target.tagName === 'TEXTAREA' && !CSS.supports?.('field-sizing', 'content')) { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 2 + 'px'; } });

function loginView() {
  const signup = S.authMode === "signup";
  const invited = /^#invitar-/.test(location.hash);
  return `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px"><div class="card stack" style="max-width:440px;width:100%;padding:32px">
  <div class="brand" style="padding:0"><b>Lean Canvas</b><span>Playbook · Ultreia</span></div>
  <h1 style="font-size:30px;margin:8px 0 0">Convertí una idea en decisiones respaldadas por evidencia</h1>
  ${invited ? `<div class="banner c-evidencia">Te invitaron a un proyecto. ${signup ? "Creá tu cuenta" : "Entrá o creá tu cuenta"} y lo vas a ver en tu lista.</div>` : ""}
  <p class="muted" style="margin:0">${signup ? "Creá tu cuenta con tu mail y una contraseña de al menos 8 caracteres." : "Entrá con tu mail y tu contraseña."}</p>
  <form class="stack" data-form="login"><label class="f">Mail<input type="email" name="email" required autocomplete="email" placeholder="nombre@empresa.com"></label>
  <label class="f">Contraseña<input type="password" name="password" required minlength="8" autocomplete="${signup ? "new-password" : "current-password"}"></label>
  <button class="btn primary" type="submit">${signup ? "Crear cuenta" : "Entrar"}</button></form>
  ${S.loginError ? `<div class="banner c-decision">${esc(S.loginError)}</div>` : ""}
  <span class="small muted">${signup ? `¿Ya tenés cuenta? <a href="#" data-act="auth-mode" data-mode="login">Entrá</a>` : `¿Primera vez? <a href="#" data-act="auth-mode" data-mode="signup">Creá tu cuenta</a>`}</span></div></div>`;
}

function sidebar() {
  const pr = ready() ? progress() : null;
  const item = (view, label, ic, num) => `<a class="nav ${S.view === view ? "on" : ""}" href="${href(view)}">${icon(ic)}<span>${label}</span>${num ? `<span class="num">${num}</span>` : ""}</a>`;
  const H = ready() ? hyps() : [];
  const val = H.filter((h) => h.status === "validada").length;
  return `<nav class="side" aria-label="Navegación del playbook">
    <div class="brand"><b>Lean Canvas</b><span>Playbook · Ultreia</span></div>
    <a class="nav" href="#inicio">${icon("folder")}<span>Mis proyectos</span></a>
    ${item("resumen", "Inicio del proyecto", "home")}
    <div class="group">Recorrido</div>
    ${item("mindset", "Mindset", "compass", "01")}
    ${item("bloques", "Los 9 bloques", "grid", "02")}
    ${item("canvas", "Construcción", "canvas", "03")}
    ${item("hipotesis", "Validación", "flask", "04")}
    ${item("experimentos", "Experimentos", "test", "")}
    ${item("aprendizajes", "Iteración", "refresh", "05")}
    ${item("plan", "Plan de acción", "flag", "06")}
    ${S.store.kind === "supabase" ? `<button class="nav" data-act="share">${icon("folder")}<span>Compartir proyecto</span></button>` : ""}
    <button class="nav" data-act="delete-project" style="color:var(--decision)">${icon("trash")}<span>Eliminar proyecto</span></button>
    <div class="spacer"></div>
    ${S.store.kind === "supabase" ? `<div class="small muted" style="padding:8px 10px">${esc(S.email || "")} · <a href="#" data-act="logout">Salir</a></div>` : ""}
    ${ready() && S.P.project ? `<div class="status-card"><b>${esc(S.P.project.name)} · ${esc(currentVersion()?.label || "v0")}</b>${H.length} hipótesis · ${val} validadas<div class="bar"><i style="width:${pr ? Math.round((pr.count / 6) * 100) : 0}%"></i></div></div>` : ""}
  </nav>`;
}

function projectShell() {
  let body;
  if (S.P?.error === "revoked") body = `<div class="empty">Ya no tenés acceso a este proyecto.</div>`;
  else if (S.P?.error && !ready()) body = `<div class="empty">No se pudieron cargar los datos del proyecto. Recargá la página para reintentar.</div>`;
  else if (!ready()) body = `<div class="loading">${S.slow ? "No se pudieron cargar los datos todavía. Revisá tu conexión; se reintenta solo." : "Cargando proyecto…"}</div>`;
  else if (S.P.project === null) body = `<div class="empty"><h2>Proyecto no encontrado</h2><p>Puede haber sido archivado o no tenés acceso.</p><a class="btn" href="#inicio">Ver mis proyectos</a></div>`;
  else body = ({ resumen: viewResumen, mindset: viewMindset, bloques: viewBloques, ficha: viewFicha, canvas: viewCanvas, hipotesis: viewHipotesis, experimentos: viewExperimentos, aprendizajes: viewAprendizajes, plan: viewPlan }[S.view] || viewResumen)();
  return `<div class="app">${sidebar()}<main id="main" tabindex="-1">${body}</main></div>`;
}

// ---------- lista de proyectos ----------
function projectsView() {
  const list = (S.projects || []).filter((p) => !p.archived).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const body = S.projectsErr ? `<div class="empty">No se pudieron cargar los proyectos.</div>`
    : S.projects === null ? `<div class="loading">Cargando proyectos…</div>`
    : list.length === 0 ? `<div class="empty"><h2>Todavía no hay proyectos</h2><p>Creá uno con tu idea, o abrí el ejemplo TurnoClaro para ver el método aplicado de punta a punta.</p><div class="btns" style="justify-content:center"><button class="btn primary" data-act="new-project">Nuevo proyecto</button><button class="btn" data-act="seed">Abrir el ejemplo TurnoClaro</button></div></div>`
    : `<div class="grid3">${list.map((p) => `<a class="card ficha-card" href="#p-${p.id}" style="text-decoration:none;color:inherit">
        <span class="kicker">${p.example ? "Ejemplo · datos simulados" : "Proyecto"}</span>
        <span class="name">${esc(p.name)}</span><span class="muted small">${esc((p.idea || "Sin idea formulada todavía").slice(0, 160))}</span>
        <span class="small muted" style="margin-top:auto">Actualizado ${fmtDate(p.updatedAt)}</span></a>`).join("")}</div>`;
  return `<div class="app"><nav class="side"><div class="brand"><b>Lean Canvas</b><span>Playbook · Ultreia</span></div><a class="nav on" href="#inicio">${icon("folder")}<span>Mis proyectos</span></a><div class="spacer"></div>${S.store.kind === "supabase" ? `<div class="small muted" style="padding:8px 10px">${esc(S.email || "")} · <a href="#" data-act="logout">Salir</a></div>` : ""}<div class="status-card"><b>Cómo funciona</b>Cada proyecto guarda su Canvas con versiones, hipótesis, experimentos y aprendizajes. ${S.store.kind === "local" ? "Modo local: los datos quedan solo en este navegador." : S.store.kind === "supabase" ? "Cada proyecto lo ven solo las personas que invitás." : "Los datos se comparten con tu equipo."}</div></nav>
  <main><div class="head"><div><span class="kicker">Playbook metodológico · 6 etapas</span><h1>Convertí una idea en decisiones respaldadas por evidencia</h1><p class="lead">El Lean Canvas es el medio, no el entregable. Construí tu modelo, cuestioná cada supuesto y terminá con experimentos, responsables y fechas.</p></div>
  ${list.length ? `<div class="btns"><button class="btn" data-act="seed">Agregar el ejemplo TurnoClaro</button><button class="btn primary" data-act="new-project">Nuevo proyecto</button></div>` : ""}</div>${body}</main></div>`;
}

// ---------- vistas ----------
function viewResumen() {
  const p = S.P.project, pr = progress(), H = hyps();
  const open = H.filter((h) => !["validada", "invalidada"].includes(h.status)).sort((a, b) => risk(b) - risk(a));
  const top = open[0];
  const running = exps().find((e) => e.committed && !learningFor(e.id));
  const stageCard = (s, i) => {
    const st = pr.done[s.key] ? "done" : s.key === pr.current ? "now" : "todo";
    return `<a class="stage ${st === "now" ? "now" : ""}" href="${href(s.key)}" style="text-decoration:none;color:inherit"><span class="kicker">${s.n} · ${st === "done" ? "Completa" : st === "now" ? "En curso" : "Pendiente"}</span><b>${s.name}</b><span class="muted small">${s.q}</span></a>`;
  };
  const focus = (cls, k, title, meta, link) => `<a class="card" href="${link}" style="text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:4px"><span class="kicker" style="color:var(--${cls})">${k}</span><b>${title}</b><span class="muted small">${meta}</span></a>`;
  return `<div class="head"><div><span class="kicker">${p.example ? "Ejemplo · datos simulados" : "Proyecto"}</span><h1>${esc(p.name)}</h1><p class="lead">${esc(p.idea || "Todavía no formulaste la idea. Empezá por la Etapa 1.")}</p></div>
    <div class="btns"><a class="btn" href="${href("canvas")}">Ver el Canvas</a><a class="btn primary" href="${href(pr.current)}">Continuar: ${STAGES.find((s) => s.key === pr.current).name} →</a></div></div>
  <div class="head" style="margin-bottom:12px"><h2 style="margin:0">El recorrido</h2><span class="muted small">${pr.count} de 6 etapas completas</span></div>
  <div class="stages">${STAGES.map(stageCard).join("")}</div>
  <div class="row" style="margin-top:20px">
    ${focus("hipotesis", "Hipótesis más riesgosa", top ? `${esc(top.code)} · ${esc(top.text)}` : "Sin hipótesis abiertas", top ? `Riesgo ${risk(top)} · ${STATUSES[top.status]?.label}` : "Registrá hipótesis en la Etapa 4", href("hipotesis"))}
    ${focus("ejercicio", "Experimento en curso", running ? `${esc(running.code)} · ${esc(running.test)}` : "Ninguno comprometido", running ? `Criterio: ${esc(running.criteria)}` : "Diseñá uno para tu hipótesis más riesgosa", href("experimentos"))}
    ${focus("decision", "Próxima revisión", p.plan?.nextReview ? fmtDate(p.plan.nextReview + "T12:00") : "Sin fecha", "Canvas, tablero y registro de cambios a la vista", href("plan"))}
  </div>`;
}

function viewMindset() {
  const p = S.P.project, ms = p.mindset || {};
  return `<span class="kicker">Etapa 1 · Mindset</span><h1>${MINDSET.title}</h1><p class="lead">${MINDSET.lead}</p>
  <div class="card stack"><div class="cycle">${MINDSET.cycle.map(([n, s, c], i) => `<div class="s c-${c}"><b>${n}</b><span class="small">${s}</span></div>${i < 5 ? "→" : ""}`).join("")}</div>
  <span class="small muted">↩ La decisión vuelve a Hipótesis, no a Idea: se ajusta el modelo, no se empieza de cero.</span></div>
  <div class="layout-rail" style="margin-top:24px"><div class="stack">
    <div class="card stack"><span class="tag" style="align-self:flex-start">Ejercicio · 10 min</span><h3>Tu idea en una oración</h3>
      <label class="f">Ayudamos a [quién] a resolver [qué problema] mediante [cómo]<textarea data-field="idea" placeholder="Ayudamos a … a … mediante …">${esc(p.idea || "")}</textarea></label>
      <span class="small muted">Marcá lo que ya verificaste con clientes reales. Lo que no marques es tu primera lista de hipótesis.</span>
      ${["quien", "problema", "como"].map((k, i) => `<label class="check"><input type="checkbox" data-mindset="${k}" ${ms[k] ? "checked" : ""}> ${["El “quién” está verificado", "El problema está verificado", "El “cómo” está verificado"][i]}</label>`).join("")}
    </div>
    <table class="t"><thead><tr><th>Business Model Canvas</th><th>Lean Canvas</th><th>Por qué el cambio</th></tr></thead><tbody>${MINDSET.versus.map(([a, b, w]) => `<tr><td class="muted"><s>${a}</s></td><td><b>${b}</b></td><td class="muted">${w}</td></tr>`).join("")}</tbody></table>
    <span class="small muted">Cambios introducidos por Ash Maurya sobre el canvas de Osterwalder <span class="tag">Maurya</span></span>
  </div>
  <div class="card soft c-decision stack" style="color:var(--ink)"><h3 style="color:var(--decision)">Errores frecuentes</h3>${MINDSET.errors.map(([e, a]) => `<div><b class="small">${e}</b><div class="small muted">Antídoto: ${a}</div></div>`).join("")}</div></div>`;
}

function viewBloques() {
  const cl = S.P.project.checklists || {};
  const order = BUILD_ORDER;
  return `<span class="kicker">Etapa 2 · Los 9 bloques</span><h1>Nueve fichas, una misma estructura</h1>
  <p class="lead">Cada ficha recorre concepto, preguntas poderosas, cómo completarlo, ejemplo, checklist, ejercicio y conexión con la validación. Están ordenadas como conviene construirlas: primero el cliente y su problema.</p>
  <div class="grid3">${order.map((k) => { const f = FICHAS[k]; const items = cl[k] || {}; const n = f.checklist.filter((_, i) => items[i]).length; const filled = fichaFilled(k);
    return `<a class="card ficha-card" href="${href("ficha", k)}" style="text-decoration:none;color:inherit"><div style="display:flex;justify-content:space-between"><span class="kicker">Ficha ${f.num}</span><span class="tag">Riesgo ${RISKS[f.risk]}</span></div><span class="name">${f.name}</span><span class="muted small">${f.q}</span>
    <span class="small" style="margin-top:auto;color:${filled ? "var(--evidencia)" : "var(--ink-3)"}">${filled ? "● Bloque completo" : "○ Bloque vacío"} · checklist ${n}/${f.checklist.length}</span></a>`; }).join("")}</div>`;
}

function blockEditor(key, readonly) {
  const b = currentVersion()?.blocks || {};
  return CELLS.filter((c) => c.ficha === key).map((c) => `<label class="f">${c.name}<small>${c.hint}</small><textarea rows="4" data-block="${c.key}" ${readonly ? "readonly" : ""}>${esc(b[c.key] || "")}</textarea></label>`).join("");
}

function viewFicha() {
  const key = FICHAS[S.sub] ? S.sub : "problema";
  const f = FICHAS[key], i = BUILD_ORDER.indexOf(key);
  const prev = BUILD_ORDER[i - 1], next = BUILD_ORDER[i + 1];
  const items = (S.P.project.checklists || {})[key] || {};
  const relatedH = hyps().filter((h) => h.block === key);
  return `<span class="kicker"><a href="${href("bloques")}">Etapa 2 · Los 9 bloques</a> / Ficha ${f.num}</span>
  <div class="head"><div><div class="btns" style="margin:8px 0"><span class="tag">${f.origin}</span><span class="tag">Riesgo de ${RISKS[f.risk].toLowerCase()}</span></div><h1>${f.name}</h1><p class="lead" style="margin:0">${f.q}</p></div>
  <div class="btns">${prev ? `<a class="btn" href="${href("ficha", prev)}">← ${FICHAS[prev].name}</a>` : `<a class="btn" href="${href("bloques")}">← Vista general</a>`}${next ? `<a class="btn primary" href="${href("ficha", next)}">${FICHAS[next].name} →</a>` : `<a class="btn primary" href="${href("canvas")}">Ver el Canvas →</a>`}</div></div>
  <div class="layout-rail"><div class="stack">
    <div class="card stack"><span class="kicker">Tu bloque · ${esc(currentVersion()?.label || "v0")}</span>${blockEditor(key, false)}
      <div class="btns">${coachButton("bloque", key)}<span class="small muted">Se guarda al salir del campo.</span></div>${coachPanel("bloque:" + key)}</div>
    <div class="card soft c-concepto" style="color:var(--ink)"><span class="kicker" style="color:var(--concepto)">A · Concepto</span><p style="margin:6px 0 0">${f.concept}</p></div>
    <h3 style="margin-top:8px">B · Preguntas poderosas</h3><div class="grid2">${f.questions.map(([q, a]) => `<div class="qcard"><span class="chip c-hipotesis" style="align-self:flex-start">Ataca: ${esc(a)}</span><span class="q">${esc(q)}</span></div>`).join("")}</div>
    <div class="card"><h3>C · Cómo completarlo</h3><ol style="margin:0;padding-left:20px">${f.steps.map((s) => `<li>${s}</li>`).join("")}</ol></div>
    <div class="card soft c-ejemplo stack" style="color:var(--ink)"><span class="chip c-ejemplo" style="background:#fff;align-self:flex-start">D · Ejemplo · TurnoClaro</span><div class="row"><div class="card"><span class="small" style="color:var(--decision)">✕ DÉBIL</span><p style="margin:6px 0 0">${f.example.weak}</p></div><div class="card"><span class="small" style="color:var(--evidencia)">✓ FUERTE</span><p style="margin:6px 0 0">${f.example.strong}</p></div></div><span class="small muted">${f.example.why}</span></div>
  </div>
  <div class="stack">
    <div class="card stack"><h3 style="margin:0">F · Checklist de calidad</h3>${f.checklist.map((c, j) => `<label class="check"><input type="checkbox" data-check="${key}:${j}" ${items[j] ? "checked" : ""}> ${c}</label>`).join("")}</div>
    <div class="card soft c-hipotesis stack" style="color:var(--ink)"><span class="kicker" style="color:var(--hipotesis)">H · Conexión con la validación</span><span>“${esc(f.hyp)}”</span><span class="small muted">${esc(f.experiment)}</span>
      <button class="btn sm" data-act="new-hyp" data-block="${key}">Crear hipótesis de este bloque</button>
      ${relatedH.length ? `<span class="small">${relatedH.map((h) => `<b class="code">${esc(h.code)}</b> ${chip(h.status)}`).join(" ")}</span>` : ""}</div>
    <div class="card soft c-ejercicio stack" style="color:var(--ink)"><span class="kicker" style="color:var(--ejercicio)">G · Ejercicio · ${f.exercise.min} min</span><b>${f.exercise.name}</b><span class="small muted">${f.exercise.desc}</span></div>
  </div></div>`;
}

function cellState(key) {
  const H = hyps().filter((h) => h.block === CELLS.find((c) => c.key === key).ficha);
  if (H.some((h) => h.status === "validada")) return "var(--evidencia)";
  if (H.length) return "var(--hipotesis)";
  return "var(--line)";
}
function cellHtml(c) {
  const v = shownVersion(), ro = v?.id !== currentVersion()?.id;
  const codes = c.num ? hyps().filter((h) => h.block === c.ficha).map((h) => h.code + (h.status === "validada" ? " ✓" : "")).join(" · ") : "";
  return `<div class="cell ${c.key === "propuesta" || c.key === "hlc" ? "uvp" : ""}"><div class="ch"><span class="dot" style="background:${cellState(c.key)}"></span>${c.num ? `<span class="n">${c.num}</span>` : ""}<a href="${href("ficha", c.ficha)}" style="color:inherit;text-decoration:none">${c.name}</a></div>
  <textarea aria-label="${c.name}" data-block="${c.key}" placeholder="${c.hint}" ${ro ? "readonly" : ""}>${esc(v?.blocks?.[c.key] || "")}</textarea>${codes ? `<span class="hyp">${esc(codes)}</span>` : ""}</div>`;
}
function viewCanvas() {
  const V = versions(), v = shownVersion(), cur = currentVersion();
  const cell = (k) => cellHtml(CELLS.find((c) => c.key === k));
  const log = [...(S.P.changelog || [])].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return `<div class="head"><div><span class="kicker">Etapa 3 · Construcción · ${esc(S.P.project.name)}</span><h1>Lean Canvas</h1></div>
  <div class="btns"><label class="small muted">Versión <select data-act="version" style="width:auto;display:inline-block">${V.map((x) => `<option value="${x.id}" ${x.id === v?.id ? "selected" : ""}>${esc(x.label)}${x.id === cur?.id ? " (actual)" : ""}</option>`).join("")}</select></label>
  ${coachButton("coherencia", "canvas")}<button class="btn primary" data-act="new-version">Guardar nueva versión</button></div></div>
  ${v?.id !== cur?.id ? `<div class="banner c-hipotesis" style="margin-bottom:12px">Estás viendo ${esc(v.label)}, una versión anterior: es de solo lectura.</div>` : ""}
  ${coachPanel("coherencia:canvas")}
  <div class="canvas" style="margin-top:12px"><div class="cv-top">
    <div class="cv-col">${cell("problema")}${cell("alternativas")}</div>
    <div class="cv-col">${cell("solucion")}${cell("metricas")}</div>
    <div class="cv-col">${cell("propuesta")}${cell("hlc")}</div>
    <div class="cv-col">${cell("ventaja")}${cell("canales")}</div>
    <div class="cv-col">${cell("segmentos")}${cell("early")}</div>
  </div><div class="cv-bot">${cell("costos")}${cell("ingresos")}</div></div>
  <div class="legend"><span><span class="dot" style="background:var(--evidencia)"></span> Con hipótesis validada</span><span><span class="dot" style="background:var(--hipotesis)"></span> Hipótesis abierta</span><span><span class="dot" style="background:var(--line)"></span> Sin hipótesis</span><span>Máximo tres líneas por bloque · los cambios se guardan al salir del campo</span></div>
  <h2 style="margin-top:32px">Registro de cambios</h2>
  ${log.length ? `<table class="t"><thead><tr><th>Versión</th><th>Fecha</th><th>Cambio</th><th>Evidencia</th></tr></thead><tbody>${log.map((l) => `<tr><td class="mono">${esc(l.version)}</td><td>${fmtDate(l.createdAt)}</td><td>${esc(l.text)}</td><td class="muted">${esc(l.evidence)}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">Cada vez que guardes una nueva versión, queda registrado qué cambió y con qué evidencia.</div>`}`;
}

function matrixSvg(H) {
  const W = 520, Hh = 400, X = (v) => 40 + ((v - 0.5) / 5) * (W - 140), Y = (v) => Hh - 30 - ((v - 0.5) / 5) * (Hh - 50);
  const groups = {};
  for (const h of H) { const k = `${h.importance}-${h.uncertainty}`; (groups[k] = groups[k] || []).push(h); }
  const pts = Object.values(groups).map((g) => { const h = g[0]; const top = risk(h) >= 16; return `<g><circle cx="${X(h.uncertainty)}" cy="${Y(h.importance)}" r="7" fill="${top ? "var(--decision)" : "#fff"}" stroke="${top ? "var(--decision)" : "var(--ink-3)"}" stroke-width="1.5"/><text x="${X(h.uncertainty) + 11}" y="${Y(h.importance) + 4 - (g.length - 1) * 6}" font-size="11" font-family="JetBrains Mono, monospace" font-weight="${top ? 600 : 400}" fill="var(--ink)">${g.map((x, i) => `<tspan x="${X(h.uncertainty) + 11}" dy="${i ? 12 : 0}">${esc(x.code)}</tspan>`).join("")}</text></g>`; }).join("");
  return `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Matriz de riesgo: importancia por incertidumbre">
  <rect x="${X(3.5)}" y="${Y(5.5)}" width="${W - 20 - X(3.5)}" height="${Y(3.5) - Y(5.5)}" fill="var(--decision-soft)"/>
  <rect x="${X(0.5)}" y="${Y(5.5)}" width="${W - 20 - X(0.5)}" height="${Y(0.5) - Y(5.5)}" fill="none" stroke="var(--line)"/>
  <line x1="${X(3.5)}" x2="${X(3.5)}" y1="${Y(5.5)}" y2="${Y(0.5)}" stroke="var(--line)" stroke-dasharray="4 4"/><line x1="${X(0.5)}" x2="${W - 20}" y1="${Y(3.5)}" y2="${Y(3.5)}" stroke="var(--line)" stroke-dasharray="4 4"/>
  <text x="${X(3.5) + 8}" y="${Y(5.5) + 16}" font-size="10" font-family="JetBrains Mono, monospace" fill="var(--decision)" font-weight="600">TESTEAR PRIMERO</text>
  <text x="${X(0.5) + 8}" y="${Y(5.5) + 16}" font-size="10" font-family="JetBrains Mono, monospace" fill="var(--ink-3)">MONITOREAR</text>
  <text x="${X(3.5) + 8}" y="${Y(0.5) - 8}" font-size="10" font-family="JetBrains Mono, monospace" fill="var(--ink-3)">TESTEAR DESPUÉS</text>
  <text x="${X(0.5) + 8}" y="${Y(0.5) - 8}" font-size="10" font-family="JetBrains Mono, monospace" fill="var(--ink-3)">IGNORAR POR AHORA</text>
  ${[1, 2, 3, 4, 5].map((s) => `<text x="${X(s)}" y="${Hh - 10}" font-size="10" text-anchor="middle" fill="var(--ink-3)">${s}</text><text x="${X(0.5) - 8}" y="${Y(s) + 3}" font-size="10" text-anchor="end" fill="var(--ink-3)">${s}</text>`).join("")}
  ${pts}</svg>`;
}
function viewHipotesis() {
  const H = hyps(); const ranked = [...H].sort((a, b) => risk(b) - risk(a));
  return `<div class="head"><div><span class="kicker">Etapa 4 · Validación</span><h1>¿Qué supuesto te mata primero?</h1><p class="lead" style="margin:0">Puntuá cada hipótesis de 1 a 5 en importancia (si es falsa, ¿se cae el modelo?) e incertidumbre (¿qué evidencia hay hoy?). Riesgo = importancia × incertidumbre. Los puntajes son del equipo: no son evidencia.</p></div>
  <button class="btn primary" data-act="new-hyp">Nueva hipótesis</button></div>
  ${H.length === 0 ? `<div class="empty">Todavía no hay hipótesis. Creá la primera desde una ficha o con el botón de arriba.</div>` : `
  <div class="row" style="align-items:flex-start"><div class="card matrix" style="flex:1.1"><span class="kicker">↑ Importancia · Incertidumbre →</span>${matrixSvg(H)}</div>
  <div class="card stack" style="flex:1"><h3 style="margin:0">Top 5 a testear</h3>${ranked.filter((h) => !["validada", "invalidada"].includes(h.status)).slice(0, 5).map((h) => `<div style="display:flex;gap:10px;align-items:baseline;border-bottom:1px solid var(--line);padding-bottom:8px"><span class="code">${esc(h.code)}</span><span style="flex:1" class="small">${esc(h.text)}</span><b class="mono">${risk(h)}</b></div>`).join("") || `<span class="muted small">No quedan hipótesis abiertas.</span>`}
  <a class="btn" href="${href("experimentos")}">Diseñar experimentos →</a></div></div>
  <table class="t" style="margin-top:20px"><thead><tr><th>ID</th><th>Hipótesis</th><th>Bloque</th><th>Riesgo de</th><th>I × U</th><th>Estado</th></tr></thead><tbody>
  ${H.map((h) => `<tr class="click" data-act="edit-hyp" data-id="${h.id}" tabindex="0"><td class="code">${esc(h.code)}</td><td>${esc(h.text)}</td><td class="muted small">${esc(FICHAS[h.block]?.name || h.block)}</td><td class="muted small">${RISKS[h.risk] || "—"}</td><td class="mono">${h.importance}×${h.uncertainty} = <b>${risk(h)}</b></td><td>${chip(h.status)}</td></tr>`).join("")}</tbody></table>`}
  <details class="card" style="margin-top:20px"><summary><b>Herramientas de testeo: cuándo usar cada una</b></summary>
  <table class="t" style="margin-top:12px"><thead><tr><th>Herramienta</th><th>Cuándo</th><th>Evidencia</th></tr></thead><tbody>
  ${[["Entrevista de problema", "Validar segmento y problema, sin mostrar la solución", "Nivel 1"], ["Smoke test", "Medir interés antes de que el producto exista", "Nivel 2"], ["Landing page", "Probar propuesta de valor, canal o precio", "Nivel 2"], ["Prototipo", "Probar solución y usabilidad", "Nivel 1–2"], ["MVP conserje", "Entregar el valor a mano y medir uso y pago", "Nivel 2–3"], ["Preventa o seña", "Probar disposición real a pagar", "Nivel 3"]].map((r) => `<tr><td><b>${r[0]}</b></td><td class="muted">${r[1]}</td><td class="mono">${r[2]}</td></tr>`).join("")}</tbody></table></details>`;
}

function expState(e) { if (learningFor(e.id)) return ["Con aprendizaje", "evidencia"]; if (e.committed) return ["En curso", "ejercicio"]; return ["Borrador", "concepto"]; }
function viewExperimentos() {
  const E = exps();
  return `<div class="head"><div><span class="kicker">Etapa 4 · Validación · Pasos 4 y 5</span><h1>Sin umbral previo no hay experimento</h1><p class="lead" style="margin:0">Cada Experiment Card fija hipótesis, prueba, métrica y criterio de éxito antes de salir a medir. Al comprometerla, el criterio queda bloqueado.</p></div>
  <button class="btn primary" data-act="new-exp">Nuevo experimento</button></div>
  ${E.length === 0 ? `<div class="empty">Todavía no hay experimentos. Empezá por la hipótesis más riesgosa.</div>` : `<div class="grid2">${E.map((e) => { const [l, c] = expState(e); const hs = (e.hypotheses || []).map(hypById).filter(Boolean);
    return `<div class="card stack"><div style="display:flex;justify-content:space-between;align-items:center"><b>${esc(e.code)} · Experiment Card</b><span class="chip c-${c}">${l}</span></div>
    <div class="small"><span class="kicker">Hipótesis</span><br>${hs.map((h) => `<b class="code">${esc(h.code)}</b> ${esc(h.text)}`).join("<br>") || "—"}</div>
    <div class="small"><span class="kicker">Prueba</span><br>${esc(e.test)}</div><div class="small"><span class="kicker">Criterio</span><br><b>${esc(e.criteria)}</b></div>
    <div class="btns"><button class="btn sm" data-act="edit-exp" data-id="${e.id}">${e.committed ? "Ver" : "Editar"}</button>${e.committed && !learningFor(e.id) ? `<button class="btn sm primary" data-act="new-learning" data-id="${e.id}">Registrar resultado</button>` : ""}</div></div>`; }).join("")}</div>`}
  <div class="card ladder stack" style="margin-top:20px"><h3 style="margin:0">Escalera de evidencia</h3>${[...LEVELS].reverse().map((l) => `<div class="lv"><span class="n">${l.n}</span><div><b class="small">${l.name}</b><div class="small muted">${l.desc} · peso: ${l.weight}</div></div></div>`).join("")}</div>`;
}

function viewAprendizajes() {
  const L = [...(S.P.learnings || [])].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const pending = exps().filter((e) => e.committed && !learningFor(e.id));
  const rows = [];
  for (const l of L) { const e = (S.P.experiments || []).find((x) => x.id === l.experimentId); for (const [hid, st] of Object.entries(l.results || {})) { const h = hypById(hid); if (h) rows.push({ h, e, l, st }); } }
  return `<div class="head"><div><span class="kicker">Etapa 5 · Iteración</span><h1>Lo aprendido decide el próximo Canvas</h1><p class="lead" style="margin:0">Cada Learning Card registra lo que creían, lo que observaron, el nivel de evidencia y la decisión. Si cambia Problema, Segmentos o Propuesta, guardá una nueva versión del Canvas.</p></div>
  <a class="btn primary" href="${href("canvas")}">Ir al Canvas para versionar</a></div>
  ${L.some((l) => l.simulated) ? `<div class="banner c-hipotesis" style="margin-bottom:16px">Resultados simulados del caso de ejemplo.</div>` : ""}
  ${pending.length ? `<div class="card stack" style="margin-bottom:20px"><h3 style="margin:0">Experimentos esperando resultado</h3>${pending.map((e) => `<div class="btns"><b class="mono">${esc(e.code)}</b><span class="small" style="flex:1">${esc(e.test)}</span><button class="btn sm primary" data-act="new-learning" data-id="${e.id}">Registrar resultado</button></div>`).join("")}</div>` : ""}
  ${L.length === 0 ? `<div class="empty">Cuando un experimento comprometido termine, registrá acá su Learning Card.</div>` : `<div class="grid3">${L.map((l) => { const e = (S.P.experiments || []).find((x) => x.id === l.experimentId); const col = { perseverar: "evidencia", repetir: "hipotesis", modificar: "decision", abandonar: "decision" }[l.decision] || "concepto";
    return `<div class="card stack small"><b style="font-size:14px">${esc(e?.code || "—")} · Learning Card</b>
    <div><span class="kicker" style="color:var(--hipotesis)">Creíamos</span><br>${esc(l.believed)}</div><div><span class="kicker" style="color:var(--evidencia)">Observamos · nivel ${l.level}</span><br>${esc(l.observed)}</div><div><span class="kicker" style="color:var(--concepto)">Aprendimos</span><br>${esc(l.learned)}</div>
    <span class="chip c-${col}" style="align-self:flex-start">Por lo tanto: ${DECISIONS[l.decision] || l.decision}</span><button class="btn sm ghost" data-act="edit-learning" data-id="${l.id}" style="align-self:flex-start">Ver o editar</button></div>`; }).join("")}</div>
  <h2 style="margin-top:28px">Tablero: hipótesis → riesgo → experimento → evidencia → aprendizaje → decisión</h2>
  <table class="t"><thead><tr><th>Hipótesis</th><th>Riesgo</th><th>Experimento</th><th>Evidencia</th><th>Aprendizaje</th><th>Decisión</th></tr></thead><tbody>
  ${rows.map(({ h, e, l, st }) => `<tr><td><span class="code">${esc(h.code)}</span> ${esc(h.text)}</td><td class="mono">${risk(h)}</td><td class="mono">${esc(e?.code || "")}</td><td class="small">Nivel ${l.level}</td><td class="small muted">${esc(l.learned)}</td><td>${chip(st)}</td></tr>`).join("")}</tbody></table>`}`;
}

function viewPlan() {
  const p = S.P.project, plan = p.plan || {}; const phases = plan.phases?.length ? plan.phases : [{ label: "Días 1–30" }, { label: "Días 31–60" }, { label: "Días 61–90" }];
  const open = hyps().filter((h) => !["validada", "invalidada"].includes(h.status)).sort((a, b) => risk(b) - risk(a));
  return `<div class="head"><div><span class="kicker">Etapa 6 · Plan de acción</span><h1>¿Qué hacés el lunes?</h1><p class="lead" style="margin:0">El plan termina en experimentos con responsables, fechas y compuertas medibles. Si no se pasa una compuerta, no se avanza: se itera el Canvas.</p></div>
  <div class="btns">${S.downloads ? `<button class="btn" data-act="download">Descargar resumen (.md)</button>` : ""}<button class="btn" data-act="copy-summary">Copiar resumen</button></div></div>
  <div class="row"><div class="card stack"><h3 style="margin:0">Tres riesgos principales</h3>${open.slice(0, 3).map((h, i) => `<div style="display:flex;gap:12px"><span style="font:500 24px var(--display);color:var(--decision)">${i + 1}</span><div class="small"><b class="code">${esc(h.code)}</b> ${esc(h.text)}<div class="muted">Riesgo ${risk(h)} · ${STATUSES[h.status]?.label}</div></div></div>`).join("") || `<span class="muted small">Registrá hipótesis para calcularlos.</span>`}</div>
  <div class="card stack"><h3 style="margin:0">Próxima revisión</h3><label class="f">Fecha<input type="date" data-plan="nextReview" value="${esc(plan.nextReview || "")}"></label><label class="f">Notas y pendientes<textarea data-plan="notes" placeholder="Responsables, recursos, datos que faltan…">${esc(plan.notes || "")}</textarea></label></div></div>
  <h2 style="margin-top:28px">Roadmap de validación 30 / 60 / 90</h2>
  <div class="grid3">${phases.map((ph, i) => `<div class="card phase"><input type="text" data-phase="${i}:label" value="${esc(ph.label || "")}" aria-label="Tramo" style="font:600 12px var(--mono);letter-spacing:1px;color:var(--brand)">
    <label class="f">Objetivo y experimentos<textarea data-phase="${i}:goal">${esc(ph.goal || "")}</textarea></label>
    <label class="f">Hipótesis<input type="text" data-phase="${i}:hyps" value="${esc(ph.hyps || "")}" placeholder="H10 · H17"></label>
    <label class="f">Compuerta: pasa si…<input type="text" data-phase="${i}:gate" value="${esc(ph.gate || "")}" placeholder="10 de 15 pagan el mes 2"></label></div>`).join("")}</div>
  <h2 style="margin-top:28px">Resumen ejecutivo</h2><div class="card"><pre style="white-space:pre-wrap;font:13px/1.55 var(--body);margin:0">${esc(summaryMd())}</pre></div>`;
}

function summaryMd() {
  const p = S.P.project, b = blocks(), H = hyps(), L = S.P.learnings || [];
  const open = H.filter((h) => !["validada", "invalidada"].includes(h.status)).sort((a, b) => risk(b) - risk(a));
  const ph = p.plan?.phases || [];
  return `# ${p.name} — Resumen ejecutivo (${currentVersion()?.label || "v0"})
${p.example ? "\n> Datos simulados del caso de ejemplo.\n" : ""}
**Idea:** ${p.idea || "[pendiente]"}

- **Cliente:** ${b.segmentos || "[pendiente]"}
- **Problema:** ${(b.problema || "[pendiente]").split("\n")[0]}
- **Propuesta:** ${b.propuesta || "[pendiente]"}
- **Ingresos:** ${b.ingresos || "[pendiente]"}
- **Mayor riesgo:** ${open[0] ? `${open[0].code} · ${open[0].text}` : "[pendiente]"}

## Evidencia
- Hipótesis: ${H.length} registradas · ${H.filter((h) => h.status === "validada").length} validadas · ${H.filter((h) => h.status === "invalidada").length} invalidadas
- Aprendizajes registrados: ${L.length}

## Plan 30/60/90
${ph.map((x) => `- **${x.label}:** ${x.goal || "[pendiente]"} — compuerta: ${x.gate || "[pendiente]"}`).join("\n") || "- [pendiente]"}

Próxima revisión: ${p.plan?.nextReview || "[pendiente]"}
`;
}

// ---------- coach ----------
function coachButton(mode, key) {
  if (!S.sample || S.coachHidden) return "";
  const st = S.coach[`${mode}:${key}`];
  return `<button class="btn btn-coach" data-act="coach" data-mode="${mode}" data-key="${esc(key)}" ${st?.state === "loading" ? "disabled" : ""}>${icon("spark")}${MODES[mode].label}</button>`;
}
function coachPanel(k) {
  const st = S.coach[k]; if (!st) return "";
  if (st.state === "loading") return `<div class="coach"><span class="thinking">El coach está revisando…</span><button class="btn sm ghost" data-act="coach-stop" data-k="${esc(k)}" style="align-self:flex-start">Detener</button></div>`;
  if (st.state === "error") return st.msg ? `<div class="coach"><span>${esc(st.msg)}</span></div>` : "";
  const r = st.result, col = { solido: "evidencia", mejorable: "hipotesis", debil: "decision" }[r.estado];
  const [mode] = k.split(":");
  const apply = r.sugerencia && (mode === "hipotesis") ? `<button class="btn sm" data-act="coach-apply" data-k="${esc(k)}">Usar esta formulación</button>` : "";
  const addMissing = mode === "coherencia" && r.faltantes.length ? `<div><b>Supuestos que todavía no son hipótesis</b><ul>${r.faltantes.map((f, i) => `<li>${esc(f)} <button class="btn sm ghost" data-act="coach-add-hyp" data-i="${i}">+ Agregar</button></li>`).join("")}</ul></div>` : "";
  return `<div class="coach" role="region" aria-label="Revisión del coach"><div class="ttl">${icon("spark")} Coach <span class="chip c-${col}">${{ solido: "Sólido", mejorable: "Mejorable", debil: "Débil" }[r.estado]}</span></div>
  <span>${esc(r.resumen)}</span>
  ${r.fortalezas.length ? `<div><b>Bien</b><ul>${r.fortalezas.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
  ${r.problemas.length ? `<div><b>A revisar</b><ul>${r.problemas.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
  ${r.sugerencia ? `<div class="sug"><b>Sugerencia</b><br>${nl(r.sugerencia)}</div>` : ""}
  ${r.riesgo ? `<span class="small">Riesgo dominante: <b>${RISKS[r.riesgo]}</b></span>` : ""}${Number.isInteger(r.nivel) ? `<span class="small">Nivel de evidencia según el coach: <b>${r.nivel} · ${LEVELS[r.nivel]?.name}</b></span>` : ""}
  ${addMissing}
  ${r.pregunta ? `<span class="q">Pregunta: ${esc(r.pregunta)}</span>` : ""}
  <div class="btns">${apply}<button class="btn sm ghost" data-act="coach-close" data-k="${esc(k)}">Descartar</button></div>
  <span class="small muted">El coach sugiere; las decisiones y la validación son del equipo.</span></div>`;
}
async function askCoach(mode, key, payload) {
  const k = `${mode}:${key}`;
  S.coach[k]?.ctl?.abort();
  const ctl = new AbortController();
  S.coach[k] = { state: "loading", ctl }; rerenderKeepModal();
  try {
    const result = await runCoach(S.sample, mode, payload, { signal: ctl.signal });
    S.coach[k] = { state: "done", result, payload };
    S.store.add(path("coach"), { mode, key, estado: result.estado, resumen: result.resumen, by: S.uid, createdAt: Date.now() }).catch(() => {});
  } catch (e) {
    if (HIDE_CODES.has(e?.code)) { S.coachHidden = true; toast(coachErrorCopy(e.code)); delete S.coach[k]; }
    else S.coach[k] = { state: "error", msg: coachErrorCopy(e?.code) };
  }
  rerenderKeepModal();
}
function rerenderKeepModal() { if (S.modal) renderModal(true); else scheduleRender(); }

// ---------- modales ----------
function openModal(m) { S.modal = m; renderModal(); setTimeout(() => $(".modal [autofocus], .modal textarea, .modal input")?.focus(), 30); }
function closeModal() { S.modal = null; renderModal(); }
function readModal() { const o = {}; document.querySelectorAll(".modal input[type=checkbox][name]").forEach((el) => { o[el.name] = []; }); document.querySelectorAll(".modal [name]").forEach((el) => { if (el.type === "checkbox") { if (el.checked) (o[el.name] = o[el.name] || []).push(el.value); } else o[el.name] = el.value; }); return o; }
function renderModal(keep) {
  let ov = $(".overlay");
  if (!S.modal) { ov?.remove(); return; }
  const draft = keep && ov ? readModal() : null;
  if (draft) S.modal.draft = { ...(S.modal.draft || {}), ...draft };
  const html = MODAL[S.modal.type](S.modal);
  if (!ov) { ov = document.createElement("div"); ov.className = "overlay"; document.body.appendChild(ov); }
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  autosize(ov);
}
const val = (m, k, d = "") => (m.draft && m.draft[k] !== undefined ? m.draft[k] : d);

const MODAL = {
  share: (m) => `<h2>Compartir proyecto</h2><p class="muted small" style="margin:0">Mandale este link a quien quieras sumar. Al abrirlo y entrar con su cuenta, el proyecto aparece en su lista y puede editarlo. Solo el dueño ve el link y quita personas.</p>
    ${m.members ? `<table class="t"><tbody>${m.members.map((x) => `<tr><td>${esc(x.email || "—")}</td><td class="muted small">${x.role === "owner" ? "Dueño" : "Puede editar"}</td><td style="text-align:right">${x.role !== "owner" && m.isOwner ? `<button class="btn sm ghost danger" data-act="member-remove" data-uid="${esc(x.user_id)}">Quitar</button>` : ""}</td></tr>`).join("")}</tbody></table>` : `<div class="loading" style="padding:20px">Cargando…</div>`}
    ${m.isOwner ? (m.link ? `<div class="btns"><input type="text" readonly value="${esc(m.link)}" style="flex:1;min-width:220px" data-invite><button class="btn primary" data-act="invite-copy">Copiar link</button></div>
    <span class="small muted">Si el link llegó a quien no debía, <a href="#" data-act="invite-reset">generá uno nuevo</a>: el anterior deja de funcionar (quienes ya entraron siguen teniendo acceso).</span>` : `<div class="loading" style="padding:12px">Generando link…</div>`) : `<span class="small muted">Para sumar personas, pedíselo al dueño del proyecto.</span>`}
    <div class="btns"><button class="btn ghost" data-act="close">Cerrar</button></div>`,
  "delete-project": (m) => m.isOwner === null ? `<div class="loading" style="padding:20px">Cargando…</div>` : m.isOwner ? `<h2>Eliminar proyecto</h2>
    <p style="margin:0">Se borra <b>${esc(m.name)}</b> con todas sus versiones, hipótesis, experimentos y aprendizajes, para vos y para las personas con las que lo compartiste. No se puede deshacer.</p>
    <label class="f">Para confirmar, escribí el nombre del proyecto<input type="text" name="confirmName" autocomplete="off" placeholder="${esc(m.name)}"></label>
    <div class="btns"><button class="btn primary" style="background:var(--decision);border-color:var(--decision)" data-act="delete-project-confirm">Eliminar definitivamente</button><button class="btn ghost" data-act="close">Cancelar</button></div>`
    : `<h2>Salir del proyecto</h2><p style="margin:0">Solo el dueño puede eliminar <b>${esc(m.name)}</b>. Si salís, deja de aparecer en tu lista y no vas a poder entrar salvo que te vuelvan a invitar.</p>
    <div class="btns"><button class="btn primary" data-act="leave-project-confirm">Salir del proyecto</button><button class="btn ghost" data-act="close">Cancelar</button></div>`,
  project: (m) => `<h2>Nuevo proyecto</h2><label class="f">Nombre<input type="text" name="name" autofocus value="${esc(val(m, "name"))}" placeholder="Ej.: TurnoClaro"></label>
    <label class="f">Idea en una oración<small>Ayudamos a [quién] a resolver [qué problema] mediante [cómo]. Podés completarla después.</small><textarea name="idea">${esc(val(m, "idea"))}</textarea></label>
    <div class="btns"><button class="btn primary" data-act="save-project">Crear proyecto</button><button class="btn ghost" data-act="close">Cancelar</button></div>`,
  version: (m) => `<h2>Guardar nueva versión del Canvas</h2><p class="muted small" style="margin:0">Se crea ${esc(nextLabel(val(m, "major", "minor")))} con el contenido actual. Cambios en Problema, Segmentos o Propuesta son un salto mayor.</p>
    <label class="f">Tipo de cambio<select name="major"><option value="minor" ${val(m, "major") !== "major" ? "selected" : ""}>Menor (otros bloques)</option><option value="major" ${val(m, "major") === "major" ? "selected" : ""}>Mayor (Problema, Segmentos o Propuesta)</option></select></label>
    <label class="f">Qué cambió y por qué<textarea name="text" autofocus>${esc(val(m, "text"))}</textarea></label>
    <label class="f">Evidencia que lo justifica<input type="text" name="evidence" value="${esc(val(m, "evidence"))}" placeholder="Ej.: E1, E3"></label>
    <div class="btns"><button class="btn primary" data-act="save-version">Guardar versión</button><button class="btn ghost" data-act="close">Cancelar</button></div>`,
  hyp: (m) => { const h = m.h || {}; const k = `hipotesis:${m.h?.id || "nueva"}`;
    return `<h2>${h.id ? esc(h.code) + " · Editar hipótesis" : "Nueva hipótesis"}</h2>
    <label class="f">Creemos que…<textarea name="text" rows="3" autofocus>${esc(val(m, "text", h.text || "Creemos que "))}</textarea></label>
    <div class="row"><label class="f">Bloque<select name="block">${Object.entries(FICHAS).map(([key, f]) => `<option value="${key}" ${val(m, "block", h.block) === key ? "selected" : ""}>${f.name}</option>`).join("")}</select></label>
    <label class="f">Riesgo de<select name="risk">${Object.entries(RISKS).map(([key, l]) => `<option value="${key}" ${val(m, "risk", h.risk) === key ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
    <div class="row"><label class="f">Importancia (1–5)<small>Si es falsa, ¿se cae el modelo?</small><select name="importance">${[1, 2, 3, 4, 5].map((n) => `<option ${String(val(m, "importance", h.importance ?? 3)) === String(n) ? "selected" : ""}>${n}</option>`).join("")}</select></label>
    <label class="f">Incertidumbre (1–5)<small>1 = ya hay evidencia · 5 = ninguna</small><select name="uncertainty">${[1, 2, 3, 4, 5].map((n) => `<option ${String(val(m, "uncertainty", h.uncertainty ?? 3)) === String(n) ? "selected" : ""}>${n}</option>`).join("")}</select></label>
    <label class="f">Estado<select name="status">${Object.entries(STATUSES).map(([key, s]) => `<option value="${key}" ${val(m, "status", h.status || "pendiente") === key ? "selected" : ""}>${s.label}</option>`).join("")}</select></label></div>
    ${coachPanel(k)}
    <div class="btns"><button class="btn primary" data-act="save-hyp">Guardar</button>${coachButton("hipotesis", m.h?.id || "nueva")}${h.id ? `<button class="btn ghost danger" data-act="del-hyp">Eliminar</button>` : ""}<button class="btn ghost" data-act="close">Cancelar</button></div>`; },
  exp: (m) => { const e = m.e || {}; const locked = !!e.committed; const sel = val(m, "hypotheses", e.hypotheses || m.pre || []); const k = `experimento:${e.id || "nuevo"}`;
    return `<h2>${e.code ? esc(e.code) : "Nuevo"} · Experiment Card</h2>${locked ? `<div class="banner c-ejercicio">Comprometido: hipótesis, métrica y criterio quedaron bloqueados.</div>` : ""}
    <div class="f" style="font-size:13px;font-weight:600">Hipótesis (creemos que…)<div style="max-height:180px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:8px">${hyps().filter((h) => !["validada", "invalidada"].includes(h.status) || sel.includes(h.id)).sort((a, b) => risk(b) - risk(a)).map((h) => `<label class="check" style="font-weight:400"><input type="checkbox" name="hypotheses" value="${h.id}" ${sel.includes(h.id) ? "checked" : ""} ${locked ? "disabled" : ""}><span><b class="code">${esc(h.code)}</b> ${esc(h.text)} <span class="muted">· riesgo ${risk(h)}</span></span></label>`).join("") || `<span class="muted small">Primero registrá hipótesis.</span>`}</div></div>
    <label class="f">Prueba<small>Para verificarlo vamos a…</small><textarea name="test" ${locked ? "readonly" : ""}>${esc(val(m, "test", e.test))}</textarea></label>
    <label class="f">Métrica<small>Y vamos a medir…</small><input type="text" name="metric" value="${esc(val(m, "metric", e.metric))}" ${locked ? "readonly" : ""}></label>
    <label class="f">Criterio de éxito<small>Tenemos razón si… (numérico, fijado hoy)</small><input type="text" name="criteria" value="${esc(val(m, "criteria", e.criteria))}" ${locked ? "readonly" : ""}></label>
    <div class="row"><label class="f">Responsable<input type="text" name="owner" value="${esc(val(m, "owner", e.owner))}"></label><label class="f">Fecha objetivo<input type="date" name="due" value="${esc(val(m, "due", e.due))}"></label><label class="f">Costo y recursos<input type="text" name="cost" value="${esc(val(m, "cost", e.cost))}"></label></div>
    ${coachPanel(k)}
    <div class="btns">${locked ? `<button class="btn primary" data-act="save-exp">Guardar responsable y fecha</button>` : `<button class="btn primary" data-act="commit-exp">Comprometer experimento</button><button class="btn" data-act="save-exp">Guardar borrador</button>`}${coachButton("experimento", e.id || "nuevo")}${e.id && !locked ? `<button class="btn ghost danger" data-act="del-exp">Eliminar</button>` : ""}<button class="btn ghost" data-act="close">Cerrar</button></div>`; },
  learning: (m) => { const l = m.l || {}; const e = (S.P.experiments || []).find((x) => x.id === (l.experimentId || m.eid)); const hs = (e?.hypotheses || []).map(hypById).filter(Boolean); const k = `aprendizaje:${l.id || e?.id}`;
    const res = val(m, "results", null);
    return `<h2>${esc(e?.code || "")} · Learning Card</h2><div class="small muted">Criterio fijado: <b>${esc(e?.criteria || "—")}</b></div>
    <label class="f">Creíamos que<textarea name="believed">${esc(val(m, "believed", l.believed ?? hs.map((h) => h.text.replace(/^Creemos que /i, "")).join("; ")))}</textarea></label>
    <label class="f">Observamos<small>El dato, sin interpretar</small><textarea name="observed" autofocus>${esc(val(m, "observed", l.observed))}</textarea></label>
    <label class="f">Nivel de evidencia<select name="level">${LEVELS.map((lv) => `<option value="${lv.n}" ${String(val(m, "level", l.level ?? 1)) === String(lv.n) ? "selected" : ""}>${lv.n} · ${lv.name} — ${lv.desc}</option>`).join("")}</select></label>
    <label class="f">Aprendimos<textarea name="learned">${esc(val(m, "learned", l.learned))}</textarea></label>
    <label class="f">Por lo tanto<select name="decision">${Object.entries(DECISIONS).map(([key, d]) => `<option value="${key}" ${val(m, "decision", l.decision) === key ? "selected" : ""}>${d}</option>`).join("")}</select></label>
    <div class="stack"><b class="small">Estado resultante de cada hipótesis</b>${hs.map((h) => `<div class="btns"><b class="code">${esc(h.code)}</b><span class="small" style="flex:1">${esc(h.text)}</span><select name="res-${h.id}" style="width:180px">${Object.entries(STATUSES).map(([key, s]) => `<option value="${key}" ${(m.draft?.["res-" + h.id] ?? l.results?.[h.id] ?? h.status) === key ? "selected" : ""}>${s.label}</option>`).join("")}</select></div>`).join("")}</div>
    ${coachPanel(k)}
    <div class="btns"><button class="btn primary" data-act="save-learning">Guardar aprendizaje</button>${coachButton("aprendizaje", l.id || e?.id)}<button class="btn ghost" data-act="close">Cancelar</button></div>`; },
};

function nextLabel(kind) {
  const cur = currentVersion()?.label || "v0"; const m = cur.match(/^v(\d+)(?:\.(\d+))?$/) || [null, "0", "0"];
  return kind === "major" ? `v${Number(m[1]) + 1}` : `v${m[1]}.${Number(m[2] || 0) + 1}`;
}
function nextCode(prefix, list) { const n = Math.max(0, ...list.map((x) => Number(String(x.code || "").replace(/\D/g, "")) || 0)) + 1; return prefix + String(n).padStart(2, "0"); }

// ---------- acciones ----------
const ACT = {
  share: async () => {
    openModal({ type: "share", members: null, link: null, isOwner: false });
    try { S.modal.members = await S.store.members(S.pid); } catch { S.modal.members = []; }
    S.modal.isOwner = S.modal.members.some((x) => x.user_id === S.uid && x.role === "owner");
    renderModal();
    if (S.modal.isOwner) { try { S.modal.link = await S.store.inviteLink(S.pid); } catch { toast("No se pudo generar el link."); } renderModal(); }
  },
  "delete-project": async () => {
    const name = S.P?.project?.name || "este proyecto";
    openModal({ type: "delete-project", name, isOwner: S.store.kind === "supabase" ? null : true });
    if (S.store.kind === "supabase") { try { S.modal.isOwner = await S.store.isOwner(S.pid); } catch { S.modal.isOwner = false; } renderModal(); }
  },
  "delete-project-confirm": async () => {
    const typed = ($(".modal [name=confirmName]")?.value || "").trim().toLowerCase();
    if (typed !== (S.modal.name || "").trim().toLowerCase()) return toast("El nombre no coincide.");
    const pid = S.pid;
    try {
      if (S.store.kind === "supabase") await S.store.deleteProject(pid);
      else await S.store.update(`projects/${pid}`, { archived: true });
      S.modal = null; location.hash = "#inicio"; toast("Proyecto eliminado.");
    } catch { toast("No se pudo eliminar. Probá de nuevo."); }
  },
  "leave-project-confirm": async () => {
    try { await S.store.leaveProject(S.pid); S.modal = null; location.hash = "#inicio"; toast("Saliste del proyecto."); }
    catch { toast("No se pudo salir del proyecto."); }
  },
  "invite-copy": async () => { const v = $(".modal [data-invite]")?.value; try { await navigator.clipboard.writeText(v); toast("Link copiado."); } catch { $(".modal [data-invite]")?.select(); toast("Copialo con Ctrl+C / Cmd+C."); } },
  "invite-reset": async () => { S.modal.link = null; renderModal(); try { S.modal.link = await S.store.resetInvite(S.pid); toast("Nuevo link generado."); } catch { toast("No se pudo generar el link."); } renderModal(); },
  "member-remove": async (el) => { try { await S.store.removeMember(S.pid, el.dataset.uid); S.modal.members = await S.store.members(S.pid); renderModal(); } catch { toast("Solo el dueño puede quitar personas."); } },
  "auth-mode": (el) => { S.authMode = el.dataset.mode; S.loginError = null; render(); },
  logout: async () => { await S.store.sb.auth.signOut(); location.hash = ""; location.reload(); },
  "new-project": () => openModal({ type: "project" }),
  close: () => closeModal(),
  "save-project": async () => {
    const d = readModal(); if (!d.name.trim()) return toast("Poné un nombre al proyecto.");
    const now = Date.now();
    const id = newId(); const vid = newId();
    await save(async () => {
      await S.store.set(`projects/${id}`, { name: d.name.trim(), idea: d.idea.trim(), createdBy: S.uid, createdAt: now, updatedAt: now, currentVersion: vid, checklists: {}, plan: { phases: [{ label: "Días 1–30" }, { label: "Días 31–60" }, { label: "Días 61–90" }] } });
      await S.store.set(`projects/${id}/versions/${vid}`, { n: 0, label: "v0", blocks: {}, note: "Canvas inicial", createdAt: now, createdBy: S.uid });
    });
    closeModal(); location.hash = `p-${id}-mindset`;
  },
  seed: async (el) => { el.disabled = true; toast("Creando el ejemplo TurnoClaro…"); try { const id = await seedExample(S.store, S.uid); location.hash = `p-${id}`; } catch { toast("No se pudo crear el ejemplo."); el.disabled = false; } },
  "new-version": () => openModal({ type: "version" }),
  "save-version": async () => {
    const d = readModal(); if (!d.text.trim()) return toast("Contá qué cambió y por qué.");
    const label = nextLabel(d.major), id = newId(), now = Date.now();
    const n = Math.max(...versions().map((v) => v.n)) + 1;
    await save(async () => {
      await S.store.set(path("versions", id), { n, label, blocks: { ...blocks() }, note: d.text.trim(), createdAt: now, createdBy: S.uid });
      await S.store.update(path(), { currentVersion: id });
      await S.store.add(path("changelog"), { version: label, text: d.text.trim(), evidence: d.evidence.trim() || "—", createdAt: now });
    }, `Se guardó ${label}.`);
    S.versionView = null; closeModal();
  },
  "new-hyp": (el) => { const block = el.dataset.block; openModal({ type: "hyp", h: null, draft: block ? { block, text: FICHAS[block].hyp, risk: FICHAS[block].risk } : {} }); },
  "edit-hyp": (el) => openModal({ type: "hyp", h: hypById(el.dataset.id) }),
  "save-hyp": async () => {
    const d = readModal(); const text = d.text.trim(); if (text.length < 15) return toast("Escribí la hipótesis completa.");
    const data = { text, block: d.block, risk: d.risk, importance: Number(d.importance), uncertainty: Number(d.uncertainty), status: d.status };
    const h = S.modal.h;
    await save(() => h ? S.store.update(path("hypotheses", h.id), data) : S.store.add(path("hypotheses"), { ...data, code: nextCode("H", hyps()), createdAt: Date.now() }), h ? "Hipótesis actualizada." : "Hipótesis creada.");
    closeModal();
  },
  "del-hyp": async () => { const h = S.modal.h; if (!confirmInline("del-hyp")) return; await save(() => S.store.remove(path("hypotheses", h.id)), `${h.code} eliminada.`); closeModal(); },
  "new-exp": () => { const top = hyps().filter((h) => !["validada", "invalidada"].includes(h.status)).sort((a, b) => risk(b) - risk(a))[0]; openModal({ type: "exp", e: null, pre: top ? [top.id] : [] }); },
  "edit-exp": (el) => openModal({ type: "exp", e: (S.P.experiments || []).find((x) => x.id === el.dataset.id) }),
  "save-exp": async () => saveExp(false),
  "commit-exp": async () => saveExp(true),
  "del-exp": async () => { const e = S.modal.e; if (!confirmInline("del-exp")) return; await save(() => S.store.remove(path("experiments", e.id)), `${e.code} eliminado.`); closeModal(); },
  "new-learning": (el) => openModal({ type: "learning", eid: el.dataset.id, l: null }),
  "edit-learning": (el) => openModal({ type: "learning", l: (S.P.learnings || []).find((x) => x.id === el.dataset.id) }),
  "save-learning": async () => {
    const d = readModal(); if (!d.observed.trim()) return toast("Registrá qué observaron.");
    const l = S.modal.l, eid = l?.experimentId || S.modal.eid;
    const results = {}; for (const [k, v] of Object.entries(d)) if (k.startsWith("res-")) results[k.slice(4)] = v;
    const data = { experimentId: eid, believed: d.believed.trim(), observed: d.observed.trim(), level: Number(d.level), learned: d.learned.trim(), decision: d.decision, results, by: S.uid };
    await save(async () => {
      if (l) await S.store.update(path("learnings", l.id), data); else await S.store.add(path("learnings"), { ...data, createdAt: Date.now() });
      for (const [hid, st] of Object.entries(results)) { const h = hypById(hid); if (h && h.status !== st) await S.store.update(path("hypotheses", hid), { status: st }); }
    }, "Aprendizaje registrado.");
    closeModal();
  },
  coach: (el) => {
    const mode = el.dataset.mode, key = el.dataset.key;
    if (mode === "bloque") { flushFields(); const b = blocks(); return askCoach(mode, key, { ficha: key, content: CELLS.filter((c) => c.ficha === key).map((c) => `${c.name}: ${b[c.key] || ""}`).join("\n"), project: S.P.project, blocks: b }); }
    if (mode === "coherencia") { flushFields(); return askCoach(mode, key, { project: S.P.project, blocks: blocks(), hyps: hyps() }); }
    const d = readModal();
    if (mode === "hipotesis") return askCoach(mode, key, { h: { text: d.text, block: d.block, importance: d.importance, uncertainty: d.uncertainty }, project: S.P.project });
    if (mode === "experimento") return askCoach(mode, key, { e: d, hyps: (d.hypotheses || S.modal.e?.hypotheses || []).map(hypById).filter(Boolean) });
    if (mode === "aprendizaje") { const e = (S.P.experiments || []).find((x) => x.id === (S.modal.l?.experimentId || S.modal.eid)); return askCoach(mode, key, { l: { ...d, level: Number(d.level) }, e, hyps: (e?.hypotheses || []).map(hypById).filter(Boolean) }); }
  },
  "coach-stop": (el) => S.coach[el.dataset.k]?.ctl?.abort(),
  "coach-close": (el) => { delete S.coach[el.dataset.k]; rerenderKeepModal(); },
  "coach-apply": (el) => { const r = S.coach[el.dataset.k]?.result; if (!r) return; S.modal.draft = { ...(S.modal.draft || {}), ...readModal(), text: r.sugerencia, ...(r.riesgo ? { risk: r.riesgo } : {}) }; delete S.coach[el.dataset.k]; renderModal(); toast("Formulación aplicada. Revisala antes de guardar."); },
  "coach-add-hyp": async (el) => {
    const r = S.coach["coherencia:canvas"]?.result; const text = r?.faltantes?.[Number(el.dataset.i)]; if (!text) return;
    await save(() => S.store.add(path("hypotheses"), { code: nextCode("H", hyps()), text, block: "problema", risk: "cliente", importance: 3, uncertainty: 4, status: "pendiente", createdAt: Date.now() }), "Hipótesis agregada. Revisá su bloque y puntajes.");
    r.faltantes.splice(Number(el.dataset.i), 1); scheduleRender();
  },
  download: async () => { try { await S.downloads.save({ filename: `${slug(S.P.project.name)}-resumen.md`, data: summaryMd() }); toast("Resumen descargado."); } catch (e) { if (e?.code !== "declined") toast("No se pudo descargar. Usá “Copiar resumen”."); } },
  "copy-summary": async () => { try { await navigator.clipboard.writeText(summaryMd()); toast("Resumen copiado."); } catch { toast("No se pudo copiar desde esta vista."); } },
};
const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "proyecto";
let confirmArm = null;
function confirmInline(k, msg = "Tocá Eliminar de nuevo para confirmar.") { if (confirmArm === k) { confirmArm = null; return true; } confirmArm = k; toast(msg); setTimeout(() => { if (confirmArm === k) confirmArm = null; }, 4000); return false; }

async function saveExp(commit) {
  const d = readModal(); const e = S.modal.e;
  const hs = d.hypotheses || e?.hypotheses || [];
  if (commit) {
    if (!hs.length) return toast("Elegí al menos una hipótesis.");
    if (!d.test.trim() || !d.metric.trim() || !d.criteria.trim()) return toast("Completá prueba, métrica y criterio antes de comprometer.");
    if (!/\d/.test(d.criteria)) return toast("El criterio de éxito tiene que tener un número.");
    if (!confirmInline("commit", "Al comprometerlo, hipótesis, métrica y criterio quedan bloqueados. Tocá de nuevo para confirmar.")) return;
  }
  const data = e?.committed ? { owner: d.owner, due: d.due, cost: d.cost } : { hypotheses: hs, test: d.test.trim(), metric: d.metric.trim(), criteria: d.criteria.trim(), owner: d.owner, due: d.due, cost: d.cost, ...(commit ? { committed: true, committedAt: Date.now() } : { committed: false }) };
  await save(async () => {
    if (e) await S.store.update(path("experiments", e.id), data);
    else await S.store.add(path("experiments"), { ...data, code: nextCode("E", exps()), createdAt: Date.now() });
    if (commit) for (const hid of hs) { const h = hypById(hid); if (h && h.status === "pendiente") await S.store.update(path("hypotheses", hid), { status: "en-prueba" }); }
  }, commit ? "Experimento comprometido: el criterio quedó bloqueado." : "Borrador guardado.");
  closeModal();
}

// Guarda cambios de campos inline (bloques, plan, idea, checklist)
const lastSaved = new Map();
async function saveField(el) {
  if (el.readOnly || !S.pid) return;
  if (el.dataset.block) {
    const v = currentVersion(); if (!v || shownVersion()?.id !== v.id) return;
    const key = el.dataset.block, value = el.value;
    if ((v.blocks?.[key] || "") === value || lastSaved.get(v.id + key) === value) return;
    lastSaved.set(v.id + key, value);
    return save(() => S.store.update(path("versions", v.id), { blocks: { [key]: value } }));
  }
  if (el.dataset.field) { if ((S.P.project[el.dataset.field] || "") === el.value) return; return save(() => S.store.update(path(), { [el.dataset.field]: el.value })); }
  if (el.dataset.plan) return save(() => S.store.update(path(), { plan: { [el.dataset.plan]: el.value } }));
  if (el.dataset.phase) {
    const [i, k] = el.dataset.phase.split(":");
    const phases = JSON.parse(JSON.stringify(S.P.project.plan?.phases?.length ? S.P.project.plan.phases : [{ label: "Días 1–30" }, { label: "Días 31–60" }, { label: "Días 61–90" }]));
    if ((phases[i][k] || "") === el.value) return;
    phases[i][k] = el.value; return save(() => S.store.update(path(), { plan: { phases } }));
  }
}
function flushFields() { document.querySelectorAll("main textarea[data-block]").forEach((el) => saveField(el)); }

// ---------- eventos ----------
document.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-act]"); if (!el) { if (ev.target.classList?.contains("overlay")) closeModal(); return; }
  if (el.tagName === "SELECT") return;
  ev.preventDefault(); ACT[el.dataset.act]?.(el);
});
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && S.modal) closeModal();
  if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches("tr[data-act]")) { ev.preventDefault(); ACT[ev.target.dataset.act]?.(ev.target); }
});
document.addEventListener("change", (ev) => {
  const el = ev.target;
  if (el.dataset.act === "version") { S.versionView = el.value; render(); return; }
  if (el.dataset.check) {
    const [k, i] = el.dataset.check.split(":");
    return save(() => S.store.update(path(), { checklists: { [k]: { [i]: el.checked } } }));
  }
  if (el.dataset.mindset) return save(() => S.store.update(path(), { mindset: { [el.dataset.mindset]: el.checked } }));
  if (el.closest(".modal") && el.name === "major") { renderModal(true); return; }
  if (el.matches("[data-block],[data-field],[data-plan],[data-phase]")) saveField(el);
});

document.addEventListener("submit", async (ev) => {
  const f = ev.target.closest("[data-form=login]"); if (!f) return;
  ev.preventDefault();
  const email = f.email.value.trim(); const password = f.password.value; const btn = f.querySelector("button"); btn.disabled = true;
  const auth = S.store.sb.auth;
  const { data, error } = S.authMode === "signup" ? await auth.signUp({ email, password }) : await auth.signInWithPassword({ email, password });
  if (error) {
    const c = error.code || "";
    S.loginError = c === "invalid_credentials" ? "Mail o contraseña incorrectos." :
      c === "user_already_exists" || c === "email_exists" ? "Ya hay una cuenta con ese mail. Entrá con tu contraseña." :
      c === "weak_password" ? "La contraseña es muy débil: usá al menos 8 caracteres." :
      c === "email_not_confirmed" ? "La cuenta todavía requiere confirmación por mail. Avisale a quien administra la herramienta." :
      /rate/i.test(error.message) ? "Demasiados intentos seguidos. Esperá un minuto y probá de nuevo." :
      "No se pudo entrar. Probá de nuevo en un momento.";
    btn.disabled = false;
  } else if (S.authMode === "signup" && !data.session) {
    S.loginError = "La cuenta se creó pero requiere confirmación por mail. Avisale a quien administra la herramienta."; btn.disabled = false;
  } else { location.reload(); return; }
  render();
});

window.addEventListener("hashchange", route);
function route() {
  if (/^#invitar-/.test(location.hash) && S.store?.kind === "supabase") { location.reload(); return; }
  const r = parseRoute();
  if (r.pid !== S.pid) { if (r.pid) openProject(r.pid); else closeProject(); }
  S.view = r.pid ? r.view : "inicio"; S.sub = r.sub;
  if (S.view === "ficha" && !FICHAS[S.sub]) S.sub = "problema";
  S.modal = null; renderModal(); render(); $("#main")?.focus({ preventScroll: true }); window.scrollTo(0, 0);
}

// ---------- arranque ----------
(async function init() {
  render();
  try { S.store = await createStore(); } catch { S.store = null; }
  if (!S.store) { S.storeFailed = true; render(); return; }
  if (S.store.kind === "auth") {
    S.store.sb.auth.onAuthStateChange((ev, session) => { if (session) location.reload(); });
    render(); return;
  }
  if (S.store.kind === "supabase") {
    S.uid = S.store.user.id; S.email = S.store.user.email;
    S.sample = supabaseSample(S.store.sb);
    S.downloads = { save: async ({ filename, data }) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type: "text/markdown" })); a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); return { status: "saved" }; } };
    S.store.sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") location.reload(); });
    const inv = location.hash.match(/^#invitar-([a-f0-9]+)$/);
    if (inv) {
      try { const pid = await S.store.acceptInvite(inv[1]); history.replaceState(null, "", "#p-" + pid); setTimeout(() => toast("Te sumaste al proyecto."), 300); }
      catch { history.replaceState(null, "", "#inicio"); setTimeout(() => toast("El link de invitación ya no es válido. Pedile uno nuevo al dueño."), 300); }
    }
  } else {
    const user = await getCapability("user");
    try { S.uid = user ? await user.id() : null; } catch { S.uid = null; }
  }
  S.unsubProjects = S.store.listen("projects", (list) => { S.projects = list; if (!S.pid) scheduleRender(); }, () => { S.projectsErr = true; render(); });
  route();
  if (S.store.kind !== "supabase") {
    getCapability("sample").then((s) => { S.sample = s || globalThis.__mockSample || null; if (S.sample) scheduleRender(); });
    getCapability("downloads").then((d) => { S.downloads = d; if (d) scheduleRender(); });
  }
  if (globalThis.__mockSample) { S.sample = globalThis.__mockSample; }
})();
