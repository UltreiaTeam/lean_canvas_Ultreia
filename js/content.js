// Contenido metodológico del Lean Canvas Playbook.
// Origen: [Maurya] = Running Lean; [Complementaria] = otros autores; [Adaptación] = propio del playbook.

export const CELLS = [
  { key: "problema", num: "01", name: "Problema", ficha: "problema", hint: "Top 3 problemas, ordenados" },
  { key: "alternativas", num: "", name: "Alternativas existentes", ficha: "problema", hint: "Cómo lo resuelven hoy" },
  { key: "solucion", num: "04", name: "Solución", ficha: "solucion", hint: "Una solución mínima por problema" },
  { key: "metricas", num: "08", name: "Métricas clave", ficha: "metricas", hint: "Pocas y accionables" },
  { key: "propuesta", num: "03", name: "Propuesta única de valor", ficha: "propuesta", hint: "Resultado, no funciones" },
  { key: "hlc", num: "", name: "High-level concept", ficha: "propuesta", hint: "“X para Y”" },
  { key: "ventaja", num: "09", name: "Ventaja injusta", ficha: "ventaja", hint: "“Todavía no” es válido" },
  { key: "canales", num: "05", name: "Canales", ficha: "canales", hint: "Para aprender y para escalar" },
  { key: "segmentos", num: "02", name: "Segmentos de clientes", ficha: "segmentos", hint: "Segmento prioritario" },
  { key: "early", num: "", name: "Early adopters", ficha: "segmentos", hint: "Rasgos observables" },
  { key: "costos", num: "07", name: "Estructura de costos", ficha: "costos", hint: "Fijos, variables, adquisición" },
  { key: "ingresos", num: "06", name: "Fuentes de ingresos", ficha: "ingresos", hint: "Quién paga, cuánto, cada cuánto" },
];

export const RISKS = { cliente: "Cliente", producto: "Producto", mercado: "Mercado" };

export const STATUSES = {
  pendiente: { label: "Pendiente", color: "concepto" },
  "en-prueba": { label: "En prueba", color: "ejercicio" },
  validada: { label: "Validada", color: "evidencia" },
  invalidada: { label: "Invalidada", color: "decision" },
  "no-concluyente": { label: "No concluyente", color: "hipotesis" },
};

export const LEVELS = [
  { n: 0, name: "Opinión interna", desc: "Lo que cree el equipo", weight: "No es evidencia" },
  { n: 1, name: "Cualitativa", desc: "Lo que dicen los clientes", weight: "Bajo" },
  { n: 2, name: "Comportamiento observado", desc: "Lo que hacen", weight: "Medio" },
  { n: 3, name: "Compromiso o pago", desc: "Lo que arriesgan", weight: "Alto" },
];

export const DECISIONS = {
  perseverar: "Perseverar",
  repetir: "Repetir con más evidencia",
  modificar: "Modificar (pivote parcial)",
  abandonar: "Abandonar",
};

export const STAGES = [
  { n: "01", key: "mindset", name: "Mindset", q: "¿Por qué todo empieza como apuesta?" },
  { n: "02", key: "bloques", name: "Los 9 bloques", q: "¿Cómo sé si un bloque está bien pensado?" },
  { n: "03", key: "canvas", name: "Construcción", q: "¿En qué orden armo el Canvas?" },
  { n: "04", key: "hipotesis", name: "Validación", q: "¿Qué supuesto me mata primero?" },
  { n: "05", key: "aprendizajes", name: "Iteración", q: "¿Qué cambio con lo aprendido?" },
  { n: "06", key: "plan", name: "Plan de acción", q: "¿Qué hago el lunes?" },
];

// Orden de construcción recomendado [Maurya] + módulo de benchmark [Adaptación]
export const BUILD_ORDER = ["segmentos", "problema", "propuesta", "solucion", "canales", "ingresos", "costos", "metricas", "ventaja"];

