# 204 · Lugar del evento a pantalla completa: prototipo (OL-169)

**Fecha:** 2026-09-24 · **Rama:** `lugar-evento-pantalla-completa`, desde `origin/main`. **Solo prototipo y
documento: no se tocó código de la app (`src/**`).**

## Pedido del founder (2026-09-24)

Con sus palabras (resumidas en el encargo): las sugerencias de dirección del evento tapaban al sacar el teclado;
la selección de lugar debe ser pantalla completa; un solo campo que reciba nombre y/o dirección; que Mapbox
correlacione nombre y dirección de la sugerencia elegida; registro automático del lugar (como ya pasa con
artistas) salvo que la persona diga que es privado; el mapa no debe taparse con «buscar en el mapa sin agregar»;
al entrar, mapa y campo conviven, con los lugares ya registrados a la vista; sugerencias en listado flotante bajo
el campo; «Agregar lugar» y «Buscar en el mapa sin agregar» como dos maquetas distintas para probar (en la lista,
o como barra de acciones sticky); «Estoy aquí» con nombre editable y pin ajustable a mano.

## Qué se hizo

- Leídos primero: `CLAUDE.md`, `docs/DEFINICION.md`, `docs/rediseno/26-alta-evento-lugar.md`, bitácora
  [172](172-alta-evento-buscar-lugar.md) (el flujo de OL-137 y sus tres vueltas), el prototipo vigente
  `docs/rediseno/prototipos/alta-evento-lugar.html`, `docs/rediseno/39-texto-largo.md` y su prototipo (el patrón
  de pantalla completa ya firmado), `docs/rediseno/prototipos/mapa-lugares.html` (cómo dibujar un mapa sin token
  de Mapbox), `src/app/eventos/HojaDondeEs.tsx` y `src/app/lugares/HojaDonde.tsx` (solo lectura, para entender qué
  existe hoy), `docs/diseno/LINEA_GRAFICA.md` (confirmé que `--primario` ya es violeta `#6d34c8` desde OL-146,
  no el azul petróleo que usan los prototipos viejos — este prototipo usa el color vigente).
- **Prototipo interactivo**, un solo archivo HTML/CSS/JS sin dependencias externas salvo Google Fonts:
  `docs/rediseno/prototipos/lugar-evento-pantalla.html`. Mapa dibujado a mano (mismo patrón que
  `mapa-lugares.html`, sin token): 8 lugares inventados de San Luis Potosí (dos con nombres al tope de longitud,
  «Centro de las Artes de San Luis Potosí» y «Casa de Cultura del Barrio de Tlaxcala y La Lonja», truncados con
  elipsis en el rótulo del mapa para no romper la rejilla) y un punto de interés sin registrar («Plaza de los
  Fundadores», punteado). Pantalla completa «¿Dónde es?» con cabecera «‹ Atrás»/«Listo» (patrón de
  `39-texto-largo.md`), abierta desde un renglón «Dónde» de un alta de evento simulada detrás.
  - Un solo campo «Nombre o dirección»; al escribir, lista flotante justo debajo (lugares registrados primero,
    luego direcciones/POI), sin empujar el mapa ni nada más.
  - Elegir una sugerencia, un pin registrado o un POI llena nombre y dirección juntos y mueve el pin.
  - El pin es de verdad arrastrable (`pointerdown`/`pointermove`/`pointerup` con conversión de coordenadas de
    pantalla a coordenadas del `viewBox` vía `getScreenCTM().inverse()`); al soltarlo, la dirección se recalcula
    (nearest-neighbor sobre lugares y direcciones de ejemplo) y aparece «Moviste el pin. Revisa que la dirección
    corresponda.».
  - Tocar el mapa donde no hay nada también pone el pin ahí, con el nombre vacío y editable.
  - «Estoy aquí» pone el pin en una posición fija de ejemplo y muestra el nombre editable en el mismo resumen
    flotante (sin cambiar de pantalla).
  - Caso «no está registrado»: aviso + «Agregar lugar» (abre un panel con nombre, dirección ya resuelta por el
    pin y el interruptor «Es un lugar privado, no registrarlo», que solo aparece ahí) y «Buscar en el mapa sin
    agregar» (cierra la lista y deja el mapa libre).
  - **Dos variantes conmutables** con un control arriba: A (las dos acciones como renglones al final de la
    lista/aviso) y B (barra de acciones fija, pegada sobre el teclado simulado —bloque gris de 300 px con la
    etiqueta «teclado»— o al pie de la pantalla sin él). Controles adicionales para saltar directo a cualquiera
    de los 8 estados sin depender del orden en que se toquen (cada botón de escenario resetea el estado antes de
    aplicar el suyo, para que cualquier salto sea determinista).
