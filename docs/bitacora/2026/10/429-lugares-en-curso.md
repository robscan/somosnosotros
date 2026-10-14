# 429 · «Exposición hasta el …» en la lista de Lugares (OL-398)

**Fecha:** 2026-10-13. **Rama:** `lugares-en-curso`, base `origin/main` (`271085ad`). **Operador:** Gestor VI (Fable 5.1), sin agente. **Sin migración y sin tablas nuevas.**
**Estado:** lista para el «publica» del founder.

## El pedido

Founder, 2026-10-13 por la mañana, con una captura de la lista de Lugares en su iPhone: «Actualmente el mapa presenta Muni Museo como próximo cuando ya pasó, entiendo que se refiere a la exposición activa, entonces por favor los lugares que tienen expos o talleres activas que digan eso en el listado de mapa, me gusta que pones hasta cuando terminan.»

El renglón del MUNI decía **«Próximo: vie 2 de oct · 00:00»**: el «próximo evento» del lugar es el primero por inicio de los que no han pasado (`filtroSinPasar`: termina ≥ ahora), y una exposición abierta no ha pasado aunque haya empezado hace días; su inicio es el primer minuto de su primer día, de ahí el «00:00».

## Lo que cambia

Una sola regla, en `textoProximo` (`src/lib/lugares.ts`), la línea de vida del renglón de lugar (`RenglonLugar`, la lista y las fichas de persona) y de la tarjeta de lugar de los Destacados (`tarjetaLugar`):

- **Exposición, taller o festival ya en curso** (su inicio quedó atrás y tiene fin): **«Exposición hasta el dom 8 de nov»**, **«Taller hasta el vie 23 de oct»**, **«Festival hasta el dom 18 de oct»**. La palabra es la corta de su clase (`cortoDeClase`); el día de cierre, en la zona del evento, con el formato de todos los días de la app (`diaConMesDe`), como el «Hasta el …» de las tarjetas de Inicio que al founder le gusta.
- **Exposición o festival que todavía no abre:** sus días, **«Exposición del 16 al 30 de oct»** (`rangoCorto`): tampoco tienen una hora que decir.
- **Taller por empezar:** su primera sesión, como cualquier evento («Próximo: sáb 17 de oct · 10:00»): esa sí es una hora.
- **Todo lo demás, igual:** «Próximo: hoy · 19:00», «Próximo: vie 16 de oct · 18:00».

Para saberlo, las dos consultas que alimentan el «próximo» de cada lugar traen también `clase` (la de `/lugares` ya traía `fin`): `src/app/lugares/page.tsx` y `conProximos` en `src/app/personas/consultas.ts`. `ProximoEvento` gana `fin` y `clase` opcionales y `conProximo` los deja pasar cuando llegan. Nada cambia en el orden de los grupos («Con eventos» va por el inicio del próximo: lo que ya está en curso, primero, como en «Festivales y expos» de Inicio) ni en los pines del mapa (una exposición no «es hoy», regla de doc 55).

## Verificación

- `npm run lint` (0 errores; 1 aviso que ya estaba en `main`), `npm run typecheck`, `npm test` (3 767 pruebas, 6 nuevas en `src/lib/lugares.test.ts`: puntual, exposición abierta y el mismo día de abrir, por abrir, taller y festival en curso, taller por empezar, sin fin), `npm run inventario` (342 medidas en duro, sin novedades), `npm run medir` (sin novedades; las dos pantallas de Lugares no cambian de nodos). Lección del día: la primera corrida dio dos presupuestos de más (Novedades a 1280 y el alta de evento por pasos, +3 y +4 nodos) porque el árbol tenía enlazado el `.env` del checkout principal y `next build` lo carga: con las llaves reales la app enciende piezas (las sugerencias del alta) que el respaldo no contempla. Sin el `.env`, en verde. `medir` y las capturas se corren en un árbol sin `.env`.
- Captura 390×844 contra el respaldo local (datos inventados, reloj fijo del 7 de octubre), `docs/rediseno/capturas-429/01-lugares-lista-muni-exposicion-hasta.png`: la lista de Lugares como abre, «Con eventos · 7»; el renglón del MUNI dice **«Exposición hasta el dom 8 de nov»** («Un mundo para mí», abierta desde septiembre) donde antes decía «Próximo: lun 21 de sep · 00:00», y el del Centro Cultural Universitario Bicentenario, **«Festival hasta el mar 24 de nov»** (su festival ya empezó) donde antes decía el inicio de su primer acto. Los demás siguen con «Próximo: mañana · 19:30», «Próximo: vie 9 de oct · 17:00»…

## Queda por decidir con el founder

- Un lugar con una exposición (o un festival) en curso **y** un concierto el viernes dice la exposición: lo que ya está en curso va primero. Si prefiere que gane lo que tiene hora, es cambiar el orden en `conProximo`.
- Un evento puntual de varios días ya empezado (raro: «Del 6 al 8 de oct» a las 10:00) sigue diciendo «Próximo: …» con su inicio; no se tocó.
