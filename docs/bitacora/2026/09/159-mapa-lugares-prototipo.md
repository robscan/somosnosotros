# 159 · Mapa de lugares (B1): prototipo para firmar (OL-124)

**Fecha:** 2026-09-22
**Rama:** `mapa-lugares-prototipo` (creada desde `origin/main`, `307cb64`; confirmada con `git branch --show-current` antes del primer commit)
**Pieza:** OL-124 y bitácora 159, reservadas por el gestor (Gestor de cambios II). Solo documentos: no se tocó `src/`.

## Qué pedía

La pieza B1 de `docs/ops/COLA_DE_PIEZAS.md`: L7 (botón de ubicación actual y encuadre), L11 (pin con «Hoy» o el día) y L31 (resaltar destacados y lugares con eventos esta semana; el botón abajo a la izquierda como el ↑ de los listados) de la lista del founder del 2026-09-21. L8 (llamar «Mapa» a Lugares) se decide al ver el prototipo. Entrega: documento, prototipo sin servidor ni llaves, capturas reales.

## Qué se hizo

1. **`docs/rediseno/35-mapa-de-lugares.md`.** Qué se ve hoy (con la captura real de producción), qué cambia, cómo se decide el encuadre, qué muestra cada pin (tabla), qué pasa al tocar un pin, el botón de ubicación, los cuatro estados, la recomendación sobre L8 y lo que tocaría el código cuando se firme.
2. **`docs/rediseno/prototipos/mapa-lugares.html`.** Tres teléfonos a 390×844 (sin ubicación, con ubicación, pin tocado) armados desde una sola plantilla; mapa base dibujado en SVG (sin Mapbox ni token); pines generados desde una lista de doce lugares con nombres reales del catálogo y posiciones inventadas; el logotipo real (`public/logotipo.svg`) y el símbolo SN (`public/sin-foto.png`) incrustados para que el archivo se abra solo. Tocar un pin abre la hoja, tocar el mapa la cierra, el botón pone o quita la ubicación. Misma carga de Bricolage Grotesque que los demás prototipos (Google Fonts). Rejilla plana: el teléfono es una rejilla de cinco franjas con áreas; sin envoltorios.
3. **`docs/rediseno/capturas-35/`** (cuatro PNG a 780×1688, es decir 390×844 a doble densidad):
   - `produccion-mapa-hoy--390x844.png`: somosnosotros.org/lugares hoy.
   - `prototipo-sin-ubicacion--390x844.png`, `prototipo-con-ubicacion--390x844.png`, `prototipo-pin-tocado--390x844.png`: los tres estados del prototipo.

## Evidencia

- Capturas con `playwright-core` instalado en el scratchpad de la sesión (no en el repo) y el Chrome real de la Mac. En producción, `document.fonts.check('16px "Bricolage Grotesque"')` = `true`, había lienzo de Mapbox y ningún aviso de error. En el prototipo, la misma comprobación = `true` y tres teléfonos de 390×844 medidos con `boundingBox`.
- Abrí los cuatro PNG antes de entregarlos; lo que se ve en cada uno está descrito en el doc 35, sección «Prototipo y capturas».
- Dos fallos vistos en la primera captura y corregidos antes de entregar: el logotipo no se pintaba (un `<symbol>` con `<use>`; ahora el SVG va directo en la plantilla) y el mapa base salía encogido (el símbolo se escalaba al viewport; ahora el `<use>` lleva su tamaño real). También se movieron pines y rótulos de ejemplo que chocaban con los botones y con la marca de Mapbox.

## Decisiones que tomé (el founder las revisa)

- **El día en dos letras, no el número.** L11 proponía «22». Con la ventana de siete días de la agenda (`tramo` en `src/lib/fechas.ts`: hoy y seis días más) ningún día se repite, «Ju» cabe en un círculo de 28 px y «Hoy» queda como la única palabra.
- **El destacado conserva el naranja** (decidido el 2026-09-16) y suma un aro: L31 pide «resaltar» y el encargo dice «con borde»; el color nunca va solo.
- **«Cercanos» fuera de las pestañas del mapa** (en la Lista se queda): con el botón serían dos mandos para la misma decisión. Es recomendación, va marcada como tal en el doc.
- **La ⓘ de Mapbox junto a la marca**, entre los dos botones: el botón de ubicación ocupa su esquina y la licencia pide que las dos se vean.
- **L8: recomiendo seguir con «Lugares»**, con los argumentos a favor de «Mapa» también escritos.
- **La tarjeta pasa a hoja corta** de borde a borde con «Ver ficha» a lo ancho, en la zona del pulgar; dice el nombre del evento, no solo la fecha.

