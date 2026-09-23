# 183 · Transiciones y cargador en la app (OL-148)

**Fecha:** 2026-09-23 · **Rama:** `transiciones-app`, desde `origin/main` · **OL:** OL-148 (código de OL-144) · **Modelo:** Sonnet 5, esfuerzo medio. Sin council ni subagentes (costo).

## De dónde sale

El founder ya firmó el prototipo de OL-144 («lo veo y lo apruebo»): fundido entre secciones, deslizamiento entre pestañas, la ficha que entra desde la derecha, y el símbolo SN en vez del letrero «Cargando». El gestor reservó OL-148 / bitácora 183 para pasar eso a código, con el archivo asignado en `docs/ops/ASIGNACIONES.md` (línea 68): `src/app/**/template.tsx`, `loading.tsx`, `globals.css`, `ui/Pestanas`.

Lo leído antes: `docs/rediseno/38-transiciones-cargador.md` (el documento firmado, con las duraciones, la curva y qué no se anima), la bitácora [179](179-transiciones-cargador.md) y el prototipo `docs/rediseno/prototipos/transiciones.html`.

## Qué se hizo

**El fundido entre secciones** (`src/app/template.tsx`, nuevo): 200 ms, solo al cambiar entre `/`, `/lugares` y `/artistas` exactos (no por un filtro, ni por la ciudad, ni la primera carga). Next remonta `template.tsx` en cada navegación a propósito, así que la sección "anterior" no puede vivir en estado de React (se perdería en cada remontaje): vive en una variable de módulo que arranca en `null` (por eso nunca anima la primera carga) y se actualiza en un efecto, no durante el render (la regla `react-hooks` de este repo no deja mutar una variable de módulo en el cuerpo del componente).

**El deslizamiento entre pestañas**: `PanelPestana` (en `ui/Pestanas.tsx`, con su CSS en `Pestanas.module.css`) recibe una `posicion` (el índice de la pestaña activa) y anima 200 ms en la dirección del cambio, solo cuando `posicion` cambia de verdad (no por una búsqueda, una fecha o una respuesta que llega tarde). Cableado con el cambio mínimo en los dos paneles reales: en `AgendaInicio.tsx`, envuelve `{cuerpo}` con `posicion={FILTROS.findIndex((f) => f.clave === filtro)}` (el orden de la tira: Todos·Cercanos·Siguiendo·Nuevos); en `VistaLugares.tsx`, envuelve el bloque que ya alternaba Mapa/Lista con `posicion={vista === "mapa" ? 0 : 1}` (Mapa a la izquierda de la tira, como en el botón "Ver la lista"/"Ver el mapa"). Ninguno de los dos toca `useMemoriaPantalla` ni el scroll: el `div` que añade `PanelPestana` no es el contenedor que se desplaza, y solo se remonta cuando cambia el índice, no en cada render.

**La ficha entra desde la derecha** (220 ms): nuevo `ui/EntradaFicha.tsx` (+ su CSS), que arranca con `transform: translateX(100%)` y pasa a `translateX(0)` un fotograma después de montarse (mismo truco que el prototipo firmado: sin eso, un `transition` no anima nada si el elemento ya nace en su lugar final). Se sumó dentro de `lugares/[id]/template.tsx` y `artistas/[id]/template.tsx`, sin crear un tercer envoltorio: siguen compartiendo el aviso de `PantallaConAviso` (OL-057), ahora dentro de `EntradaFicha`. "Atrás la devuelve": no se agregó una animación de salida — Next no da un gancho de "me estoy yendo" sin la View Transitions API (fuera de esta pieza, como dice el doc 38), así que Atrás simplemente vuelve al listado ya en memoria (memoria de pantalla), sin cargador, como pide el documento.

