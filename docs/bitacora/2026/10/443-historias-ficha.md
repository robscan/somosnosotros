# 443 · Historias de Inicio: «Ver más información» y el desplazamiento que no vuelve (OL-412)

**Fecha:** 2026-10-14, tarde. **Rama:** `historias-ficha`, base `main` (`1505ccb0`). **Operador:** Gestor VI (Fable 5.1), sin agente. **Arreglo urgente.**

## El pedido

Founder, 14 de octubre por la tarde, desde su iPhone: «En historias no sirve el botón de ver ficha», «Además no se entiende ficha puede decir: Ver más información», «De hecho después de fallar el botón en historia, no me deja hacer scroll», «gravísimo error», «pide a codex que te ayude a encontrar errores, este y otros de este tipo».

## Lo que se encontró

- **No se reprodujo el fallo del botón.** En Chrome con toque emulado (playwright, 390×844, reloj del navegador fijado al día del respaldo) y en el simulador de iPhone 17 con iOS 27 (Safari, la app compilada contra el respaldo local sin `.env`, servidor y respaldo con el reloj real para que salga la fila «Ahora»), tocar «Ver ficha» abre la ficha y la ficha se desplaza. En producción, las 40 fichas de evento que enlaza Inicio responden 200 sin sesión. Quedan por saber del founder: qué pasó al tocar (nada, se cerró, pasó de historia, ficha en blanco), dónde murió el desplazamiento (Inicio o la ficha) y si fue la app instalada o Safari.
- **Sí había un punto frágil que explica un desplazamiento muerto.** Las historias ponían `html.style.overflow = "hidden"` al abrir y lo reponían solo al desmontar el componente (`useEffect` cleanup), guardando «lo que había antes». Si el desmontaje se retrasa (al navegar a la ficha, mientras llega) o no ocurre, o si otra capa ya había puesto `hidden`, la página se queda sin desplazamiento. El visor de imagen y la hoja de Lugares (`ui/Hoja`, con su cuenta de hojas abiertas) tocan el mismo `overflow` de `html`.

## Qué cambió

- `src/components/inicio/Historias.tsx`: el bloqueo del desplazamiento pasa a un atributo, `html[data-historia]`, que se quita (1) en `salir()` en cuanto empieza el cierre, sin esperar al desmontaje; (2) al tocar «Ver más información», antes de navegar; (3) al desmontar; (4) en `pagehide`. Es idempotente: no adivina qué había antes. El botón dice **«Ver más información»**.
- `src/app/globals.css`: la regla `html[data-historia] { overflow: hidden; }`, al final del archivo (dentro del bloque `@supports` de la letra rompía la prueba `letra.test.ts`).
- `src/components/inicio/FilaAhora.componentes.test.mjs`: el enlace se llama «Ver más información».
- Nota a Codex en `.buzon/gestor-codex.md` (fuera de git) con el pedido del founder: la causa exacta en Safari iOS y la revisión de errores de este tipo en toda la app.

## Evidencia

- `npm run lint` (0 errores, 1 aviso que ya estaba), `npm run typecheck`, `npm test` (3 939), pruebas de componentes de `FilaAhora` y `HistoriasZoom` (13), `npm run inventario` sin novedades, `npm run medir` (ver abajo).
- `docs/rediseno/capturas-443/01-historia-ver-mas-informacion.png`: la historia en el simulador de iPhone 17 (iOS 27, Safari) con el botón nuevo.
- `02-ficha-tras-el-boton.png` y `03-ficha-desplazada.png`: al tocarlo abre la ficha y la ficha se desplaza (simulador, app compilada con el arreglo).

## Para el founder

Si el fallo sigue en su iPhone tras publicar, los tres datos de arriba (qué pasó al tocar, dónde murió el desplazamiento, app instalada o Safari) señalan la causa: el enlace, el cierre o la carga de la ficha.
