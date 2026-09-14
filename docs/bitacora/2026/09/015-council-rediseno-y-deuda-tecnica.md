# 015 · Consejo sobre el rediseño, deuda técnica y aprendizaje de robscan (2026-09-14)

Sin rama todavía (cambios en el árbol de trabajo, pendientes de PR). El founder abrió la sesión con tres decisiones: fuera "segunda ciudad" (todo el esfuerzo en San Luis Potosí); la app es compleja y hay que rediseñar la experiencia bajo UX invisible; hace falta un directorio de artistas y grupos locales. Pidió someterlo a consejo.

## 1. Consejo (acta: [COUNCIL_rediseno-ux-y-artistas_2026-09-14.md](../../../council/COUNCIL_rediseno-ux-y-artistas_2026-09-14.md))

Seis sillas (Contrario, Empirista, Guardián, Esteta, Ejecutor, Plataformista), opiniones independientes → revisión cruzada a ciegas → Chairman. **Veredicto: VoBo condicionado.** No pasa "rediseño integral" ni "entidad artistas" como estaban escritos; pasa la versión acotada: primer momento del inicio, "quién" como campo de texto en el evento, canvas de diseño acotado a 2–3 pantallas y solo después de una línea base. Hallazgos técnicos que sí eran reales y baratos: sin páginas de error en español, sin `prefers-reduced-motion`, sin `:focus-visible`, tarjeta copiada en 5 módulos, 10 tamaños de letra sin escala, fecha sin año (un evento de 2027 se leía como pasado), encuadre inicial del mapa sin pins, envíos de avisos uno por uno sin tope de duración, imágenes de 3–5 MB subidas sin reducir.

**Corrección del founder tras el acta:** él es founder y experto en UX/UI; sus señalamientos de fricción son opinión experta con autoridad, no una sensación que haya que "medir con usuarios". No habrá pruebas con gente mientras la experiencia genere fricción. Las reglas de diseño se aprenden de **robscan**, su herramienta para validar proyectos. Queda registrado en la memoria del agente y en este repo ([PRINCIPIOS_UX.md](../../../PRINCIPIOS_UX.md)).

## 2. Deuda técnica y de arquitectura corregida (lo que el founder aprobó: "errores en español y todo lo de arquitectura")

- **Páginas de error en español**: `src/app/not-found.tsx` ("Esto ya no está" + volver a la agenda) y `src/app/error.tsx` ("Algo falló" + intentar de nuevo + volver). Antes, un enlace de evento borrado caía en la página inglesa de Next.
- **Tokens en `globals.css`**: escala de letra en rem (`--letra-xs`…`--letra-3xl`; el html pasa a `font-size: 100%` para respetar el tamaño de texto del teléfono; los campos nunca bajan de 16px), `--toque-min: 44px` además de `--toque: 48px`, colores que estaban sueltos (`--ok`, `--fondo-miniatura`, `--fondo-mapa`, `--asa`, `--vidrio`, sombras). Ningún módulo CSS conserva un tamaño de letra ni un color literal.
- **`:focus-visible`** global (solo teclado, nunca tras un toque) y **`prefers-reduced-motion`** global; el `Sheet` y el encuadre del mapa lo respetan también desde JS.
- **Componentes compartidos**: `ui/Tarjeta` (una sola tarjeta de lista; la usan agenda, lugares, perfil, personas y admin; se borraron las cinco copias de `.tarjeta`) y `ui/Chip` (`Chip`, `ChipNativo`, `Chips`, con `aria-pressed`; salieron de `SelectorCuando`). Pestañas y chips suben de 40 a 44 px.
- **Sheet**: declara por escrito sus excepciones al contrato heredado `BOTTOM_SHEET.md` (sin cerrar, cabecera de marca, el mapa no lo colapsa), como exige la sección 9 de ese contrato.
- **Fechas**: `formatearCuando` y `formatearLargo` escriben el año cuando no es el actual ("dom 22 de ago de 2027"). Prueba nueva.
- **Mapa**: al abrir, encuadra todos los pins con el panel a media altura tapando la mitad de abajo (`fitBounds`, zoom máximo 15); con un lugar centrado por URL no se toca.
- **Avisos**: `enviarPush` manda a todos los teléfonos en paralelo; `avisar` atiende a las personas por lotes de 10 (push y correo a la vez) e inserta los enviados de una vez; `enviarRecordatorios` devuelve eventos, destinatarios, enviados y milisegundos; `/api/recordatorios` declara `maxDuration = 60` (tope del plan Hobby) y escribe el resumen en el log.
- **Imágenes**: `lib/imagen.ts` reduce la foto en el navegador antes de subirla (lado máximo 1 600 px, JPEG 0.82); si el navegador no puede, sube la original. Lo usan perfil, lugar y evento.

## 3. Verificación (390×844, servidor local, base real, usuario desechable borrado)

- Inicio: el mapa encuadra el pin de Casa 1100 / Laboratorio (están a metros uno del otro); tarjeta de agenda con la nueva `Tarjeta`.
- `/eventos/<id inexistente>`: "Esto ya no está · Puede que lo hayan borrado…" con "← Ver la agenda".
- Alta de evento con sesión (usuario `prueba-chips-015@`, borrado al final): "Cuándo → Cambiar" abre los chips; los ocho miden 44 px y reportan `aria-pressed`.
- Lint, typecheck, **53 pruebas**, build en verde.
- Un susto que no era: tras editar con el servidor de desarrollo encendido, el mapa dejó de disparar "load" (recarga en caliente a medias). Con recompilación completa volvió a funcionar; el código original y el nuevo se comportan igual.

## 4. robscan V3.3 aprendido

Leído completo el paquete (`~/claude/proyectoTrabajo/robscan-V3.3.zip`): operador `/robscan` (compuertas G0–G5), `/machete`, `/bob`, la carta de leyes UX (nivel A siempre activo: UX invisible, progressive disclosure, evidencia nunca promesa, el gesto gana, Peak-End; confirmadas Goal-Gradient, Hick, Fitts, Common Region, topografía de navegación; nivel B por señal; nivel C por aprender con pregunta), reglas de prototipo compartible (cuatro estados por pantalla, toast solo éxito, prevención antes que corrección, panel de estados forzables generado desde la spec) y el protocolo de redacción (Minto, hipervínculos, glosario). Resumen en [PRINCIPIOS_UX.md](../../../PRINCIPIOS_UX.md) y en la memoria del agente.

## Qué sigue

Plan reformulado con robscan como método: ver OPEN_LOOPS "Ahora". Pendiente del founder: revisar y pedir el commit/PR de esta sesión.
