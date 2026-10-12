# 408 · Prototipo con propuestas para las pruebas de usuario (OL-377)

**Fecha:** 2026-10-12. **Rama:** `prototipo-inicio-propuestas`, base `origin/main` (`152ea11a`). **Operador:** Gestor de cambios VI (Fable 5.1), sin agentes. **Sin migración ni código de la app.**
**Página privada para comentarios:** https://claude.ai/artifact/8EpqEMd3c3n553UqND5KQ8 (versión 1, «Propuesta (12 oct)»). **Estado:** esperando los comentarios del founder; la firma quedará como preajuste «Firmada».

## Qué pidió el founder (2026-10-12, pruebas de usuario con su iPhone)

«Revisa lo que te digo y arma prototipo con propuestas.» Los puntos que no son fallos (los fallos van a código aparte: OL-378 a OL-381):
1. Nombres cortados en «Lugares de la semana» y «Artistas de la semana» («Casa de C…», «Centro de…»): que se lean.
2. Destacados y «Seleccionados para ti» siempre en la primera línea, y un tamaño más grande, «como el de Instagram».
3. Lo que le interesa, solo con el icono arriba a la derecha en vez del chip «Te interesa».
4. Bajo la tarjeta, primero la fecha y luego el lugar.
5. Dentro de un festival se ven actos que ya pasaron, con enlace a «Esto ya no está»: lo pasado se queda, pero separado y sin enlaces rotos.

## La página

`docs/rediseno/prototipos/inicio-propuestas.html` con 74 archivos en `inicio-propuestas/` (1,9 MB). Armazón de `portadas-sistema.html` (bitácora 405): los dos teléfonos («Hoy» y la combinación), la hoja con preajustes, medidor, ejercicios, pruebas con cronómetro y notas; desde 760 px el teléfono y la hoja al lado; desde 1180, los dos teléfonos.

- **«Hoy» es la producción del 12 de octubre a las 09:21**, con el código de la app empaquetado con esbuild (`cargarAgenda`, `calcularCarrilesAgenda`, `tarjetaDeInicio`, `paletasDeCarril`, `candidatosAhora`, `cargarEventosSemana`, `cargarArtistasDestacados`…), leído de producción en solo lectura con la cuenta del founder: sus «Voy» y «Me interesa» reales son «Tus planes» (6) y el carril estelar se llama «Seleccionados para ti» (12). 124 eventos vigentes, 20 de esta semana, 9 festivales y expos, 4 nuevos, 21 lugares y 15 artistas de la semana, 10 artistas destacadxs. La fila «Ahora» trae el «Inaugura hoy» de DESIERTO (lo arregla OL-379) y Destacados trae «Cinema» y «CINEMA, clausura» (lo arregla OL-378): el prototipo no los esconde.
- **Las portadas del sistema** se dibujan con el mismo módulo del prototipo 405 (el de la app), con la base y la banda que calculó `paletasDeCarril` en la extracción.
- **Los festivales traen todos sus actos**, también los pasados (CINEMA 5 de 11, Fotovisión 11 de 16, Ciclo Fellini 3 de 6), para la ficha.
- Los guiones (extracción, armado, capturas) quedaron en el scratchpad de la sesión, no en el repo. La página trae su modelo dentro (`<script type="application/json" id="datos">`).

## Los ejercicios (cada uno mueve una palanca; se combinan)

| Clave | Qué cambia | Opciones |
|---|---|---|
| **N** | El nombre en los avatares de 64 | Una línea (hoy) · **Dos líneas** (cortadas en palabra) · Columna ancha (96 px, se ven 3,5) · Nombre al lado (foto de 48 y el nombre en dos líneas a su derecha, 168 px) |
| **D1** | Destacados antes de «Tus planes», debajo de la fila «Ahora» | interruptor |
| **D2** | Tamaño de Destacados (solo ese carril) | Grande (165, hoy) · **XL** (248, se ve una y media, título 19 px) · Ancho (350, una por pantalla, «como Instagram») |
| **I1** | Lo que te interesa | Chip (hoy) · **Icono arriba a la derecha** (el sello pasa a la izquierda) · Icono bajo el sello · Icono junto al título. «3 van» sigue como chip |
| **F1** | Bajo la tarjeta, primero cuándo (violeta) y luego dónde (gris) | interruptor |
| **X1** | En la ficha del festival, lo que ya pasó | Todos juntos (hoy, con enlace a «Esto ya no está») · **Aparte, sin enlace** (sección «Ya pasó», en gris) · Aparte, como pasado (cada acto abre su ficha en pasado: lo que traerá el historial) |
| **X2** | «Ya pasó» empieza plegado («Ya pasó · 5 actividades») | interruptor |

