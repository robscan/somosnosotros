# 411 · La ficha de una exposición no enlaza una inauguración que ya pasó (OL-380)

**Fecha:** 2026-10-12. **Rama:** `inauguracion-pasada`, desde `origin/main` (`152ea11a`). **Operador:** Claude (agente del gestor VI). **Sin migración.**
**Estado:** lista para la revisión del gestor y su PR. Falta el «publica» del founder y verlo en su iPhone.

## El encargo

Founder (2026-10-12, pruebas con su iPhone): en la ficha de «DESIERTO: Observación y Espacio.» el renglón «Inauguración · viernes 9 de octubre» abre «Esto ya no está», porque el acto ya pasó. «Debemos procurar no poner opciones que generen errores.» Pide no enlazar lo pasado, o mostrarlo como pasado.

## La causa

En `src/app/eventos/[id]/page.tsx` el bloque «Horario» de una exposición (OL-321) pintaba el renglón de la inauguración como `<Link>` siempre que existiera `ligados.inauguracion`, sin mirar si el acto ya había pasado. La ficha de un evento pasado hace `notFound()` para quien no es su autor ni administra: de ahí «Esto ya no está».

## Lo que cambió

- **`src/lib/ligado.ts` (nuevo): `renglonLigado(l, ahora)`** decide si un evento ligado se enlaza y qué fecha dice. Usa la regla de siempre (`eventoPaso`: su fin, o 3 h después de empezar si no tiene, OL-358) y el formato de siempre (`formatearLargo`). Si ya pasó: `{ enlaza: false, cuando: "Fue el viernes 9 de octubre · 20:00" }`; si es hoy o viene: `{ enlaza: true, cuando: "viernes 9 de octubre · 20:00" }`.
- **Ficha de una exposición, bloque «Horario»:** la inauguración que viene sigue igual (enlace a su ficha con chevrón). La que ya pasó queda como un renglón de dato (`renglon.dato`, el mismo icono de estrella y la misma rejilla), sin enlace ni chevrón, con «Inauguración» en el gris del texto suave (`--texto-suave`) y «Fue el …» debajo. Sin tachar. El `li` lleva la clase directo, sin envoltorio (maquetación plana).
- **El camino inverso:** la ficha del acto de inauguración enlaza a su exposición («Inaugura …»). Si la exposición ya cerró, aplica la misma regla: renglón sin enlace, «Inauguró {título}» en gris y «Exposición · ya cerró». Pasa poco (un acto que viene casi nunca inaugura una expo ya cerrada), pero la ficha de un acto pasado sí la ve su autor, y la de la expo cerrada puede no ser suya.
- **`ficha.module.css`:** sección 4, `.ligadoPasado > b { color: var(--texto-suave); }`.
- **No se tocó** el programa del festival (otra pieza del gestor) ni el renglón «Parte de {festival}» de un acto.

## Pruebas

- `src/lib/ligado.test.ts` (4): el caso real (acto `2026-10-10T02:00:00Z`, sin fin, America/Mexico_City): con «ahora» el 12 de octubre a las 11:00 de San Luis, no se enlaza y dice «Fue el viernes 9 de octubre · 20:00»; el 9 de octubre a las 19:00, se enlaza y dice «viernes 9 de octubre · 20:00»; el borde de las 3 h (22:59 sí, 23:01 no); con fin manda su fin.
- `src/app/eventos/[id]/page.test.ts` (+3, «lo ligado que ya pasó no se enlaza (OL-380)»): la ficha de una expo con inauguración pasada no trae enlace a ella y dice «Fue el …»; con una futura trae el enlace; la ficha del acto no enlaza a una expo cerrada y sí a una abierta.
- `npm run lint` (0 errores; 1 aviso que ya estaba, en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (198 archivos, 3586 pruebas) y `npm run build`, en verde.

## Capturas (390×844, `docs/rediseno/capturas-411/`)

Con `next build` + `next start` de la rama contra un respaldo Node local sin red (filas inventadas, sin sesión: visitante), `.env.local` temporal con la URL del respaldo y una llave pública inventada (ya borrado), y playwright-core con el Chrome de la Mac. La página está desplazada para que el bloque «Horario» quede en medio (por eso el título de la cabecera queda bajo los botones flotantes, como siempre al desplazar).

- `01-inauguracion-pasada.png`: «Arena: exposición de prueba» (inventada; inauguración el viernes 9 de octubre a las 20:00, sin fin, como la del founder). Bajo el horario (Ma–Sá, 10:00 a.m.–6:00 p.m.), el renglón con la estrella, «Inauguración» en gris y «Fue el viernes 9 de octubre · 20:00»; sin chevrón. Medido: sin `<a>` en el renglón, 59 px de alto, el título en `rgb(92, 92, 92)` (texto suave).
- `02-inauguracion-futura.png`: «Marea: exposición de prueba» (inauguración el viernes 23 de octubre a las 19:00). El renglón como antes: «Inauguración» en negro, «viernes 23 de octubre · 19:00» y el chevrón; enlace a `/eventos/inauguracion-futura`, también 59 px de alto (la misma rejilla).

## Por confirmar

1. **«Fue el …» con la hora** («Fue el viernes 9 de octubre · 20:00»): sale de reutilizar `formatearLargo` tal cual. Si el founder prefiere sin hora («Fue el viernes 9 de octubre»), es quitar la hora en `renglonLigado`.
2. **Tampoco se enlaza para el autor ni para la administración**, que sí podrían abrir la ficha pasada. Una sola regla para todos; si quieren conservar el enlace para ellos, se pasa `puedeEditar`.
3. **El texto del camino inverso** («Inauguró {título}» · «Exposición · ya cerró»): lo decidí yo, sin prototipo.
4. **«Parte de {festival}»** en la ficha de un acto tiene el mismo riesgo si el festival ya terminó; no lo toqué porque el festival es pieza del gestor. Con `renglonLigado` es el mismo cambio de dos líneas.
