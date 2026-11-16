// Proyecto de ejemplo: TurnoClaro (caso ficticio, resultados simulados).
import { newId } from "./store.js";

const V0 = {
  problema: "1. Pierden 2–4 turnos por semana por ausencias sin aviso\n2. Confirmar turnos a mano lleva ~30 min por día\n3. Los huecos no se recuperan",
  alternativas: "WhatsApp manual, agenda de papel, aceptar la pérdida",
  segmentos: "Kinesiólogos y psicólogos que atienden solos, con 25–60 turnos semanales",
  early: "Los que ya mandan recordatorios a mano y llevan la cuenta de las ausencias",
  propuesta: "Dejá de perder turnos: tus pacientes confirman solos por WhatsApp",
  hlc: "La confirmación de reservas de un restaurante, para tu consultorio",
  solucion: "Confirmación automática 24 h antes\nAviso a lista de espera si alguien cancela\nPrimeras semanas operado a mano",
  canales: "Aprender: colegios profesionales y grupos de egresados\nEscalar: alianza con un colegio",
  ingresos: "Suscripción mensual por profesional [precio pendiente]; permanencia esperada de 12 meses",
  costos: "Desarrollo part-time, hosting, costo por mensaje, adquisición de hasta 3 meses de suscripción",
  metricas: "Activación: primera tanda de confirmaciones\nRetención: activos en la semana 8\nResultado: % de baja de ausencias",
  ventaja: "Todavía no. A construir: datos de ausentismo por especialidad y franja horaria",
};

const V1 = {
  ...V0,
  problema: "1. Pierden ingresos por ausencias sin aviso (validado)\n2. Los huecos no se recuperan\n3. Gestionar cancelaciones les quita tiempo de atención",
  alternativas: "WhatsApp manual, aceptar la pérdida",
  propuesta: "Recuperá los turnos que hoy perdés",
  hlc: "La lista de espera de una aerolínea, para tu consultorio",
  solucion: "Confirmación por WhatsApp + reasignación automática a lista de espera\nIntegrada con la agenda que ya usan (no la reemplaza)",
  ingresos: "Suscripción mensual [precio pendiente]; se testea un cargo por turno recuperado",
  costos: "Desarrollo part-time, hosting, mensajes, integración con agendas externas, adquisición < 3 meses",
  metricas: "Principal: turnos recuperados por profesional por mes\nApoyo: % de ausencias, activos en la semana 8",
};

const H = [
  ["H01", "problema", "Creemos que los profesionales del segmento pierden al menos 2 turnos por semana por ausencias sin aviso", "cliente", 5, 4, "validada"],
  ["H02", "problema", "Creemos que confirmar turnos a mano les lleva al menos 20 minutos por día", "cliente", 3, 3, "pendiente"],
  ["H03", "problema", "Creemos que los huecos por ausencia hoy no se recuperan", "cliente", 4, 3, "pendiente"],
  ["H04", "segmentos", "Creemos que hay suficientes profesionales independientes con 25–60 turnos semanales", "mercado", 4, 2, "pendiente"],
  ["H05", "segmentos", "Creemos que los que ya mandan recordatorios a mano adoptarían antes una solución", "cliente", 3, 4, "pendiente"],
  ["H06", "propuesta", "Creemos que el segmento valora “no perder turnos” más que “ordenar la agenda”", "cliente", 4, 4, "validada"],
  ["H07", "solucion", "Creemos que la confirmación automática por WhatsApp reduce las ausencias en al menos 30%", "producto", 5, 5, "invalidada"],
  ["H08", "solucion", "Creemos que los pacientes aceptan confirmar con un mensaje automático", "producto", 4, 4, "validada"],
  ["H09", "canales", "Creemos que se consiguen los primeros 20 clientes por colegios y grupos profesionales", "mercado", 4, 3, "pendiente"],
  ["H10", "ingresos", "Creemos que el segmento pagará una suscripción mensual equivalente a menos de un turno", "mercado", 5, 5, "no-concluyente"],
  ["H11", "ingresos", "Creemos que los clientes se quedan al menos 12 meses", "mercado", 4, 5, "pendiente"],
  ["H12", "costos", "Creemos que el costo de adquisición será menor a 3 meses de suscripción", "mercado", 3, 4, "pendiente"],
  ["H13", "metricas", "Creemos que al menos 60% de los activados seguirán activos en la semana 8", "producto", 3, 4, "pendiente"],
  ["H14", "ventaja", "Creemos que los datos de ausentismo generan una ventaja que crece con el uso", "mercado", 2, 5, "pendiente"],
  ["H15", "solucion", "Creemos que los profesionales prefieren integrarse con la agenda que ya usan antes que reemplazarla", "producto", 4, 4, "pendiente"],
  ["H16", "solucion", "Creemos que la lista de espera recupera al menos 30% de los huecos por cancelación", "producto", 5, 4, "en-prueba"],
  ["H17", "ingresos", "Creemos que al menos 40% de los profesionales elige pagar un cargo por turno recuperado", "mercado", 4, 5, "en-prueba"],
];