- **Documento:** `docs/rediseno/43-lugar-evento-pantalla.md` — qué cambia respecto a OL-137, el flujo en 9 pasos,
  las dos variantes con los toques medidos, qué datos se guardan, cómo Mapbox obtiene nombre/dirección, la regla
  de registro automático salvo privado, lo que sigue igual del canon, y las cuatro decisiones a firmar.

## Toques medidos por variante (en el prototipo, desde la hoja ya abierta)

| Camino | Variante A | Variante B |
|---|---|---|
| Elegir un lugar registrado | 3 (campo → renglón → Listo) | 3 (igual) |
| Registrar un lugar nuevo | 4 (campo → Agregar → Guardar → Listo) | 4 (igual) |
| «Estoy aquí» | 3 (botón → nombre → Listo) | 3 (igual) |
| Desplazamientos de lista para alcanzar las acciones, con 5 coincidencias | 1 | 0 |

El conteo de toques no cambia entre variantes en estos tres caminos; la diferencia real, y la que vale la pena
probar en el iPhone, es cuánto hay que desplazar la lista para llegar a las acciones cuando hay varias
coincidencias (detalle completo en el documento 43).

## Capturas (`docs/rediseno/capturas-204/`), 390×844 a escala 2

Con el Chromium de `/opt/pw-browsers` (`playwright-core`, instalado con `npm i --no-save` en el scratchpad de la
sesión, nunca en el repo), esperando `document.fonts.ready` (`document.fonts.check('700 20px "Bricolage
Grotesque"')` → `true`). Todas abiertas y revisadas antes de entregar: nada fuera de pantalla, sin scroll
horizontal, la lista siempre bajo el campo, las acciones nunca tapadas por el mapa ni por el teclado simulado.

- **`01-al-abrir.png`:** mapa con los 8 lugares y el POI, campo «Nombre o dirección» vacío, sin lista.
- **`02-escribiendo-sugerencias-A-teclado.png`:** variante A, texto «casa» (dos lugares coinciden), lista
  flotante bajo el campo con los dos lugares y, al final, «Agregar «casa» como lugar» / «Buscar en el mapa sin
  agregar»; teclado simulado abajo, sin taparse con la lista.
- **`03-no-encontrado-A-teclado.png`:** variante A, «El teatrito» sin coincidencias: aviso «no está registrado» y
  las dos acciones como renglones, dentro de la misma tarjeta flotante; teclado visible.
- **`04-no-encontrado-B-teclado.png`:** variante B, mismo texto: aviso flotante arriba (sin las acciones) y la
  barra de acciones pegada justo encima del teclado.
- **`05-no-encontrado-B-sin-teclado.png`:** variante B, sin teclado: la barra de acciones baja al pie de la
  pantalla.
- **`06-estoy-aqui-nombre-editable.png`:** tras tocar «Estoy aquí», el pin en la posición de la persona y el
  resumen flotante con el campo de nombre editable (línea punteada) junto a la dirección ya resuelta.
- **`07-pin-ajustado.png`:** un lugar registrado (Teatro de la Paz) con el pin movido a mano: la dirección se
  recalculó y aparece «Moviste el pin. Revisa que la dirección corresponda.» bajo el resumen.
- **`08-agregar-lugar-privado.png`:** panel «Agregar lugar» con el nombre («El teatrito»), la dirección resuelta
  y el interruptor «Es un lugar privado, no registrarlo» visible (apagado por defecto).

## Verificación

Sin build ni pruebas de código: pieza de solo prototipo y documento (`src/**` no se tocó). Revisión del diff:

```
git diff origin/main..HEAD --stat
git diff origin/main..HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'
```

Ningún correo en el diff. El prototipo se abrió en el Chromium real, se probó el arrastre del pin, la escritura
en el campo y los dos escenarios de teclado antes de tomar las capturas finales.

## Decisiones pendientes del founder

1. Variante A o B (o probar las dos en su iPhone antes de decidir).
2. Texto exacto de «Agregar lugar»/«Agregar «texto» como lugar» y «Buscar en el mapa sin agregar».
3. Confirmar que «Estoy aquí» sigue pidiendo la ubicación con un toque, nunca automática (regla de
   `docs/DEFINICION.md`).
4. Texto y criterio del interruptor «Es un lugar privado, no registrarlo».

## Cierre

Sin push ni PR (los da el gestor, según el encargo se hace `git push -u origin
lugar-evento-pantalla-completa` al terminar). Commit local en `lugar-evento-pantalla-completa`.