export const FICHAS = {
  problema: {
    num: "01", name: "Problema", risk: "cliente", origin: "Maurya",
    q: "¿Qué dolor es tan importante que alguien ya gasta tiempo o dinero en resolverlo?",
    concept: "Lista los tres problemas principales del segmento, ordenados por importancia, y las alternativas existentes: cómo los resuelven hoy. Si el problema no es real, nada de lo que sigue importa.",
    questions: [
      ["¿Cómo resuelve hoy tu cliente este problema y cuánto le cuesta esa solución?", "No hay alternativa"],
      ["¿Cuándo fue la última vez que le pasó y qué hizo?", "El problema es hipotético"],
      ["Si el problema desapareciera mañana, ¿qué cambiaría concretamente en su semana?", "El problema es importante"],
      ["¿Este problema es tuyo o de tu cliente?", "Proyectar el dolor propio"],
      ["¿Qué problema ocupa el puesto 1 y por qué no el 2?", "Todos pesan igual"],
      ["¿El problema es frecuente, caro o urgente? ¿Cuál de las tres?", "Un dolor ocasional alcanza para pagar"],
    ],
    steps: ["Escribí todos los problemas que se te ocurran, sin filtrar.", "Reformulá cada uno como algo que le pasa al cliente, no como algo que le falta a tu producto.", "Quedate con tres y ordenalos por frecuencia × costo.", "Anotá la alternativa existente de cada uno.", "Regla: cada problema tiene que poder observarse en una entrevista."],
    example: { weak: "“Los profesionales están desorganizados”", strong: "“Pierden entre 2 y 4 turnos por semana porque los pacientes no avisan que faltan”", why: "Es concreto, medible y se puede verificar." },
    checklist: ["Como máximo tres problemas, ordenados", "Escritos desde el cliente, no desde el producto", "Cada uno con su alternativa existente", "Al menos uno es frecuente, caro o urgente", "Ninguno menciona tu solución"],
    exercise: { name: "Árbol del dolor", min: 20, desc: "Problema principal al centro, consecuencias arriba, causas abajo. Entregable: los tres problemas priorizados con su alternativa existente." },
    hyp: "Creemos que [segmento] sufre [problema] al menos [frecuencia] y hoy lo resuelve con [alternativa].",
    experiment: "10 a 15 entrevistas de problema, preguntando por hechos pasados [Maurya; The Mom Test]. Evidencia esperada: nivel 1.",
  },
  segmentos: {
    num: "02", name: "Segmentos de clientes", risk: "cliente", origin: "Maurya",
    q: "¿Quién tiene este problema con tanta intensidad que te va a probar primero?",
    concept: "Define para quién es el negocio y quiénes son los early adopters: el subgrupo que siente el problema hoy y ya busca resolverlo. Si usuario y pagador son distintos, separalos.",
    questions: [
      ["¿Quién sufre el problema y quién paga por resolverlo? ¿Son la misma persona?", "Usuario = cliente"],
      ["¿Qué tiene que ser cierto de una persona para que sea tu primer cliente?", "El segmento es homogéneo"],
      ["¿Dónde están hoy y cómo los encontrás esta semana?", "El segmento es alcanzable"],
      ["¿Quién ya probó algo para resolverlo, aunque sea improvisado?", "Hay demanda latente"],
      ["¿Podrías nombrar a diez personas reales del segmento?", "El segmento existe"],
      ["¿Qué segmento descartás a propósito y por qué?", "Todos son clientes"],
    ],
    steps: ["Partiendo de los problemas, listá los tipos de clientes que los tienen.", "Separá usuario, pagador y decisor.", "Elegí un segmento prioritario por intensidad del problema y acceso.", "Describí a los early adopters con rasgos observables.", "Regla: tenés que poder encontrar a cinco de ellos en una semana."],
    example: { weak: "“Profesionales de la salud”", strong: "“Kinesiólogos y psicólogos que atienden solos, con 25 a 60 turnos por semana”", why: "Delimita quién, cómo trabaja y cuánto volumen tiene." },
    checklist: ["Hay un segmento prioritario explícito", "Early adopters descritos con rasgos observables", "Usuario y pagador identificados", "Podés nombrar al menos cinco personas reales", "Está claro a quién dejás afuera"],
    exercise: { name: "Lista de diez", min: 15, desc: "Escribí nombre y apellido de diez personas que creas que son tus early adopters. Las que no puedas nombrar indican que el segmento todavía es abstracto." },
    hyp: "Creemos que [early adopters] existen en cantidad suficiente, se los encuentra en [lugar] y ya intentan resolver [problema].",
    experiment: "Entrevistas de problema y conteo de cuántos ya usan una alternativa. Evidencia: nivel 1; nivel 2 si refieren a un colega.",
  },
  propuesta: {
    num: "03", name: "Propuesta única de valor", risk: "cliente", origin: "Maurya",
    q: "¿Por qué un early adopter te elegiría a vos en lugar de su alternativa actual?",
    concept: "Mensaje claro y concreto que explica por qué sos diferente y por qué vale la pena prestarte atención. Se acompaña de un high-level concept del tipo “X para Y”.",
    questions: [
      ["¿Qué resultado obtiene el cliente, en sus palabras?", "Funciones en vez de resultados"],
      ["Frente a la alternativa, ¿qué es mejor, más rápido o más barato? ¿En cuánto?", "La diferencia es evidente"],
      ["Si tu competidor copiara esta frase, ¿seguiría siendo verdad para él?", "La propuesta es única"],
      ["¿La entiende alguien del segmento en cinco segundos?", "La claridad"],
      ["¿Qué tendría que dejar de hacer el cliente para adoptarte?", "El costo de cambio es cero"],
      ["¿A qué problema de la Ficha 1 responde?", "La coherencia del modelo"],
    ],
    steps: ["Tomá el problema número 1 y su alternativa existente.", "Escribí el resultado final que obtiene el cliente, no la función.", "Sumá el diferencial frente a la alternativa, con número si es posible.", "Redactá una versión de 10 a 15 palabras y un high-level concept.", "Regla: tiene que poder ir de título en una landing."],
    example: { weak: "“La mejor app de gestión para profesionales de la salud”", strong: "“Dejá de perder turnos: tus pacientes confirman solos por WhatsApp”", why: "Habla del resultado y del canal que el cliente ya usa." },
    checklist: ["Expresa un resultado, no una función", "Responde al problema número 1", "Se diferencia de la alternativa existente", "Tiene 15 palabras o menos", "Tiene high-level concept"],
    exercise: { name: "Tres versiones y un test", min: 20, desc: "Escribí tres propuestas (tiempo, dinero, tranquilidad) y mostralas a dos personas del segmento sin explicar nada. Anotá qué entendieron." },
    hyp: "Creemos que [segmento] valora [resultado] por encima de [alternativa].",
    experiment: "Landing page con dos o tres versiones de la propuesta, comparando la tasa de registro. Evidencia: nivel 2.",
  },
  solucion: {
    num: "04", name: "Solución", risk: "producto", origin: "Maurya",
    q: "¿Cuál es lo mínimo que hay que construir para resolver el problema número 1?",
    concept: "Lista la solución mínima para cada problema priorizado. Es lo que más cambia con el aprendizaje, por eso se completa después de validar el problema.",
    questions: [
      ["¿Qué problema resuelve cada funcionalidad? Si no responde a ninguno, ¿por qué está?", "Más funciones es mejor"],
      ["¿Se podría resolver a mano durante las primeras semanas?", "Hay que construir antes de aprender"],
      ["¿Qué parte de la solución cambia realmente el resultado?", "Todo pesa igual"],
      ["¿Qué tendría que aprender el cliente para usarla?", "La adopción es automática"],
      ["¿Qué sabemos construir y qué estamos suponiendo?", "La factibilidad técnica"],
      ["¿Qué dejás afuera de la primera versión a propósito?", "El alcance indefinido"],
    ],
    steps: ["Para cada problema, escribí una sola respuesta.", "Describí qué hace, no cómo está construida.", "Marcá el núcleo: lo que tiene que funcionar sí o sí.", "Anotá qué se puede resolver a mano al principio (MVP conserje).", "Regla: tres líneas como máximo."],
    example: { weak: "“Plataforma integral con agenda, historia clínica, facturación y reportes”", strong: "“Confirmación por WhatsApp 24 h antes; si alguien cancela, se avisa a la lista de espera”", why: "Responde al problema 1 y es mínima." },
    checklist: ["Cada solución responde a un problema de la Ficha 1", "Tres líneas como máximo", "El núcleo está marcado", "Hay una versión que se prueba sin desarrollo completo", "No vende tecnología como valor en sí"],
    exercise: { name: "Cortar a la mitad", min: 15, desc: "Listá todas las funcionalidades. Tachá la mitad, y después la mitad de lo que quedó. Lo que sobrevive es candidato a MVP." },
    hyp: "Creemos que [solución mínima] reduce [problema] en [magnitud] para [segmento].",
    experiment: "Entrevista de solución con prototipo o MVP conserje. Evidencia: nivel 2 si lo usan; nivel 3 si pagan.",
  },
  canales: {
    num: "05", name: "Canales", risk: "mercado", origin: "Maurya",
    q: "¿Cómo llego a mis early adopters de forma repetible y a un costo que el modelo soporte?",
    concept: "Los caminos para que el cliente te conozca, te pruebe y te compre. Al principio vale cualquier canal que permita aprender; después hace falta uno que escale.",
    questions: [
      ["¿Dónde se informan hoy tus early adopters cuando buscan resolver el problema?", "El canal es obvio"],
      ["¿Cuánto cuesta conseguir un cliente y cuánto te deja?", "La adquisición es gratis"],
      ["¿Sirve para los primeros diez clientes o para los primeros mil?", "Un canal sirve para todo"],
      ["¿Quién ya tiene acceso a tu segmento y podría recomendarte?", "Hay que construir audiencia desde cero"],
      ["¿Qué canal podrías probar esta semana con poco presupuesto?", "Hace falta inversión para testear"],
    ],
    steps: ["Listá canales para conocer, probar y comprar.", "Separá canales para aprender de canales para escalar.", "Elegí uno o dos para empezar.", "Anotá el costo estimado por cliente.", "Regla: tiene que estar claro qué hacés el lunes para conseguir el primer cliente."],
    example: { weak: "“Redes sociales y marketing digital”", strong: "“Primeros 20 clientes: colegios profesionales y grupos de egresados. Para escalar: alianza con un colegio”", why: "Separa aprender de escalar y nombra el canal concreto." },
    checklist: ["Canales para aprender y para escalar separados", "Uno o dos canales prioritarios", "Costo estimado por cliente", "Está claro cómo llega el primer cliente"],
    exercise: { name: "Mapa de puntos de contacto", min: 20, desc: "Tres columnas: conoce, prueba, compra. En cada una, los lugares reales donde podrías aparecer." },
    hyp: "Creemos que podemos conseguir [n] clientes por [canal] a menos de [monto] cada uno.",
    experiment: "Smoke test o campaña chica por canal, midiendo costo por registro. Evidencia: nivel 2.",
  },
  ingresos: {
    num: "06", name: "Fuentes de ingresos", risk: "mercado", origin: "Maurya",
    q: "¿Quién paga, cuánto, con qué frecuencia y por qué ese precio tiene sentido para él?",
    concept: "Modelo de ingresos, precio y valor de vida del cliente. Cobrar desde el inicio es una de las formas más directas de validar.",
    questions: [
      ["¿Cuánto gasta hoy el cliente en la alternativa, en dinero o en tiempo?", "El precio se inventa"],
      ["¿Quién firma la compra y con qué presupuesto?", "El usuario decide"],
      ["¿Por qué el cliente seguiría pagando el mes 6?", "La retención"],
      ["Si el precio fuera el doble, ¿quién dejaría de comprar?", "La sensibilidad al precio"],
      ["¿Hay ingresos que dependen de otros actores?", "La estructura de cobro es simple"],
    ],
    steps: ["Definí quién paga y en qué momento.", "Elegí el modelo de cobro coherente con cómo recibe el valor.", "Poné un precio tentativo anclado en el costo de la alternativa.", "Estimá el valor de vida: precio × meses de permanencia.", "Regla: tiene que haber un número, aunque sea hipótesis."],
    example: { weak: "“Freemium, después vemos”", strong: "“Suscripción mensual por profesional; equivale a recuperar menos de un turno por mes”", why: "Tiene precio, lógica y ancla de valor." },
    checklist: ["Está claro quién paga", "Hay un precio tentativo con ancla de valor", "Hay un modelo de cobro definido", "Hay una estimación del valor de vida"],
    exercise: { name: "Escalera de precios", min: 15, desc: "Tres precios: uno que te da vergüenza por bajo, otro por alto y uno en el medio. Para cada uno, ¿qué tendría que creer el cliente para pagarlo?" },
    hyp: "Creemos que [segmento] pagará [precio] por [período] y se quedará [meses].",
    experiment: "Preventa o seña en un piloto; landing con precio visible. Evidencia: nivel 3.",
  },
  costos: {
    num: "07", name: "Estructura de costos", risk: "mercado", origin: "Maurya",
    q: "¿Cuánto cuesta llegar al punto en que el modelo se prueba, y cuánto cuesta cada cliente?",
    concept: "Costos para operar y para llegar al cliente. En etapa temprana importa cuánto cuesta aprender, no el costo a escala. Junto con Ingresos define el punto de equilibrio.",
    questions: [
      ["¿Cuánto cuesta llegar a los primeros diez clientes pagos?", "Hay que planificar a escala"],
      ["¿Qué costo crece con cada cliente y cuál es fijo?", "La escalabilidad"],
      ["¿Cuántos clientes hacen falta para cubrir los costos fijos?", "El modelo cierra"],
      ["¿Cuántos meses de experimentación podés financiar?", "El tiempo es infinito"],
      ["¿Qué costo ignorás porque hoy lo ponés vos?", "Los costos ocultos"],
    ],
    steps: ["Separá costos fijos mensuales y variables por cliente.", "Sumá el costo de adquisición de la Ficha 5.", "Calculá el equilibrio: fijos ÷ (precio − variable).", "Estimá el presupuesto de validación a 90 días.", "Regla: tiene que haber un número de clientes de equilibrio."],
    example: { weak: "“Desarrollo, marketing y sueldos”", strong: "“Fijos: un desarrollador part-time y hosting. Variables: mensajes por paciente. Adquisición: hasta 3 meses de suscripción”", why: "Separa tipos de costo y se puede calcular." },
    checklist: ["Fijos y variables separados", "Incluye el costo de adquisición", "Hay un punto de equilibrio estimado", "Hay un presupuesto de validación a 90 días"],
    exercise: { name: "Servilleta financiera", min: 20, desc: "En una hoja: fijos mensuales, variable por cliente, precio y clientes de equilibrio. Anotá los tres supuestos que más lo mueven." },
    hyp: "Creemos que servir a un cliente costará menos de [monto] y adquirirlo menos de [monto].",
    experiment: "Medir costos reales durante el piloto. Evidencia: nivel 2.",
  },
  metricas: {
    num: "08", name: "Métricas clave", risk: "producto", origin: "Maurya",
    q: "¿Qué pocos números me dicen si el modelo está funcionando?",
    concept: "Las actividades que se miden para saber si el negocio avanza. Un marco habitual es el embudo AARRR de Dave McClure [Complementaria]. Una métrica sirve si su cambio te lleva a decidir algo distinto.",
    questions: [
      ["Si este número sube o baja, ¿qué harías distinto?", "Más datos es mejor"],
      ["¿Cuál es el momento exacto en que el cliente recibe valor por primera vez?", "La activación es el registro"],
      ["¿Mide lo que hace el cliente o lo que hacés vos?", "Actividad = resultado"],
      ["¿Qué valor considerarías éxito y cuál fracaso, antes de medir?", "Interpretar a posteriori"],
    ],
    steps: ["Recorré adquisición, activación, retención, ingresos y referidos.", "Definí la activación como el primer momento de valor.", "Elegí una métrica principal para la etapa actual.", "Fijá un umbral de éxito antes de medir.", "Regla: cinco métricas como máximo, todas accionables."],
    example: { weak: "“Descargas de la app y seguidores en Instagram”", strong: "“Activación: primera tanda de confirmaciones enviada. Retención: activos en la semana 8”", why: "Mide valor recibido y comportamiento." },
    checklist: ["Hay una métrica principal para la etapa", "La activación es el primer momento de valor", "Cada métrica tiene umbral previo", "Ninguna es de vanidad"],
    exercise: { name: "Embudo propio", min: 20, desc: "Dibujá tu embudo AARRR, definí cada etapa y marcá dónde creés que se pierde más gente." },
    hyp: "Creemos que al menos [x%] de los activados seguirán activos en la semana [n].",
    experiment: "Medir el embudo completo con 10 a 20 clientes en el piloto. Evidencia: nivel 2.",
  },
  ventaja: {
    num: "09", name: "Ventaja injusta", risk: "mercado", origin: "Maurya",
    q: "¿Qué tenés que un competidor con más plata no puede copiar ni comprar fácilmente?",
    concept: "Algo que no se puede copiar ni comprar con facilidad. En etapa temprana es preferible dejarlo como “todavía no” a completarlo con algo falso.",
    questions: [
      ["Si una empresa grande copiara tu producto mañana, ¿qué te quedaría?", "El producto es la ventaja"],
      ["¿Tu ventaja crece con el tiempo o se gasta?", "La ventaja es permanente"],
      ["¿Se puede comprar con dinero?", "El capital como ventaja"],
      ["¿Qué tendría que pasar para que esta ventaja exista dentro de un año?", "La ventaja ya existe"],
    ],
    steps: ["Listá lo que te diferencia hoy.", "Tachá lo que se copia o compra en menos de un año.", "Si no queda nada, escribí “todavía no” y la ventaja que querés construir.", "Anotá cómo crecería con el uso.", "Regla: tiene que superar la pregunta del competidor con más plata."],
    example: { weak: "“Mejor tecnología y mejor atención”", strong: "“Todavía no. A construir: datos de ausentismo por especialidad que mejoran con cada consultorio”", why: "Es honesta y describe una ventaja que crece con el uso." },
    checklist: ["Supera el test del competidor con más plata", "No se compra con dinero en menos de un año", "Si no existe, está la ventaja a construir"],
    exercise: { name: "Juego de roles", min: 15, desc: "Una persona defiende la ventaja; la otra es un competidor con diez veces más recursos que explica cómo la copiaría." },
    hyp: "Creemos que [ventaja] será difícil de replicar porque [razón].",
    experiment: "Se monitorea en las Etapas 5 y 6: ¿la ventaja crece con cada cliente? Al principio suele ser nivel 0.",
  },
};

