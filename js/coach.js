// Coach con IA: revisa el trabajo del equipo contra las reglas del playbook.
// No escribe por el equipo, nunca valida hipótesis y cada sugerencia se acepta o se descarta.

import { FICHAS, LEVELS, DECISIONS, CELLS } from "./content.js";

const RULES = `Sos el coach del Lean Canvas Playbook de Ultreia. Tu trabajo es revisar, no escribir por el equipo.
Reglas del método:
- Todo lo que no se probó con clientes es hipótesis. Una buena hipótesis empieza con "Creemos que", contiene un solo supuesto y se puede refutar con un número o un hecho observable.
- Escalera de evidencia: 0 = opinión interna (no es evidencia); 1 = lo que dicen los clientes; 2 = lo que hacen (comportamiento con costo de tiempo o esfuerzo); 3 = lo que arriesgan (pago, seña, firma).
- Un experimento necesita métrica y criterio de éxito numérico fijado ANTES de medir, y tiene que poder refutar la hipótesis. Preferí siempre el experimento más barato.
- Regla de decisión: supera el umbral con nivel 2-3 → perseverar; supera con nivel 1 → repetir con más evidencia; cerca del umbral o contradictorio → no concluyente; lejos del umbral con nivel 2-3 → modificar o abandonar.
- Nunca declares validada una hipótesis: eso lo decide el equipo con evidencia.
- No inventes datos, cifras ni casos de empresas reales.
Estilo: español rioplatense, directo, sin relleno. Máximo 3 fortalezas y 3 problemas, cada uno en una oración. Una sola pregunta, la más útil.`;

const FORMAT = (extra = "") => `Respondé SOLO con un objeto JSON con esta forma exacta:
{"estado":"solido"|"mejorable"|"debil","resumen":"una oración","fortalezas":["..."],"problemas":["..."],"sugerencia":"texto concreto o cadena vacía","pregunta":"una pregunta"${extra}}`;

const cut = (s, n = 1500) => String(s || "").slice(0, n);

function canvasText(blocks) {
  return CELLS.map((c) => `${c.name}: ${cut(blocks?.[c.key], 600) || "(vacío)"}`).join("\n");
}