**El cargador**: `ui/SimboloCargando.tsx` (nuevo) es el símbolo SN (`docs/diseno/logotipo/LogoFinal/SN - Symbol.svg`) inline, con el pulso de opacidad (1 ↔ 0.42) y escala (1 ↔ 0.94) en 1.1 s. `Cargando.tsx` (pantallas interiores) y `CargandoRaiz.tsx` (pantallas raíz) lo usan en vez de los renglones esqueleto y el `<p>Cargando…</p>`; en `CargandoRaiz` la barra y la navegación siguen fijas, solo cambió el interior. Las clases viejas de `Cargando.module.css` (renglones, píldora, esqueleto) quedaron sin uso en ningún otro archivo, así que se reemplazó el CSS por la única regla que hace falta (`.centro`, para centrar el símbolo).

**`prefers-reduced-motion`**: las tres animaciones nuevas (fundido, deslizamiento de `PanelPestana`, entrada de ficha) tienen su propia regla `@media (prefers-reduced-motion: reduce) { animation: none }` / `transition: none`, además de la regla global de `globals.css` que ya pone `animation-duration`/`transition-duration` en 0.01 ms para toda la app. El símbolo del cargador, en cambio, no se queda en 0 sino en una opacidad fija de 0.75 (pedido explícito del doc 38): su propia regla en `SimboloCargando.module.css` gana sobre la global porque apaga el nombre de la animación, no solo su duración.

## Corrección del gestor: el deslizamiento sí entra en esta pieza

La primera entrega dejó `PanelPestana` listo pero sin cablear, leyendo la lista de archivos de `ASIGNACIONES.md` (línea 68) como el límite exacto de la pieza. El gestor corrigió: esa lista es orientativa, manda la entrada OL-148 de `OPEN_LOOPS.md`, que sí incluye el deslizamiento entre pestañas «donde viven los paneles». Encargo: cablear `PanelPestana` en `AgendaInicio.tsx` y `VistaLugares.tsx` con el cambio mínimo, sin tocar la memoria de pantalla ni el scroll repuesto. Hecho (ver arriba); commit aparte sobre el mismo `880193c`, misma rama, sin push.

## Verificación

`npm run lint` (1 warning preexistente en `docs/diseno/logotipo/iconos-sn.mjs`, ajeno a esta pieza), `npm run typecheck` y `npm test` (1056 pruebas, todas verdes) y `npm run build`: verdes. El entorno compartido no traía instalados `qrcode` ni `@vercel/analytics` (paquetes ya declarados en `package.json`, de otra sesión o instalación interrumpida); se completó con `npm install --no-save --no-package-lock` dentro de este árbol de trabajo únicamente (nunca en el `node_modules` compartido de la carpeta raíz): `package.json` y `package-lock.json` quedan intactos y `node_modules` no aparece en `git status` (ya está en `.gitignore`).

Prueba nueva del cargador: `src/components/ui/cargador.componentes.test.mjs` (Chrome real vía Playwright, como las demás `.componentes.test.mjs` del repo — no corre con `npm test`, que solo toma `.test.ts`, así que se corrió a mano): confirma que el `<svg>` lleva `aria-label="Cargando"` y que no queda el texto «Cargando…», que sin "reducir movimiento" el símbolo tiene una animación con nombre (late), y que con "reducir movimiento" la animación es `none` con `opacity: 0.75`. Las 3 pruebas pasaron.

### Capturas reales (`docs/rediseno/capturas-183/`), 390×844 a escala 2, abiertas y descritas

Con `next build && next start` y Chrome real (`playwright-core` instalado solo en el scratchpad de la sesión, nunca en el repo). Sin Supabase local (sin `.env.local`, ni copiado de otra carpeta): la Agenda y Lugares reales salen en su estado vacío, que es real y legítimo (así se ve la app el primer día). Para ver la ficha entrando con el enrutador real (con `notFound()` la ficha real no pasa por su propio `template.tsx`, porque el árbol de "no encontrado" no lo monta) se usó un arnés temporal, como el de la bitácora 181 (`src/app/arnes183-temporal`, con el mismo `template.tsx` + `EntradaFicha` reales de la app): **se borró antes de comitear y no aparece en `git status` ni en el build final** (confirmado: `next build` sin él en la lista de rutas).