export async function seedExample(store, uid) {
  const pid = newId();
  const now = Date.now();
  const base = `projects/${pid}`;
  const v0 = newId(), v1 = newId();
  const hid = {};
  for (const h of H) hid[h[0]] = newId();
  const e1 = newId(), e2 = newId(), e3 = newId(), e4 = newId();

  await store.set(base, {
    name: "TurnoClaro (ejemplo)",
    idea: "Ayudamos a profesionales de salud independientes a dejar de perder ingresos por ausencias mediante confirmación y lista de espera por WhatsApp.",
    example: true, createdBy: uid || null, createdAt: now - 6 * 7 * 864e5, updatedAt: now,
    currentVersion: v1, hypCounter: 17, expCounter: 4,
    checklists: {},
    plan: {
      phases: [
        { label: "Días 1–30", goal: "¿Pagan? Piloto 2 con 15 profesionales y precio real", hyps: "H10 · H17", gate: "10 de 15 pagan el mes 2" },
        { label: "Días 31–60", goal: "¿Escala? Piloto ampliado a 30 profesionales e integración con 2 agendas", hyps: "H16 · H15", gate: "30% o más de huecos recuperados" },
        { label: "Días 61–90", goal: "¿Se quedan? Cohorte medida desde el día 1 y costo de adquisición real", hyps: "H11 · H13 · H12", gate: "60% activos en la semana 8 → invertir, pivotar o abandonar" },
      ],
      nextReview: "",
      notes: "Responsables, fecha de inicio y precio en pesos: pendientes de definir por el equipo.",
    },
  });
  await store.set(`${base}/versions/${v0}`, { n: 0, label: "v0", blocks: V0, note: "Canvas inicial, 14 hipótesis", createdAt: now - 6 * 7 * 864e5, createdBy: uid || null });
  await store.set(`${base}/versions/${v1}`, { n: 1, label: "v1", blocks: V1, note: "Pivote de necesidad: de confirmar turnos a recuperar ingresos perdidos (E1, E2, E3)", createdAt: now - 864e5, createdBy: uid || null });
  for (const [code, block, text, risk, imp, unc, status] of H) {
    await store.set(`${base}/hypotheses/${hid[code]}`, { code, block, text, risk, importance: imp, uncertainty: unc, status, createdAt: now - (code > "H14" ? 864e5 : 6 * 7 * 864e5) });
  }
  const E = [
    [e1, "E1", ["H01", "H03", "H06"], "12 entrevistas a early adopters, sin mostrar la solución", "Ausencias reportadas por semana; problema mencionado espontáneamente", "8 de 12 reportan 2 o más ausencias por semana", "Tiempo del equipo · 2 semanas", true],
    [e2, "E2", ["H06", "H09"], "Dos versiones de landing (agenda vs. ausencias) con precio visible, tráfico desde grupos profesionales", "Tasa de registro por versión", "La versión “ausencias” duplica a “agenda” y supera 10%", "Presupuesto bajo · 2 semanas", true],
    [e3, "E3", ["H07", "H08", "H10"], "Piloto conserje: 8 profesionales, 4 semanas, confirmaciones manuales y aviso a lista de espera, primer mes pago", "% de ausencias antes vs. durante; % de pacientes que responden; cuántos pagan el mes 2", "Ausencias bajan 30%+; 70% de pacientes responden; 6 de 8 pagan el mes 2", "Tiempo del equipo + mensajes · 4 semanas", true],
    [e4, "E4", ["H10", "H17"], "Piloto 2: 15 profesionales durante 4 semanas, con precio real y dos esquemas de cobro", "Cuántos pagan el mes 2, por esquema", "10 de 15 pagan el mes 2", "[Pendiente] · Día 30", true],
  ];
  for (const [id, code, hs, test, metric, criteria, cost, committed] of E) {
    await store.set(`${base}/experiments/${id}`, { code, hypotheses: hs.map((c) => hid[c]), test, metric, criteria, cost, owner: code === "E4" ? "[Pendiente: responsable comercial]" : "Equipo", due: "", committed, committedAt: now, createdAt: now });
  }
  const L = [
    [e1, "Las ausencias son el problema principal", "10 de 12 reportan 2 o más ausencias por semana; 9 las nombran como su mayor costo y solo 3 mencionan la agenda; 6 mostraron la planilla donde las registran. 8 de 12 ya usan una agenda digital y no quieren cambiarla.", 1, "El dolor es el ingreso perdido, no la organización. Reemplazar la agenda que ya usan agrega fricción.", "perseverar", { H01: "validada" }],
    [e2, "El segmento valora “no perder turnos” por encima de “ordenar la agenda”", "Agenda: 8 de 200 visitas (4%). Ausencias: 26 de 200 (13%).", 2, "La propuesta de ausencias convierte más del triple.", "perseverar", { H06: "validada" }],
    [e3, "La confirmación baja las ausencias 30% y pagan por eso", "Ausencias de 9% a 7% de los turnos (−22%); 81% de pacientes responden; la lista de espera reocupó el 40% de las cancelaciones avisadas; 5 de 8 pagan el mes 2.", 2, "Confirmar solo no alcanza; el valor aparece al recuperar el hueco.", "modificar", { H07: "invalidada", H08: "validada", H10: "no-concluyente" }],
  ];
  for (const [eid, believed, observed, level, learned, decision, res] of L) {
    const results = {};
    for (const [c, s] of Object.entries(res)) results[hid[c]] = s;
    await store.add(`${base}/learnings`, { experimentId: eid, believed, observed, level, learned, decision, results, simulated: true, createdAt: now });
  }
  await store.add(`${base}/changelog`, { version: "v1", text: "Pivote de necesidad del cliente: propuesta, solución y métricas reorientadas a recuperar turnos", evidence: "E1, E2, E3", createdAt: now - 864e5 });
  await store.add(`${base}/changelog`, { version: "v0", text: "Canvas inicial, 14 hipótesis", evidence: "Ninguna", createdAt: now - 6 * 7 * 864e5 });
  return pid;
}