Preajustes: **Hoy** (todo apagado), **Propuesta** (N dos líneas · D1 · D2 XL · I1 arriba a la derecha · F1 · X1 aparte · X2) y **Firmada** (por firmar: mientras, es la propuesta). La ficha del festival se abre tocando Cinema, Fotovisión o Ciclo Fellini; Atrás vuelve a Inicio; la hoja trae los botones «Inicio» y «Ficha del CINEMA».

## Lo que mide (medidor de la hoja, en Chrome a 390×844)

| | Hoy | Propuesta | Columna ancha | Nombre al lado |
|---|---|---|---|---|
| Nombres cortados (de 36: 21 lugares + 15 artistas) | 26 | 19 | 10 | 7 |
| Altura hasta el título de Destacados | 623 px | 225 px | | |
| Ancho de la tarjeta de Destacados | 165 px | 248 px (XL) · 350 (ancho) | | |
| Actos pasados con enlace roto en la ficha del CINEMA | 5 | 0 | | |

**Hallazgo:** dos líneas no bastan para que los nombres se lean: en la columna de 64 + 12 todavía se cortan 19 de 36 («Casa de Cultura del…», «Centro de Difusión…»). La columna ancha baja a 10 y el nombre al lado a 7; los que siguen cortados son los larguísimos («Centro de las Artes de San Luis Potosí Centenario (CEART)»). La propuesta lleva dos líneas porque no ensancha el carril; si el founder prefiere leerlos enteros, «Columna ancha» o «Nombre al lado» (el medidor lo enseña).

## Capturas (`docs/rediseno/capturas-408/`, 390×844, Chrome real)

- `01-hoy-arriba.png` — producción: fila «Ahora» con DESIERTO «Inaugura hoy», «Tus planes» arriba, Cinema con «Te interesa» como chip.
- `02-hoy-lugares.png` — «Lugares de la semana» con los nombres cortados en una línea («Casa de Cult…», «Centro de Di…», «Museo de Ar…»).
- `03-propuesta-arriba.png` — «Seleccionados para ti» en la primera línea, XL (248 px), sello a la derecha, fecha y luego lugar.
- `04-propuesta-lugares-dos-lineas.png` — nombres en dos líneas («Casa de Cultura del…»): se leen más, no todos.
- `05-n-columna-ancha.png` — columna de 96: «Casa de Cultura del Barrio de…», «Museo de Arte Contemporáneo…».
- `06-n-nombre-al-lado.png` — foto de 48 con el nombre al lado, en dos líneas.
- `07-i1-icono-arriba-derecha.png` — «Tus planes»: el marcador relleno arriba a la derecha y el sello a la izquierda, sin chip.
- `08-i1-icono-bajo-el-sello.png` — el marcador debajo del sello.
- `09-i1-icono-junto-al-titulo.png` — el marcador en el pie, a la derecha de la primera línea.
- `10-i1-chip-hoy.png` — el chip «Te interesa» de producción, para comparar.
- `11-d2-ancho.png` — una tarjeta de 350 a lo ancho, como un post de Instagram.
- `12-d2-grande-d1.png` — Destacados en grande (165) pero en la primera línea.
- `13-ficha-hoy-arriba.png` — la ficha del CINEMA como en producción (cabecera oscura, KPI, acciones).
- `14-ficha-hoy-programa-con-pasados.png` — el programa de hoy: los 5 actos pasados mezclados y enlazados.
- `15-ficha-aparte-plegado.png` — «Programa registrado: 11 actividades · 6 por venir» y «Ya pasó · 5 actividades · sin enlace» plegado.
- `16-ficha-aparte-abierto.png` — «Ya pasó» abierto: los 5 en gris, foto apagada, sin chevrón ni enlace.
- `17-ficha-como-pasado.png` — los pasados con enlace a su ficha en pasado («· ya pasó»).
- `18-hoja-ejercicios.png`, `19-hoja-ejercicios-2.png` — la hoja con preajustes, medidor y ejercicios.
- `20-ancho-1280.png` — a lo ancho: «Hoy» a la izquierda, la propuesta en medio y la hoja a la derecha.

## Por confirmar con el founder (en la página, con comentarios)

1. **N:** ¿dos líneas (19 de 36 cortados), columna ancha (10) o nombre al lado (7)?
2. **D2:** ¿XL (se ve una y media) o ancho (una por pantalla)?
3. **I1:** ¿el marcador arriba a la derecha con el sello a la izquierda, bajo el sello, o junto al título?
4. **X1:** ¿lo pasado sin enlace, o como pasado (pide la ficha en pasado del historial, pieza 1)?
5. **X2:** ¿«Ya pasó» plegado o abierto?

## Lo que no entra aquí

Lo firmado en OL-367 (tarjetas 4:5, sello de fecha, ceja, chips) y OL-374 (portadas del sistema) no se toca. La ficha del festival solo cambia en el programa y en «Ya pasó»; el resto (cabecera, KPI, Dónde) es un boceto fiel de producción, no una propuesta. Las fichas en pasado (X1 «como pasado») son del historial de artistas y lugares, pieza 1.
