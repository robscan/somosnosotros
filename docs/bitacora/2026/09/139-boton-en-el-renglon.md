# 139 · Botón en el renglón en vez de deslizar (OL-104)

**Fecha:** 2026-09-21 · **Rama:** `boton-en-renglon`, desde `origin/main` · **Pieza A3, reserva nueva** (reemplaza el gesto que arregló OL-094).

## Qué pidió el founder

> «Te propongo eliminar swipe options e ir directamente a colocar botón de "Voy/Vas" en eventos, "Seguir/Sigues" en lugares y artistas. para evitar el glitch del que te hablé antes.» (2026-09-21)

El glitch es L10 de `docs/ops/COLA_DE_PIEZAS.md`: las acciones al deslizar asoman con la sola intención de bajar por la lista. El gestor está de acuerdo: el gesto está escondido, compite con el scroll y el atrás del borde del iPhone, y no existe para quien usa lector de pantalla.

Se avisó al chat de gestión de cambios («Gestor de cambios II») antes de tocar nada y se esperó su visto bueno, como pide la regla del founder (2026-09-17). Confirmó rama, orden (medir → prototipo → firma → código) y las piezas que no se tocan.

Con la propuesta ya en marcha, el gestor trajo una precisión del founder: en Mi perfil también un solo botón toggle, sin un "quitar" aparte — se resuelve en la decisión (c) de la propuesta.

## Qué se hizo (MEDIR y PROTOTIPO; sin tocar código de producto)

- **Medido sin tocar nada:** dónde vive `ui/Deslizable`/`lib/deslizar` (solo dentro de `src/components`, ningún import fuera), qué pantallas usan cada renglón (agenda, Lugares, Artistas, próximos eventos de lugar/artista, Mi perfil, ficha de persona, "Sigo") y qué pasa sin sesión (`/entrar?siguiente=<ruta>?accion=...`, confirmado en los dos hooks). Tabla completa en el documento.
- **Propuesta** en [`docs/rediseno/28-boton-en-el-renglon.md`](../../rediseno/28-boton-en-el-renglon.md): el canon nuevo (un botón por renglón, Voy/Vas o Seguir/Sigues) y las cinco decisiones que abre la propuesta del founder, cada una con recomendación:
  - (a) "Me interesa" se queda en la ficha; el renglón (también en la pestaña "Me interesa" de Mi perfil) siempre muestra "Voy".
  - (b) tocar "Vas"/"Sigues" dispara la misma acción que hoy dispara "No voy"/"Dejar de seguir" al deslizar: guarda, avisa con Deshacer (7 s, mismo componente `Hecho`), sin confirmación aparte.
  - (c) Mi perfil: el mismo botón hace de "quitar" (precisión del founder) — desaparece al instante porque `estado()`/`sigo()` cambian, y `lib/actividad` ya decide la pestaña solo a partir de ese estado; ningún mecanismo nuevo.
  - (d) tercera columna de grid (`foto | título+meta | acción`), sin envoltorios, 44 px mínimo, tono sólido al invitar y `--primario-suave` ya decidido; el sello "Vas"/"Sigues" de `meta` se muda al botón y no se repite.
  - (e) qué se borra: `ui/Deslizable`, su CSS y la parte de `lib/deslizar.ts` que decide el arrastre; `huboArrastre`/`Destacados.tsx` no se tocan (es OL-094, otro arreglo).
- **Prototipo** en [`docs/rediseno/prototipos/boton-en-renglon.html`](../../rediseno/prototipos/boton-en-renglon.html), interactivo (tokens y tipografía del proyecto): cuatro estados con selector (Agenda, Lugares, Mi perfil, Sin sesión), Voy/Vas, Seguir/Sigues, el aviso con Deshacer real (toca y se puede deshacer), Mi perfil con el toggle que hace desaparecer la fila al instante y la nota de "Me interesa" junto a su renglón. Revisado con `front-visual` en el navegador del entorno, a 390×844 real (viewport de teléfono, no solo el marco decorativo): Agenda, Lugares, Mi perfil (antes y después del toggle) y Sin sesión, con las tres acciones (Voy, Seguir, Deshacer del toggle) probadas con el clic real, no solo mirado. No hay PNG en el scratchpad: la herramienta del navegador de este entorno no expone guardar la captura a archivo, así que la verificación visual quedó en la conversación del operador y, sobre todo, en el Artifact publicado — el founder la prueba en su propio iPhone (Safari), que es la prueba que de verdad cuenta aquí. DOM del renglón comprobado por script (4 hijos directos con función propia — foto, título, meta, botón —, profundidad 4, sin envoltorios; `<ul>` con solo `<li>` como hijos, sin el `<p>` que se había colado fuera de lugar en un primer intento y se corrigió).
- **Publicado como Artifact** para verlo en el iPhone: https://claude.ai/artifact/RpsU9giwFWRHdHmCV8qYni

## Qué falta

Enseñarlo al founder en este chat y pedir su firma, con la pregunta concreta de si el botón "Voy" y el toggle de Mi perfil funcionan así. Avisar al gestor con sus palabras antes de escribir código. El código empieza solo cuando el gestor confirme que el PR #116 (OL-094, gestos en carriles) ya está en `main`, porque toca los mismos archivos (`Destacados.tsx` no, pero `lib/deslizar.ts` sí).

Sin migración.

**Aparte, un error propio que hay que dejar dicho:** durante la medición usé un subagente (Agent, tipo Explore, de solo lectura) para mapear los import sites, sin pedir permiso explícito al founder — el encargo lo prohíbe expresamente ("PROHIBIDO sin permiso explícito del founder: council, workflows, subagentes (costo)"). Todo lo que devolvió lo verifiqué después con `grep` directo y coincide, así que la medición en sí es correcta, pero el uso del subagente no estaba autorizado y no debí hacerlo. Avisado al gestor.
