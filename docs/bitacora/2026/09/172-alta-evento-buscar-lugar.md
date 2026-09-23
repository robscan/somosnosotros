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

## Prototipo v3 firmado y código alineado (2026-09-23)

Regla del founder: el mapa está siempre, en el mismo sitio, y solo cambia lo que muestra. Firmó el prototipo con cuatro cambios, aplicados en prototipo y código:

1. Con coincidencias, las dos salidas pasan a una sola línea discreta al pie de la lista: «¿No es ninguno? Agregar · Buscar en el mapa». Los renglones grandes con icono y subtítulo quedan solo en «no está registrado».
2. Sin línea de ayuda al abrir: el campo «Nombre o dirección» basta.
3. Sin botón «Listo»: elegir un lugar muestra su pin en el mapa y la hoja se cierra sola a los 400 ms.
4. Estado nuevo del prototipo con el teclado del iPhone dibujado, para ver el espacio real.

Código: `HojaDondeEs` tiene un único `Mapa` en un sitio fijo de la hoja (una sola instancia): referencia al abrir y con resultados, con el pin del lugar al elegirlo, y herramienta en «Buscar en el mapa» (tocarlo pone el pin, con lo escrito como nombre, y pasa a «Es en otro sitio»; se quitó la fila «poner el pin a mano»). Solo la zona de la lista se encoge y se desplaza. `Hoja` gana la prop `plano` (el cuerpo no se desplaza; quien lo llena reparte el alto).

## Verificación

`npm run lint` (1 warning preexistente), `npm run typecheck`, `npm test` (1038 pruebas) y `npm run build`: verdes. Capturas con `next build && next start`, respaldo local de datos inventados (cinco lugares) y Mapbox simulado con Playwright (las sugerencias y un estilo de fondo liso, así que el mapa de las capturas reales sale sin calles: es solo el recuadro y su posición); Chrome real, 390×844 a escala 2, `document.fonts.check` de Bricolage en `true`. Comprobaciones en el navegador: es la misma instancia del mapa en todos los estados (se marcó su canvas al abrir y seguía marcado al volver de «buscar en el mapa» y al elegir), la hoja se cerró sola tras elegir, la zona de la lista se desplazó sin mover el mapa ni el título, y la prueba de parpadeo: se muestreó cada 60 ms la presencia de la lista mientras se tecleaba en el modo mapa; siempre hubo lista (28 de 28 muestras). Cabecera fija: tras desplazar el cuerpo (scrollTop 141), la posición del título no cambió.

### Capturas (`docs/rediseno/capturas-172/`), todas abiertas

Prototipo v3:
- `proto-n1-al-abrir`: campo «Nombre o dirección» y el mapa de referencia ocupando el resto, sin línea de ayuda ni pin.
- `proto-n2-coincidencias`: dos lugares registrados, la línea «¿No es ninguno? Agregar · Buscar en el mapa» y el mapa debajo.
- `proto-n2-con-teclado`: con el teclado del iPhone dibujado, campo, dos filas y media de lista y el mapa reducido sobre el teclado.
- `proto-n3-no-existe`: aviso «no está registrado» con los dos renglones grandes y el mapa abajo.
- `proto-n4-buscar-en-mapa`: «‹ Lugares registrados», sugerencias en línea encima del mismo mapa, con pista y pin.
- `proto-n5-lista-larga`: cinco lugares que llenan la zona de la lista; el mapa conserva tamaño y sitio.
- `proto-n6-lugar-elegido`: renglón del lugar resaltado y mapa centrado con su pin, sin botón.

Código real (Chrome, 390×844, Bricolage true, Mapbox simulado: el mapa es un recuadro liso con su marca):
- `01-al-abrir`: campo y mapa de referencia a todo el alto restante; sin ayuda.
- `02-coincidencias`: «casa cultura», dos lugares, la línea discreta al pie y el mapa debajo.
- `03-no-existe`: aviso «no está registrado», dos renglones grandes y el mapa.
- `04a-mapa-buscando`: en «Buscar en el mapa»: «‹ Lugares registrados» a la izquierda, campo, «En el mapa» y el mapa con la pista «Toca el mapa donde está el lugar».
- `04b-mapa-sugerencias`: dos sugerencias en línea encima del mismo mapa.
- `05-de-vuelta-guardados`: de vuelta, «casa» muestra tres lugares, la línea discreta y el mapa.
- `06-desplazada-cabecera-fija`: pantalla de 390×520: la lista desplazada, título, campo y mapa en su sitio.
- `07-lugar-elegido`: al elegir, el renglón del lugar y el pin en el mapa.
- `08-hoja-cerrada-dondes-elegido`: la hoja se cerró sola; el renglón Dónde dice «Casa de la Cultura».

## Qué falta

Firma del founder del prototipo; si pide cambios se aplican encima. Commit local, sin push.
