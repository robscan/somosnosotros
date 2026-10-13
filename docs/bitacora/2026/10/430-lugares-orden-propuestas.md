# 430 · Prototipo: el orden de «Con eventos» y el desplegable con ubicación (OL-399)

**Fecha:** 2026-10-13. **Rama:** `lugares-orden-propuestas`, base `origin/main` (`9f81f2b0`, con OL-398 ya unido). **Operador:** Gestor VI (Fable 5.1), sin agente. **Solo documentación: una página de propuestas y sus capturas.**
**Estado:** espera la firma del founder.

## El pedido

Founder, 13 de octubre, al recibir OL-398: «Los eventos van antes que las expos cuando el usuario no tiene activa ubicación, y facilitar que usuario elija entre los mas cercanos primero y eventos próximos primero usando dropdown en la cabecera de listado de eventos del mapa, para cuando tiene activa la ubicación.»

Hoy (con OL-398) «Con eventos» va por la fecha de lo próximo de cada lugar: una exposición abierta desde septiembre sale antes que el concierto de mañana. Con ubicación, los dos grupos van por cercanía y no hay forma de pedir otro orden.

## La página

`docs/rediseno/prototipos/lugares-orden-propuestas.html`: dos teléfonos (sin ubicación y con ubicación, punto azul y kilómetros) y la hoja con dos preajustes (**Hoy** y **Propuesta**), cuatro ejercicios y el medidor. Los lugares son los de la captura del founder (Jardín Botánico, Laberinto, MUNI, CC200, Laboratorio, Casa Bauen) y los del respaldo; fechas y distancias puestas a mano para que salgan los casos: el MUNI con expo abierta **y** una charla con hora, ACHE con taller en curso, el Cossío solo con expo. Hoy es martes 13 de octubre.

| Ejercicio | Opciones | Propuesta |
|---|---|---|
| **O** · sin ubicación, qué va primero en «Con eventos» | por fecha (hoy) · con hora primero · en curso primero | **con hora primero**, por fecha; después lo en curso, el que cierra antes primero |
| **D** · dónde va el desplegable y qué ofrece | ninguno (hoy) · cabecera «N lugares» · cabecera «Con eventos» · chip junto a Filtros | **cabecera «N lugares»** (founder, 11:50: «el dropdown debe [ir] con la cantidad de lugares, agrega por orden alfabético también»). Las tres opciones con o sin ubicación: «Cercanos primero» · «Próximos primero» · «Alfabético»; sin ubicación, «Cercanos primero» pide el permiso (founder, 12:05: «agregar cercanos primero aunque no tenga activa ubicación, pero que eso haga que se active»). «Alfabético» ordena los dos grupos por nombre, sin mezclarlos (duda del founder, 12:00) |
| **E** · qué dicen sus opciones | «Cercanos primero» · «Próximos primero» / «Más cercanos primero» · «Eventos próximos primero» / «Cerca» · «Pronto» | **«Cercanos primero» · «Próximos primero»**: el founder, a las 11:45, al ver la página: «cortemos el letrero: Cercanos primero, Próximos primero» |
| **R** · el renglón de un lugar con expo abierta y evento con hora | lo primero por fecha (la expo) · el evento con hora · las dos líneas | **las dos líneas**: «Próximo: sáb 24 de oct · 12:00» y «Exposición hasta el dom 8 de nov» |

Medidor: cuántos de los cinco primeros de «Con eventos» tienen hora (sin ubicación), toques para cambiar el orden (con ubicación), el renglón más alto y cuántas expos abiertas se ven. Con la propuesta: 5 de 5, 2 toques, 140 px (el MUNI con nombre en dos líneas y sus dos líneas de vida), 2 de 2. Con «Hoy»: 1 de 5 y no se puede cambiar el orden.

## Capturas (`docs/rediseno/capturas-430/`, Chrome real, 390×844 a 2×)

- `01-hoy-sin-ubicacion.png` y `02-hoy-con-ubicacion.png`: lo de hoy; ACHE (taller) y MUNI (expo) encabezan «Con eventos», el Teatro de la Paz (hoy 20:00) va cuarto.
- `03-propuesta-sin-ubicacion.png`: Teatro de la Paz (hoy), San Miguelito (mañana), Laberinto (vie 16), MUNI (sáb 24)…; lo en curso al final del grupo; `03b-…-menu.png`, su desplegable con las tres opciones; `03c-…-alfabetico.png`, los dos grupos por nombre; `03d-…-pide-cercanos-permiso.png`, al elegir «Cercanos primero» sin ubicación, el permiso de Safari (simulado); `03e-…-permiso-dado-cercanos.png`, concedido: punto azul, kilómetros y por cercanía; `03f-…-permiso-negado.png`, negado: sigue «Próximos primero» con una línea que lo dice.
- `04-propuesta-con-ubicacion-cerca.png`: con ubicación, «Cercanos primero ⌄» junto a «10 lugares»; por distancia.
- `05-propuesta-con-ubicacion-menu.png`: el menú abierto con las tres opciones y la marca en la elegida.
- `06-propuesta-con-ubicacion-pronto.png`: «Próximos primero» puesto; el grupo cambia, los kilómetros siguen en cada renglón; `06b-…-alfabetico.png`, «Alfabético».
- `07-D-cabecera-con-eventos.png` y `08-D-chip-junto-a-filtros.png`: las otras dos posiciones del desplegable.
- `09-E-cortas.png`: el menú con «Cerca» y «Pronto»; `09b-E-largas.png`, con las frases largas de la primera versión.
- `10-R-el-evento-con-hora.png`: el MUNI diciendo solo la charla (pierde la expo).
- `11-O-en-curso-primero.png`: la tercera opción de O.
- `11b-R-muni-las-dos-lineas.png`: el renglón del MUNI con sus dos líneas.
- `12-pagina-entera.png`: la página con la hoja (1280 px).

## Cómo se haría (si se firma la propuesta)

- `agruparLugares` recibe el modo («cerca» o «pronto») y, sin ubicación o con «pronto», ordena «Con eventos» en dos tandas: lo con hora por fecha, luego lo en curso por cierre.
- `conProximo` guarda por lugar lo próximo con hora y, aparte, lo en curso; `RenglonLugar` pinta una o dos líneas. Todo sale de la consulta de eventos que ya trae `/lugares` (OL-398): sin tablas ni migración.
- El desplegable vive en la cabecera de la hoja de Lugares, junto a «N lugares» (`VistaLugares`); siempre con «Cercanos primero» · «Próximos primero» · «Alfabético»; sin ubicación, «Cercanos primero» pide el permiso por el camino del botón «Mi ubicación» (`puntoDeCercania`, `useUbicacionFresca`) y, negado, vuelve a «Próximos primero» con una línea; la elección se guarda con la memoria de pantalla de Lugares (`useMemoriaPantalla`) y vuelve a la primera opción en un teléfono nuevo.
