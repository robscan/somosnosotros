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

## Correcciones del founder al prototipo (2026-09-23)

1. «Falta ver estado inicial. Ahí falta mapa de referencia también»: al abrir, bajo el campo se ve el mapa de referencia (el mismo componente `Mapa`, centrado en la ciudad de contexto o en la persona, solo se mira: sin pin, sin pista de «toca el mapa» y sin elegir nada). Con texto, los lugares registrados toman su sitio; en «Buscar en el mapa sin agregar» el mapa es el mismo, debajo de las sugerencias. `Mapa` ya no muestra la pista «Toca el mapa…» cuando no recibe `onCambio`.
2. «Que se vaya al tope de la safe zone»: la hoja «Dónde es» abre a toda la altura, pegada al borde superior seguro (`Hoja` con la prop `completa`: altura `100% - env(safe-area-inset-top)`). Cabecera fija y cuerpo desplazable.

## Verificación

`npm run lint` (1 warning preexistente), `npm run typecheck`, `npm test` (1038 pruebas) y `npm run build`: verdes. Capturas con `next build && next start`, respaldo local de datos inventados (cinco lugares) y Mapbox simulado con Playwright (las sugerencias y un estilo de fondo liso, así que el mapa de las capturas reales sale sin calles: es solo el recuadro y su posición); Chrome real, 390×844 a escala 2, `document.fonts.check` de Bricolage en `true`. Prueba de parpadeo: se muestreó cada 60 ms la presencia de la lista mientras se tecleaba en el modo mapa; siempre hubo lista (28 de 28 muestras). Cabecera fija: tras desplazar el cuerpo (scrollTop 141), la posición del título no cambió.

### Capturas (`docs/rediseno/capturas-172/`), todas abiertas

- `proto-n1-al-abrir`, `proto-n2-coincidencias`, `proto-n3-no-existe`, `proto-n4-buscar-en-mapa`, `proto-n5-lista-larga`: los cinco estados del prototipo, con la hoja a toda la altura y el mapa de referencia en n1 y n4.
- `01-al-abrir`: hoja real a toda la altura, campo, línea de ayuda y recuadro del mapa de referencia con su marca; sin lista.
- `02-coincidencias`: «casa cultura» muestra dos lugares registrados y las dos salidas; sin mapa ni sugerencias.
- `03-no-existe`: «El teatrito» muestra el aviso «no está registrado» y las dos salidas.
- `04a-mapa-buscando`: en «Buscar en el mapa sin agregar» mientras llega la búsqueda: «‹ Lugares registrados», el campo, «Ninguno: poner el pin a mano» y el mapa de referencia.
- `04b-mapa-sugerencias`: dos sugerencias del mapa en la misma lista, la salida del pin a mano y el mapa debajo.
- `05-de-vuelta-guardados`: de vuelta, «casa» muestra tres lugares registrados y las salidas.
- `06-desplazada-cabecera-fija`: pantalla de 390×520 con el cuerpo desplazado; asa, título, ✕ y campo siguen arriba.

## Qué falta

Firma del founder del prototipo; si pide cambios se aplican encima. Commit local, sin push.