export const MODES = {
  bloque: {
    label: "Revisar bloque",
    tier: "default",
    build: ({ ficha, content, project, blocks }) => {
      const f = FICHAS[ficha];
      return `${RULES}

Tarea: revisá el bloque "${f.name}" del Lean Canvas contra su checklist de calidad y sus preguntas poderosas. Señalá qué cumple y qué falla. No reescribas el bloque completo: si hace falta, la "sugerencia" es un ejemplo corto de cómo mejorar una sola línea.

Idea del proyecto: ${cut(project?.idea, 400)}
Checklist del bloque:
${f.checklist.map((c) => "- " + c).join("\n")}
Preguntas poderosas:
${f.questions.map(([q]) => "- " + q).join("\n")}
Contexto del Canvas:
${canvasText(blocks)}

Contenido del bloque a revisar:
"""${cut(content, 2000)}"""

${FORMAT()}`;
    },
  },
  hipotesis: {
    label: "Revisar hipótesis",
    tier: "quick",
    build: ({ h, project }) => `${RULES}

Tarea: revisá si esta hipótesis está bien formulada y es comprobable. Si se puede mejorar, la "sugerencia" es la hipótesis reformulada completa, empezando con "Creemos que", sin inventar cifras que el equipo no dio (usá [corchetes] para lo que falta). Clasificá el riesgo dominante.

Idea del proyecto: ${cut(project?.idea, 400)}
Bloque de origen: ${FICHAS[h.block]?.name || h.block}
Hipótesis: "${cut(h.text, 800)}"
Importancia declarada: ${h.importance}/5 · Incertidumbre declarada: ${h.uncertainty}/5

${FORMAT(',"riesgo":"cliente"|"producto"|"mercado"')}`,
  },
  experimento: {
    label: "Revisar experimento",
    tier: "default",
    build: ({ e, hyps }) => `${RULES}

Tarea: revisá esta Experiment Card antes de que el equipo la comprometa. Chequeá: que la métrica mida la hipótesis, que el criterio sea numérico y fijado de antemano, que el experimento pueda refutarla y si existe uno más barato. Indicá qué nivel de evidencia puede dar (0-3). La "sugerencia" puede ser un criterio más preciso o un experimento más barato.

Hipótesis vinculadas:
${hyps.map((h) => `- ${h.code}: ${cut(h.text, 300)}`).join("\n") || "(ninguna)"}
Prueba: ${cut(e.test, 600)}
Métrica: ${cut(e.metric, 300)}
Criterio de éxito: ${cut(e.criteria, 300)}
Costo y plazo: ${cut(e.cost, 200)} · ${e.due || "sin fecha"}

${FORMAT(',"nivelEsperado":0|1|2|3')}`,
  },
  aprendizaje: {
    label: "Revisar aprendizaje",
    tier: "default",
    build: ({ l, e, hyps }) => `${RULES}

Tarea: revisá esta Learning Card. Chequeá que el nivel de evidencia declarado coincida con lo observado (por ejemplo, "dijeron que pagarían" es nivel 1, no 3), que lo aprendido se desprenda de lo observado y que la decisión siga la regla frente al criterio fijado. Indicá el nivel que te parece correcto.

Experimento: ${cut(e?.test, 400)}
Criterio fijado antes: ${cut(e?.criteria, 300)}
Hipótesis: ${hyps.map((h) => `${h.code}: ${cut(h.text, 200)}`).join(" | ")}
Creíamos que: ${cut(l.believed, 400)}
Observamos: ${cut(l.observed, 600)}
Nivel declarado: ${l.level} (${LEVELS[l.level]?.name})
Aprendimos: ${cut(l.learned, 400)}
Decisión: ${DECISIONS[l.decision] || l.decision}

${FORMAT(',"nivelSugerido":0|1|2|3')}`,
  },
  coherencia: {
    label: "Revisión de coherencia",
    tier: "default",
    build: ({ project, blocks, hyps }) => `${RULES}

Tarea: revisá la coherencia del Lean Canvas completo. Chequeá: cada problema tiene una solución; cada segmento tiene un canal; cada fuente de ingresos tiene una métrica; la propuesta responde al problema número 1; la ventaja injusta no es algo copiable. En "problemas" nombrá los bloques involucrados. Señalá también supuestos importantes del Canvas que todavía no figuran como hipótesis.

Idea del proyecto: ${cut(project?.idea, 400)}
Canvas:
${canvasText(blocks)}
Hipótesis registradas:
${hyps.map((h) => `- ${h.code} (${h.block}): ${cut(h.text, 200)}`).join("\n").slice(0, 6000) || "(ninguna)"}

${FORMAT(',"hipotesisFaltantes":["Creemos que ..."]')}`,
  },
};

export async function runCoach(sample, mode, payload, { signal } = {}) {
  const m = MODES[mode];
  const prompt = m.build(payload);
  const out = await sample.json(prompt, { modelTier: m.tier, signal });
  if (!out || typeof out !== "object") throw { code: "invalid_json", message: "Respuesta sin formato" };
  const arr = (v) => (Array.isArray(v) ? v.map(String).slice(0, 5) : []);
  return {
    estado: ["solido", "mejorable", "debil"].includes(out.estado) ? out.estado : "mejorable",
    resumen: String(out.resumen || ""),
    fortalezas: arr(out.fortalezas),
    problemas: arr(out.problemas),
    sugerencia: String(out.sugerencia || ""),
    pregunta: String(out.pregunta || ""),
    riesgo: ["cliente", "producto", "mercado"].includes(out.riesgo) ? out.riesgo : undefined,
    nivel: Number.isInteger(out.nivelSugerido) ? out.nivelSugerido : Number.isInteger(out.nivelEsperado) ? out.nivelEsperado : undefined,
    faltantes: arr(out.hipotesisFaltantes),
  };
}

export function coachErrorCopy(code) {
  switch (code) {
    case "not_granted": case "sampling_disabled": case "not_declared": case "capability_disabled": case "capability_removed":
      return "El coach no está disponible en esta vista. Podés seguir trabajando sin él.";
    case "rate_limited": return "Demasiadas consultas seguidas o límite de uso alcanzado. Probá de nuevo en unos minutos.";
    case "session_expired": return "Tu sesión expiró. Volvé a iniciar sesión en Claude.";
    case "invalid_json": return "El coach respondió en un formato inesperado. Probá de nuevo.";
    case "refused": return "El coach no pudo revisar este contenido. Probá reformulándolo.";
    case "cancelled": return "";
    default: return "No se pudo contactar al coach. Probá de nuevo.";
  }
}

export const HIDE_CODES = new Set(["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"]);
