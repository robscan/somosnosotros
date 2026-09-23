# 172 · Buscar lugar en el alta de evento, reconstruido (OL-137)

**Fecha:** 2026-09-23 · **Rama:** `alta-evento-buscar-lugar`, desde `origin/main` · **OL:** OL-137 (pieza E1) · **Modelo:** Sonnet 5, esfuerzo medio

## De dónde sale

Reporte del founder: al buscar un lugar registrado en «Dónde es» del alta de evento, las sugerencias del mapa tapaban la lista de lugares registrados y aparecían y desaparecían. Flujo pedido: un campo de búsqueda; si el lugar existe, se elige de los resultados; si no, se avisa que no existe y se propone agregarlo o buscarlo en el mapa sin agregar; las sugerencias del mapa solo en la búsqueda en el mapa; sin la lista grande de inicio; cabecera de la hoja pegada con el cerrar.

## Causa medida

- En la vista de lista, cada tecla llamaba a `invalidar()` (cierra y vacía todo) y luego reabría la búsqueda de Mapbox: de ahí el parpadeo.
- Esa búsqueda salía en una lista flotante anclada al campo, que se pintaba encima de los lugares registrados: de ahí el tapado.
- El título y el ✕ vivían dentro del área que se desplaza, así que se iban con el contenido.

## Qué se hizo

- `HojaDondeEs.tsx`: al abrir solo hay el campo con una línea de ayuda. Al escribir salen solo los lugares registrados; debajo, «¿No es ninguno?» con «Agregar «…» como lugar» y «Buscar en el mapa sin agregar». Sin coincidencias, un aviso «no está registrado» con las mismas dos salidas. Las sugerencias de Mapbox solo existen dentro de «Buscar en el mapa sin agregar», en la misma lista (nunca flotando), con «‹ Lugares registrados» para volver y «Ninguno: poner el pin a mano» (lleva el texto escrito como nombre del sitio). En ese modo, teclear no borra lo anterior hasta que llega lo nuevo. La vista «Es en otro sitio» y su lista flotante de direcciones no cambian.
- `Hoja.tsx` y su CSS: prop opcional `titulo`; con ella, asa, título y ✕ quedan fijos y solo el cuerpo se desplaza. Las demás hojas no cambian.
- El selector de artistas ya se comportaba así (en línea, sin flotar); no se tocó.
- Prototipo: `docs/rediseno/prototipos/alta-evento-lugar.html` con cinco estados nuevos al final.

## Verificación

`npm run lint` (1 warning preexistente), `npm run typecheck`, `npm test` (1038 pruebas) y `npm run build`: verdes. Capturas con `next build && next start`, respaldo local de datos inventados (cinco lugares) y Mapbox simulado con Playwright; Chrome real, 390×844 a escala 2, `document.fonts.check` de Bricolage en `true`. Prueba de parpadeo: se muestreó cada 60 ms la presencia de la lista mientras se tecleaba en el modo mapa; siempre hubo lista (28 de 28 muestras). Cabecera fija: tras desplazar el cuerpo (scrollTop 141), la posición del título no cambió.

### Capturas (`docs/rediseno/capturas-172/`), todas abiertas

- `proto-n1-al-abrir`, `proto-n2-coincidencias`, `proto-n3-no-existe`, `proto-n4-buscar-en-mapa`, `proto-n5-lista-larga`: los cinco estados del prototipo.
- `01-al-abrir`: hoja real con solo el campo y la línea de ayuda.
- `02-coincidencias`: «casa cultura» muestra dos lugares registrados con foto y, debajo, las dos salidas; nada del mapa.
- `03-no-existe`: «El teatrito» muestra el aviso «no está registrado» y las dos salidas.
- `04a-mapa-buscando`: tras «Buscar en el mapa sin agregar», «Buscando…» con el pin a mano ya visible.
- `04b-mapa-sugerencias`: dos sugerencias del mapa en la misma lista, con «‹ Lugares registrados» arriba.
- `05-de-vuelta-guardados`: de vuelta, «casa» muestra tres lugares registrados y las salidas.
- `06-desplazada-cabecera-fija`: pantalla de 390×520 (para forzar el desplazamiento) con cuerpo desplazado; asa, «Dónde es», ✕ y campo siguen arriba.

## Qué falta

Firma del founder del prototipo; si pide cambios se aplican encima. Commit local, sin push.