export const MINDSET = {
  title: "Un modelo de negocio nuevo es un conjunto de apuestas",
  lead: "El Lean Canvas sirve para escribirlas en una página, ver cuál es la más riesgosa y probarla primero.",
  cycle: [["Idea", "intuición", "concepto"], ["Hipótesis", "supuesto", "hipotesis"], ["Experimento", "test barato", "ejercicio"], ["Evidencia", "dato real", "evidencia"], ["Aprendizaje", "qué cambió", "concepto"], ["Decisión", "sigo o pivoto", "decision"]],
  versus: [["Socios clave", "Problema", "El riesgo mayor es resolver algo que nadie necesita"], ["Actividades clave", "Solución", "La solución nace del problema"], ["Recursos clave", "Métricas clave", "Saber qué medir"], ["Relación con clientes", "Ventaja injusta", "¿Qué impide que te copien?"]],
  errors: [["Enamorarse de la solución", "Empezar por la secuencia cliente → problema"], ["Definir al cliente como “todos”", "Early adopters concretos"], ["Confundir interés con demanda", "Escalera de evidencia"], ["Construir antes de validar", "Experimentos baratos antes del MVP"], ["No fijar el éxito de antemano", "Umbral bloqueado en la Experiment Card"], ["Dejar el Canvas estático", "Versiones y registro de cambios"]],
};