- **`01-agenda-inicio.png`** — Agenda real, estado vacío («Aún no hay eventos próximos en San Luis Potosí»), pestañas Todos·Cercanos·Siguiendo·Nuevos, nav con Agenda activa en violeta.
- **`02-fundido-secciones-medio.png`** — fotograma intermedio del fundido Agenda→Lugares (animación alargada a 1.6 s solo para la captura, la app real sigue en 200 ms): toda la pantalla de Lugares visiblemente más pálida (logotipo, texto y aviso de Mapbox en gris muy claro) que su estado final.
- **`03-lugares-final.png`** — Lugares en su color final, pestaña Todos, aviso «Falta el token de Mapbox» (esperado sin variable de entorno en este entorno).
- **`04-ficha-entrando-medio.png`** — fotograma intermedio (arnés temporal) de la ficha deslizándose desde la derecha: se ve solo el borde derecho de la barra interior («‹ Atrás», el arranque del logotipo) entrando, el resto de la pantalla todavía blanco (fuera de cuadro a la derecha).
- **`05-ficha-final.png`** — la ficha del arnés ya en su lugar: «‹ Atrás», SMSNSTRS, título «Museo de mentira» y el texto de aviso del arnés.
- **`06-reducido-sin-fundido.png`** — con `reducedMotion: reduce`, la navegación Agenda→Lugares ya en su estado final sin fotograma intermedio que capturar (confirma que no hay fundido que fotografiar a medias).
- **`07-reducido-sin-deslizamiento.png`** — mismo caso para la ficha del arnés: ya en su lugar final de inmediato.
- **`08-cargador.png`** — el símbolo SN en tinta, centrado, capturado a mitad del pulso (más chico y algo más tenue que su tamaño de reposo).
- **`09-cargador-reducido.png`** — con "reducir movimiento", el mismo símbolo en gris parejo (opacidad fija 0.75, sin latido).
- **`10-deslizamiento-pestanas-medio.png`** — fotograma intermedio (animación alargada a 1.6 s solo para la captura) del deslizamiento Mapa→Lista en Lugares tras tocar «Ver la lista»: el título «Lugares» y el botón «Registrar un lugar» ya en su sitio pero claramente más pálidos (gris tenue) que su estado final.
- **`11-lista-final.png`** — la Lista de Lugares en su color final: «Lugares», «Aún no hay lugares en San Luis Potosí. Registra el primero.» y el botón en tinta plena.

Medida (no solo visual) de `prefers-reduced-motion`: `getComputedStyle(...).animationDuration` del fundido y `.transitionDuration` de la ficha, ambos en `1e-05s` (0.01 ms, la regla global); el símbolo del cargador, `animationName: "none"` y `opacity: "0.75"` exactos.

`git diff origin/main..HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` sobre los archivos de esta pieza: sin resultados.

## Qué falta

- Una animación de salida real para "Atrás" en la ficha (hoy simplemente no hay cargador ni animación de cierre): requeriría la View Transitions API, que el doc 38 deja para una vuelta futura.
- Prueba del founder en su iPhone (Safari), como toda pieza de UI.

## Archivos

`src/app/template.tsx`, `src/app/template.module.css`, `src/app/lugares/[id]/template.tsx`, `src/app/artistas/[id]/template.tsx`, `src/components/ui/EntradaFicha.tsx`, `src/components/ui/EntradaFicha.module.css`, `src/components/ui/SimboloCargando.tsx`, `src/components/ui/SimboloCargando.module.css`, `src/components/ui/Cargando.tsx`, `src/components/ui/CargandoRaiz.tsx`, `src/components/ui/Cargando.module.css`, `src/components/ui/Pestanas.tsx`, `src/components/ui/Pestanas.module.css`, `src/components/ui/cargador.componentes.test.mjs`, `src/components/AgendaInicio.tsx`, `src/app/lugares/VistaLugares.tsx`, `docs/rediseno/capturas-183/` (11 PNG), esta bitácora y `docs/ops/OPEN_LOOPS.md`.
