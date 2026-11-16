# Lean Canvas Playbook — Ultreia

Herramienta para construir, cuestionar y validar un modelo de negocio con el Lean Canvas. Es una web estática publicada con **GitHub Pages**. No hace falta cuenta de Claude:

- **Datos y acceso:** viven en **Supabase**. Se entra con el mail, mediante un link mágico, y cada proyecto lo ven solo las personas invitadas.
- **Coach con IA:** usa la **API de Anthropic** a través de una función de Supabase. La clave queda en el servidor y nunca llega al navegador.

El mismo código también corre como artifact de Claude, si `js/config.js` queda vacío, y en modo local, con los datos guardados en el navegador.

## Qué hace

| Etapa | Vista | Qué se guarda |
| --- | --- | --- |
| 1. Mindset | Idea en una oración, ciclo Idea → Decisión | `idea`, verificaciones |
| 2. Los 9 bloques | Fichas A–H de cada bloque, checklist y ejercicio | Contenido del bloque, checklist |
| 3. Construcción | Lean Canvas editable con versiones y registro de cambios | `versions`, `changelog` |
| 4. Validación | Hipótesis con ID, matriz importancia × incertidumbre, Experiment Cards | `hypotheses`, `experiments` |
| 5. Iteración | Learning Cards y tablero hipótesis → decisión | `learnings` |
| 6. Plan de acción | Riesgos, roadmap 30/60/90 con compuertas y resumen ejecutivo | `plan` |

Incluye el caso de ejemplo **TurnoClaro**, con datos ficticios y resultados simulados.

## Coach con IA

Aparece como un botón en cuatro momentos: al revisar un bloque, una hipótesis, una Experiment Card o una Learning Card. Hay además un quinto botón para revisar la coherencia del Canvas completo. Reglas:

- **Revisa, no escribe por el equipo.** Devuelve estado, fortalezas, problemas, una sugerencia y una pregunta.
- **Nunca valida hipótesis.** Eso lo decide el equipo con evidencia.
- **Nada se aplica solo.** Cada sugerencia se acepta o se descarta.
- **Queda registro.** Cada revisión se guarda en `coach` para que el facilitador vea cómo trabajó el equipo.
- **Si no está disponible, la app sigue funcionando.** Por ejemplo, si el usuario no da permiso o no hay sesión de Claude.

Los prompts y las reglas del método están en `js/coach.js`.

## Estructura

```
index.html          punto de entrada
css/app.css         sistema visual (tokens del diseño en Pencil)
js/content.js       contenido metodológico: fichas, niveles de evidencia, etapas
js/store.js         datos: capacidad `db` de Claude, o localStorage fuera de Claude
js/coach.js         coach con IA (capacidad `sample`)
js/seed.js          proyecto de ejemplo TurnoClaro
js/app.js           vistas, rutas y acciones
```

## Modelo de datos

```
projects/{pid}                      nombre, idea, versión actual, checklists, plan
projects/{pid}/versions/{vid}       n, label (v0, v1, v1.1…), blocks{…}, nota
projects/{pid}/hypotheses/{hid}     code (H01…), block, text, risk, importance, uncertainty, status
projects/{pid}/experiments/{eid}    code (E1…), hypotheses[], test, metric, criteria, committed
projects/{pid}/learnings/{lid}      experimentId, believed, observed, level 0–3, learned, decision, results{hid: status}
projects/{pid}/changelog/{id}       version, text, evidence
projects/{pid}/coach/{id}           registro de revisiones del coach
```

Hay tres reglas de negocio que el código hace cumplir:

- **Al comprometer una Experiment Card, el criterio queda bloqueado.** También tiene que incluir un número.
- **Una Learning Card actualiza el estado de las hipótesis vinculadas.**
- **Las versiones anteriores del Canvas son de solo lectura.**

## Puesta en marcha (web)

1. **Base de datos.** Aplicar `supabase/migrations/001_playbook.sql` en el proyecto de Supabase.
2. **Coach.** Desplegar la función `supabase/functions/coach` y cargar el secreto `ANTHROPIC_API_KEY`. Hay un secreto opcional, `COACH_DAILY_LIMIT`, que fija cuántas consultas diarias puede hacer cada usuario (60 por defecto).
3. **Conexión.** Completar `SUPABASE_URL` y `SUPABASE_KEY` (la clave publicable) en `js/config.js`.
4. **Acceso.** En Supabase, ir a Authentication → URL Configuration. Poner la URL de GitHub Pages como **Site URL** y agregarla en **Redirect URLs**.
5. **Publicación.** En GitHub, ir a Settings → Pages → Deploy from a branch y elegir `main` con la carpeta `/ (root)`.

### Acceso a los datos

- **Quién ve un proyecto:** cada proyecto tiene una lista de miembros, `project_members`. Las políticas de seguridad de la base solo dejan leer y escribir a quienes están en esa lista.
- **Quién lo administra:** quien crea un proyecto queda como dueño y es el único que puede agregar o quitar personas.

## Capacidades del artifact (modo Claude)

`db` y `user` guardan y comparten los proyectos; `sample` hace funcionar el coach; `downloads` exporta el resumen en `.md`.

## Desarrollo local

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

Fuera de Claude, los datos quedan en el localStorage del navegador y el coach no aparece.

## Publicar

El artifact se publica desde estos archivos con la herramienta de artifacts de Claude: `index.html`, `css/` y `js/`. Después de un cambio, se vuelve a publicar sobre el mismo artifact.