## Límites

- Es un prototipo dibujado: el mapa no es Mapbox, los nombres van en Bricolage (en la app van en DIN Pro Bold, la letra del estilo) y las posiciones de los lugares son inventadas.
- No se midió con gente ni en el iPhone del founder; las capturas son de Chrome en la Mac.
- Sin código, sin migraciones, sin cambios en producción ni en `.env`. Ningún secreto en el prototipo.

## Pendiente

- Firma del founder sobre el doc 35 y el prototipo; sus tres decisiones: «Cercanos» en el mapa, la ⓘ de Mapbox y L8.
- Con la firma, la pieza de código (lo que toca está al final del doc 35).

## Segunda entrega: correcciones del founder (2026-09-22)

El gestor aceptó la primera entrega (`27e69c4`) y abrió el PR #155. El founder vio el prototipo y pidió cuatro cambios, en el chat del gestor:

1. «Me gusta el prototipo de mapa.»
2. Los días van con **tres letras y acento** («Jue», «Vie», «Sáb»), no dos («Ju», «Vi», «Sá»).
3. De acuerdo con las dos recomendaciones: **L8 decidido** (sigue «Lugares») y **«Cercanos» fuera de las pestañas del mapa**.
4. «No has agregado botón de ubicación en mapa»: el botón sí estaba en las tres capturas, pero en «pin tocado» la hoja lo tapaba por completo.

### Qué se cambió

- **`docs/rediseno/prototipos/mapa-lugares.html`:** los doce lugares de ejemplo pasan a `Jue`/`Vie`/`Sáb`/`Mié`; el círculo del pin con día crece de 28 a 32 px (10 px de letra) para que quepan las tres letras sin achicarla. El botón de ubicación deja de retirarse con la hoja abierta: ahora se mide la altura real de la hoja (`getBoundingClientRect`, no un número fijo) y el botón sube justo por encima con una transición corta; solo «Registrar lugar» sigue retirándose. Se subió también el `z-index` del botón para que quede siempre por encima.
- **`docs/rediseno/35-mapa-de-lugares.md`:** sección nueva «Decisiones del founder al ver el prototipo» al principio; L7/L8/L31 marcadas con lo decidido; la tabla de pines, el párrafo de «por qué el día en letras» y las cuatro capturas actualizados a tres letras; la sección «El botón de ubicación» reescrita (nunca se tapa, con la explicación de por qué se eligió el icono de mira/diana — es el mismo `IconoUbicacion` que ya usan «Estoy aquí» en `HojaDonde` y `HojaDondeEs`, y se descartó la flecha de rumbo de Apple Maps porque esta app no muestra hacia dónde mira la persona); la sección L8 pasa de recomendación a decisión, con las mismas cuatro razones y la nota de lo dicho a favor de «Mapa»; «Qué toca en el código» anota cómo medir la hoja en React.
- **Cuatro capturas re-tomadas** en `docs/rediseno/capturas-35/` con el mismo método (Chrome real vía `playwright-core`, `document.fonts.check` = true): confirmé en la de «pin tocado» que el botón de ubicación se ve completo, con su sombra, justo arriba del borde de la hoja; en las otras dos, los pines dicen «Jue», «Vie», «Mié», «Sáb» completos y legibles.

### Evidencia

Abrí las cuatro capturas nuevas antes de entregar. En `prototipo-pin-tocado--390x844.png` el botón de ubicación (tinta, sin ubicación activa en ese estado) queda visible completo sobre el borde blanco de la hoja, sin recorte ni superposición. En `prototipo-sin-ubicacion--390x844.png` y `prototipo-con-ubicacion--390x844.png` los seis pines con día muestran «Mié», «Jue», «Vie», «Sáb» sin abreviar más allá de las tres letras acordadas; en «con ubicación» el icono del botón está en el color de acción con el centro relleno.

### Pendiente

Firma del founder sobre esta segunda entrega. Con ella, la pieza de código.
