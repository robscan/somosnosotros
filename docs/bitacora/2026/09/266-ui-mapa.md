# 266 · P8 Mapa: el pin elegido, un símbolo por lugar y la distancia (OL-238)

**Fecha:** 2026-09-29 · **Rama:** `ui-mapa`, desde `origin/ui-buscar` (`b93aa22f`, y rebasada sobre `9d51a6d4`, los ajustes del founder a Buscar que llegaron mientras trabajaba) · **OL:** OL-238 · **PR:** #276 (sin unir; va montado sobre #275, `ui-buscar`, que va sobre #274, #273, #272, #271, #270, #269 y #268) · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows. Cierra la pieza P8 del plan de OL-227 (doc 50, § 7; H-12) con lo que el founder decidió el 2026-09-29 tras ver P5b y P6.

## Pedido

Encargo del Gestor de cambios III, con el criterio de siempre («con ultra cuidado, atención a detalle, sin código basura, sin sobreanidar, siempre simple, elimina todo lo innecesario, cuida mucho el código»). Cuatro partes: (1) **el pin elegido tiene que notarse**: crece a ×1,8–2 con un aro blanco ancho y una sombra suave solo en él, su nombre siempre visible, en negrita, un punto más grande y sin ceder sitio, los demás pines y nombres a media opacidad mientras hay ficha abierta, y un pulso único al elegir que el founder decide en su teléfono si se queda; sin cambiar su color ni su forma. (2) **Un símbolo por lugar** con prioridad (seguido > destacado > con día > el resto) y anclaje variable: en el centro, a zoom por defecto, 0 etiquetas superpuestas. (3) **La distancia** en el renglón del sitio del «Dónde» del evento, con el formato del número «Distancia» de Lugares y solo con la ubicación ya concedida. (4) Retirar lo que no usa ninguna pantalla.

## Lo que había

- El elegido solo crecía ×1,3 (`feature-state`); su color, su borde y su nombre eran los de todos.
- El círculo, el día y el nombre eran tres cosas sueltas: los círculos no cuentan para las colisiones de Mapbox, así que un nombre caía sobre su propio pin (`text-anchor: top` a 7,7 px del centro, dentro del círculo de 24) y sobre los pines vecinos; el día no cedía y no reservaba sitio.
- La ficha del evento decía la dirección del sitio y nada más («Av. Manuel Nava 101, Zona Universitaria · 3,2 km» era solo del prototipo).
- `Mapa` traía un modo «elegir» (un pin que se arrastra) que ya no usaba ninguna pantalla.

## Lo que se hizo

### 1. Las reglas del pin (`lib/pines.ts`, con su prueba)
Todo lo que las capas leen de un pin está calculado ahí, sin levantar Mapbox: `radioPin` (12 · 5 px; el elegido ×1,9), `bordePin` (1,5 · 2 el seguido · 4 el elegido: su aro), `huellaPin` (radio + borde: Mapbox dibuja el borde por fuera del círculo), `prioridadPin` (elegido 4 > seguido 3 > destacado 2 > con día 1 > resto 0), `opacidadPin` (0,5 a los demás mientras hay elegido), `tamanoDia` (el día crece con su círculo), `distanciaNombre` (a cuánto queda el nombre de su pin) y `propiedadesPin`, que las junta con los dos colores. `colorPin` no cambió: el elegido conserva su color. Las capas solo leen (`["get", "radio"]`, `["get", "opacidad"]`…).

### 2. Las capas (`Mapa.tsx`)
De abajo arriba: **sombra** (un círculo desenfocado solo bajo el elegido), **círculos** (radio, color, borde y opacidad de las propiedades; el de mayor prioridad, encima), **nombres** (todos menos el elegido), **nombre del elegido** y **pines** (el día en blanco y negrita y la huella de cada pin). La huella es una imagen vacía de 1×1 px que `icon-size` estira al tamaño del pin: como esa capa va arriba, Mapbox la coloca primero y todos los pines reservan su sitio antes de que ningún nombre busque el suyo. Los nombres van con `text-variable-anchor` (debajo, como siempre; si no cabe, encima, a la derecha o a la izquierda), `symbol-sort-key` por prioridad y `text-radial-offset` de la propiedad. Un nombre que no cabe en ningún lado se esconde; el pin, nunca. El nombre del elegido va en su propia capa, un punto más grande (15) y con halo de 3, y con `text-allow-overlap`: Mapbox le prueba primero todos los lados sin pisar a nadie y, si ninguno cabe, lo pone en el primero; nunca se esconde. Que haya elegido dejó de ser un `feature-state` y pasó a ser una propiedad del GeoJSON (`setData` cuando cambia `elegido`): el efecto de `removeFeatureState`/`setFeatureState` se fue, y ya no hay propiedades `seguido`, `destacado` ni `privado` en el GeoJSON.

### 3. El pulso
Un marcador de Mapbox con un anillo del color del pin y del tamaño de su huella (2 × 26,8 = 53,6 px con día), que se abre hasta ×2,6 y se apaga (opacidad 0,7 → 0) en 500 ms con una animación de CSS; se quita solo al terminar (`animationend`) y con `prefers-reduced-motion: reduce` ni se crea. **Retirarlo** es borrar el efecto «Un pulso al elegir un lugar» de `Mapa.tsx`, `pinesRef` (y su línea en el efecto de datos) y el bloque `.pulso` de `Mapa.module.css`.

### 4. La distancia en el «Dónde» del evento
`metaSitio(direccion, km)` (`lib/ficha`, pura: la dirección y, al final, « · 1,2 km» con `kpiDistancia`, el mismo formato del número «Distancia»); `useUbicacionFresca` (`components/`), la lectura de la ubicación que el teléfono ya guardó y sigue fresca —la de «Mi ubicación» y «Cercanos»—, que ahora comparten `KpiDistancia` y el nuevo `MetaSitio` (`eventos/[id]/`), la `small` de los renglones del sitio con lugar y del sitio «en otro sitio». La distancia es al punto que ya usan el mapa y «Cómo llegar» de esa tarjeta (`puntoDistancia`: solo la coordenada viaja al teléfono). La ficha nunca pide permiso: solo lee.

### 5. Retiros
De `Mapa`: el modo «elegir» y sus props `modo`, `valor`, `onCambio` y `centrarEn` (`git grep`: el único `<Mapa>` es el de `VistaLugares`, que no las pasaba), el pin que se arrastra, `COLOR_PIN`, `pinElegirRef`, `onCambioRef`, el aviso de ayuda del pin, y de su CSS `.mapaEmbebido` y `.pista`; y sus comentarios. Las hojas «Dónde está» y «Dónde es» traen su propio mapa (`MapaDondeEs`) y no se tocaron; solo su comentario, que hablaba de los modos de `Mapa`.

### 6. El encuadre inicial, con 72 px a los lados (remate)
A petición del gestor, ya abierto el PR (un commit aparte): el `fitBounds` del encuadre inicial de `Mapa.tsx` deja 72 px a cada lado (antes 48; `const lado = 72`: la mitad del nombre más ancho —9 em de 14 px, 126 px, 63 de media anchura— con relleno y aire), para que el nombre de un pin de los extremos no toque el borde. Medido con el mapa real: `queryRenderedFeatures` sobre una franja de 1 px pegada a cada lado del mapa da los nombres cuya caja lo toca (a 1 280, el borde izquierdo del mapa es el del panel). «Encuadran» son los lugares con evento esta semana, que son los que decide el encuadre (docs/rediseno/35); los demás pines caen donde caigan.

| Vista | Zoom | Nombres que tocan el borde, antes → después | De los que encuadran | Nombres sobre un pin |
|---|---|---|---|---|
| Estándar a 390 | 13,07 → 12,81 | 4 → 2 | 3 → **0** (MUNI, Teatro de la Paz, Casa de Cultura) | 0 → 0 |
| Estándar a 1 280 | 14,31 → 14,21 | 5 → 2 | 3 → **0** | 0 → 0 |
| Denso a 390 | 12,74 → 12,48 | 3 → 3 | 2 → 1 (MUNI y Sala de Arte Público → Sala de Arte Público) | 0 → 0 |
| Denso a 1 280 | 13,98 → 13,88 | 4 → 4 | 2 → 2 (MUNI y Casa Museo Othón → Museo Regional de la Huasteca y Sala de Arte Público) | 0 → 0 |

Los que siguen tocando el borde son de dos clases: **pines sin evento** que caen en la franja del borde (en el estándar, «Museo del Ferrocarril…», «Casa del Poeta…» y «Museo Nacional de la Máscara»): el encuadre no los mira y ninguna cámara evita que un pin quede cerca del borde; y, en el denso, **lugares que encuadran en la orilla de un racimo**, cuyo nombre va al lado del pin porque debajo y encima no caben (un nombre al lado del pin ocupa hasta unos 146 px hacia ese lado, más que los 72 de aire). Mapbox no sabe del borde de la pantalla. El costo: la cámara se aleja un poco y, a 390 con el respaldo estándar, «Teatro de la Paz» pierde su nombre por falta de sitio (antes los cinco lugares con evento tenían el suyo; ahora cuatro). Probado en caliente (recolocando la cámara, sin recargar) con 56 y 64 px: el nombre de MUNI, de 63 px de media anchura más el relleno del texto, sigue tocando el borde; con 72, no.

## Decidí yo (para que el gestor confirme)

1. **×1,9, aro de 4 px y sombra:** el founder pidió ×1,8 o ×2; tomé ×1,9. El aro son 4 px blancos por fuera del disco (Mapbox pone el borde fuera del radio). La sombra es la que más se parecía a «suave» de seis pruebas (opacidad 0,55, desenfoque 0,7, radio de la huella + 12, 5 px hacia abajo). Todo en `pines.ts` y `agregarCapas`.
2. **«En negrita»:** los nombres ya eran negrita (DIN Pro Bold desde OL-128), así que lo que distingue al del elegido es el punto de más (15), el halo (3 en vez de 2), que nunca se esconde y que los demás bajan a media opacidad. Más pesado que los demás pediría aligerar los demás (DIN Pro Medium) y eso cambia un mapa ya firmado.
3. **Un símbolo por lugar, con una salvedad:** el círculo sigue siendo una capa de círculo y el día sigue siendo texto; Mapbox no deja meter texto dentro de un icono sin una imagen por día y por color, en otra letra que la de los nombres. Por eso el pin (huella + día) es un símbolo y el nombre otro, y el del pin va arriba para que todos los pines reserven su sitio antes de que se coloque ningún nombre. Medido: 0 nombres sobre un pin, en 4 vistas. Si el founder quiere uno solo de verdad, hay que dibujar las imágenes de los pines con canvas.
4. **Cuatro lados, no ocho:** debajo, encima, derecha, izquierda. No probé las diagonales: a esa distancia su esquina cae dentro de la huella cuadrada del pin.
5. **El aire del nombre son 10 px, medidos:** con 6 el nombre no cabe debajo ni encima de su propio pin (a `top` y `bottom` Mapbox les resta unos 4 px de línea base y suma el relleno de las dos cajas), con 8 cabe justo. Está comentado en `pines.ts`.
6. **El elegido pasa de `feature-state` a propiedad:** el cambio es de golpe, sin fundido (con `feature-state` tampoco se animaba), y el código es menos: un efecto menos y ninguna expresión con `feature-state`.
7. **«Ubicación ya concedida» = la que el teléfono guardó:** la misma fuente del número «Distancia» (`localStorage`, 15 minutos). Pasados los 15 minutos, la distancia se va hasta el siguiente toque a «Mi ubicación». Leerla en silencio cuando el permiso ya está dado (`navigator.permissions`) sería un cambio de regla: la ficha llamaría al navegador sin que nadie toque.
8. **La distancia va solo en las dos filas públicas** (lugar y «otro sitio» con coordenadas). Un sitio reservado —también el ya revelado— sigue sin distancia: nunca sale un punto que la ficha no muestra a esa persona.
9. **`KpiDistancia` se toca (es de P6):** su lectura de la ubicación pasó a `useUbicacionFresca` para que los dos digan lo mismo; se va la copia del almacén de oyentes.
10. **El pulso:** del color del pin, ×2,6, 500 ms; nace cada vez que cambia el elegido. Vetable borrando su bloque.
11. **El encuadre inicial deja 72 px a cada lado (antes 48)**, remate que pidió el gestor tras abrir el PR: los nombres de los lugares que encuadran quedan enteros en el respaldo estándar a 390 y a 1 280 (sección 6). No basta para que ningún nombre toque el borde: los pines que el encuadre no controla (sin evento esta semana) y los de la orilla de un racimo (con su nombre al lado) pueden seguir cortados, y la cámara se aleja un poco (a 390, «Teatro de la Paz» pierde su nombre en el respaldo estándar). Si el founder lo quiere estricto, hay dos salidas: apagar el nombre que toque el borde (un `idle` y un `feature-state`, unas 20 líneas) o dejar solo `top` y `bottom` como anclas.
12. **`VistaLugares` solo cambia un comentario** («sin aro, salvo el elegido») y `MapaDondeEs` otro.

## Lo que cambia a la vista

- **El pin elegido** (solo con ficha abierta): disco de 22,8 px de radio (antes 15,6), aro blanco de 4 px, sombra suave debajo, su nombre en negrita de 15 con halo ancho; los demás pines y nombres, a media opacidad; al cerrar la ficha, todo vuelve. Un anillo sale de él al elegir. Color y forma, los mismos.
- **Los nombres** ya no pisan ningún pin (ni el suyo ni el de un vecino): quedan debajo de su pin con aire; donde no caben, encima o a los lados; donde no cabe ninguno, no salen.
- **El «Dónde» del evento** dice « · 1,2 km» al final de la dirección cuando el teléfono ya tiene la ubicación.
- **Al abrir Lugares** la cámara deja más aire a los lados (72 px en vez de 48) y empieza un poco más lejos: los nombres de los lugares que encuadran quedan enteros.
- **Lo que no cambia:** colores y tamaños de los pines sin ficha, «Mi ubicación» (lo único que flota), la cámara al arrastrar la hoja y al cerrar la ficha, el logo de Mapbox y la ⓘ, la tarjeta «Dónde» (imagen estática), las hojas «Dónde está» y «Dónde es».

## Verificación

- `npm run lint`: 0 errores (la advertencia que ya estaba, en `docs/diseno/logotipo/iconos-sn.mjs`). `npm run typecheck`: verde. `npm test`: 119 archivos, **1 572** pruebas (1 559 antes; +13: 10 en `pines.test.ts` —radio y aro del elegido, huella, prioridad, opacidad, distancia del nombre, colores del elegido y las propiedades juntas— y 3 en `ficha.test.ts`, la meta del sitio con y sin distancia). `next build` verde con el respaldo local y la llave del mapa, y **sin variables de entorno**, como la CI. Pruebas de componente en Chrome de `HojaLugares` y `Kpi`: 11 en verde (`nuevos`, `cupo` y `guardado` no se corrieron: fallan igual en `main`).
- **Con el mapa real** (Chrome de la Mac con `playwright-core`, la app compilada contra el respaldo local inventado, la llave pública de Mapbox de la carpeta principal solo en un `.env.local` temporal ya borrado; estilo `light-v11`, no el del founder, porque solo se copió la llave; 390×844 a 2× y 1 280×800). Las etiquetas se cuentan con el propio Mapbox: `queryRenderedFeatures` sobre las capas de nombres da los que se pintan, y una consulta del tamaño del círculo de cada pin (con su borde, menos el relleno del texto) da los nombres cuya caja lo toca.

  | Vista | Pines | Nombres pintados, antes → después | Nombres sobre un pin, antes → después |
  |---|---|---|---|
  | Lugares a 390 (9 lugares) | 7 | 4 → 6 | **5** (4 el propio, 1 de un vecino) → **0** |
  | Lugares a 1 280 | 6 | 6 → 7 | **5** (los 5 el propio) → **0** |
  | Denso a 390 (39 lugares) | 38 | 6 → 8 | **32** (6 + 26) → **0** |
  | Denso a 1 280 | 38 | 15 → 16 | **20** (13 + 7) → **0** |

  El denso son 30 lugares inventados de más en el centro (en la carpeta de trabajo, no en el repositorio).
- **Encuadre a 72 px (remate):** `npm run lint`, `npm run typecheck`, `npm test` (119 archivos, 1 572 pruebas: las mismas, no hay lógica nueva que probar sin Mapbox) y `next build`, con y sin variables de entorno, en verde; nombres sobre un pin, **0** en las cuatro vistas (estándar y denso, 390 y 1 280); los nombres que tocan el borde, en la sección 6.
- **Elegido siempre visible:** los 9 lugares del respaldo y 14 del denso (11 con de 12 a 19 pines a menos de 45 px, los otros 3 con de 3 a 6), cada uno elegido desde la lista: su nombre se pinta, tapa 0 pines de otros, ningún nombre cae sobre el suyo, y al cerrar la ficha todas las opacidades vuelven a 1, no queda elegido ni sombra y los radios son 5 y 12. Lados que salieron: debajo, encima, a la derecha y a la izquierda. En el peor caso —la ficha abierta del lugar con más vecinos del denso y el mapa alejado a propósito—, su nombre se pinta a zoom 15, 14, 13, 12,5, 12 y 11: a 15 sin tapar ningún pin y de 14 hacia abajo, cuando ningún lado queda libre, en el primero aunque tape de 5 a 13 pines (es el trato: nunca se esconde; los nombres de los demás se van cediendo el sitio, de 15 a 3).
- **Medido** (Teatro de la Paz, con día; los números de las capas y, entre paréntesis, la captura):

  | | Antes | Después |
  |---|---|---|
  | Radio del disco | 15,6 px (12 × 1,3; medido 30 de diámetro) | **22,8 px** (12 × 1,9; medido 45) |
  | Borde blanco | 1,5 px, como todos | **4 px** por fuera (huella 26,8: 53,6 px con el aro) |
  | Sombra | ninguna | círculo desenfocado; se ve 36 px a los lados, 31,5 arriba y 40,5 abajo del centro (unos 13 debajo del aro) y oscurece hasta 83 de 255 (diferencia de dos capturas, con y sin la capa) |
  | Los demás | opacidad 1 (medida 0,99) | **0,5** (medida en píxeles 0,49: Aether pasa de `#6d34c8` a `#b398e1` sobre el fondo `#f7f7f7`) |
  | Punto sin día (Casa del Poeta) | 6,5 px (5 × 1,3) | **9,5 px** (5 × 1,9), aro 4, sombra a 24 px |

  Sin día el elegido pasa de 13 a 19 px de diámetro; el seguido conserva el verde.
- **Pulso:** anillo de 53,6 px del color del pin, una animación de 500 ms; en la captura a 250 ms va por la mitad; al terminar quedan 0 anillos en el DOM; con `prefers-reduced-motion: reduce`, 0 anillos.
- **Distancia** (camino real en Chrome con la ubicación concedida): sin ubicación guardada, la ficha del evento hace **0** llamadas al navegador y dice solo la dirección; «Mi ubicación» en Lugares hace 1 y guarda el punto; la ficha del evento abierta después hace 0 y dice « · 1,3 km» (con el punto redondeado a tres decimales, ~100 m); con la ubicación puesta a mano, «Teatro de la Paz» dice « · 1,2 km» y el «otro sitio» (Templo de San Francisco) « · 1,4 km». La ficha nunca pide permiso.
- **Medidas** (`medir.js`, sesión del respaldo, Lugares a 390 y a 1 280 —sola y con elegido— y la ficha del evento a 390, antes → después):

  | | Antes | Después |
  |---|---|---|
  | Márgenes negativos | 0 | **0** |
  | Desbordes | 2 (los contenedores de Mapbox) | **2** (los mismos); evento 0 → 0 |
  | Toques de menos de 44 | 2 (logo 88×23 y ⓘ 24×24, de Mapbox) | **2** (los mismos); **0 nuestros**; evento 0 → 0 |

- **Lo que esta prueba no puede ver:** el iPhone (el simulador no carga el mapa: la llave está restringida al dominio), el estilo del founder, los datos de producción ni cómo se siente el pulso, que él decide en su teléfono.

## Capturas

`docs/rediseno/capturas-266/` (30 PNG de paleta, 5,6 MB). «Antes» es la compilación de `origin/ui-buscar` y «después» esta rama, ambas con el mapa real, la sesión de `ana@example.com` del respaldo local inventado y los mismos datos (`03` y `04` con el respaldo denso, de 30 lugares inventados de más). Teléfono a 390×844 a 2×, escritorio a 1 280×800. Cada una abierta y descrita.

1. **Lugares al abrir, 390** (`01`): antes, siete pines: «ACHE Galería» sobre el borde de «Dom», «Teatro de la Paz» sobre «Vie» y tapando el punto de la Casa del Poeta, «MUNI…» cortado a la izquierda y «Casa de Cultura…» a la derecha, tres nombres escondidos. Después, «ACHE Galería» debajo de «Dom», «Aether» encima de «Lun», «Teatro de la Paz» encima de «Vie», la Casa del Poeta con su nombre debajo de su punto, «MUNI…» debajo de «Sáb» y «Casa de Cultura…» debajo de «Mié»: ningún nombre toca un pin; los de los extremos siguen cortados por el borde (esta captura es anterior al remate del encuadre: ver `16`).
2. **Lugares al abrir, 1 280** (`02`): antes, el panel con la lista y el mapa con los nombres pegados a sus pines y «Teatro de la Paz» cortado a la derecha. Después, los nombres debajo con aire, «Museo Nacional de la Máscara» encima de su punto y los de los extremos aún cortados (anterior al remate del encuadre: ver `17`).
3. **Denso, 390** (`03`): antes, 38 pines y en el racimo del centro «Casa de las Artesanías», «Casa Museo Manuel José Othón» y «Espacio Colmena» cubren círculos y días. Después, 8 nombres a los lados del racimo y ninguno sobre un pin; el racimo queda solo con círculos.
4. **Denso, 1 280** (`04`): antes, «Casa de las Artesanías», «Centro de Difusión Cultural IPBA» y «Casa Museo Manuel José Othón» sobre «Vie», «Hoy», «Sáb» y «Lun». Después, 16 nombres fuera de los pines; los de la derecha, cortados por el borde (anterior al remate del encuadre).
5. **Elegido desde la lista** (`05`, ACHE Galería): antes, el pin apenas más grande que el de «Aether» y el nombre pisando su borde. Después, disco grande con aro blanco y sombra, «Dom» al doble, el nombre en negrita debajo, con aire, y la ficha a media altura.
6. **Dos lugares juntos** (`06`, Teatro de la Paz y Museo Nacional de la Máscara, a unos 115 m): antes, «Vie» como cualquier pin, el nombre sobre él y el del vecino escondido. Después, el elegido con aro y sombra y su nombre debajo; el vecino, un punto gris con su nombre encima, a media opacidad; «Casa del Poeta…» atenuada.
7. **Elegido sin día** (`07`, Casa del Poeta): antes, un punto negro de 13 px con su nombre debajo y el resto a todo color. Después, el punto a 18 px con aro y sombra, los demás atenuados («Vie» y los puntos grises).
8. **Elegido seguido** (`08`, Casa de Cultura del Barrio de San Miguelito): antes, «Mié» en verde con el nombre pisándolo. Después, el mismo verde, con aro, sombra y el nombre en tres líneas debajo; la pastilla «Sigues» en la ficha.
9. **Pulso a medio camino** (`09`, después): el elegido con su aro y un anillo violeta pálido, a mitad de la animación (250 ms), y la ficha abierta.
10. **Pulso en cuatro tiempos** (`10`, después): 0, 130, 250 y 380 ms del mismo anillo, del aro del pin al doble y medio, cada vez más pálido.
11. **Escritorio, el panel con el elegido** (`11`): antes, el panel con la ficha y el mapa con «Vie» apenas más grande. Después, el elegido con aro y sombra, su nombre debajo y «Aether» y los demás atenuados.
12. **La ficha del evento con distancia** (`12`, Delirium Pollum): antes, la tarjeta «Dónde» con «Teatro de la Paz» y su dirección. Después, la misma dirección terminada en «· 1,2 km» (baja a la segunda línea), con la ubicación puesta a mano.
13. **Sin ubicación** (`13`, después): la misma tarjeta sin distancia y sin pedir nada.
14. **«Otro sitio»** (`14`, Concierto de la Orquesta Sinfónica): antes, «Templo de San Francisco» con su dirección; después, la dirección terminada en «· 1,4 km». La cabecera dice «mar 29 sep» antes y «mié 30 sep» después: el concierto era de hoy y, a esa hora, ya había pasado, así que el respaldo lo movió a mañana.
15. **El elegido ampliado** (`15`, después): «Vie» con su aro blanco de 4 px, la sombra debajo y «Teatro de la Paz» en negrita; el vecino a media opacidad.
16. **El encuadre a 72 px, 390** (`16`): antes, «MUNI…» cortado por la izquierda y «Teatro de la Paz», «Casa del Poeta…» y «Casa de Cultura…» por la derecha. Después, con más aire a los lados y el mapa un poco más lejos: «MUNI Museo Universitario UASLP» y «Casa de Cultura del Barrio de San Miguelito» enteros, «ACHE Galería» encima de «Dom» y «Aether» debajo de «Lun»; «Teatro de la Paz» ya no tiene nombre (no le cabe junto a los puntos de la Casa del Poeta y del Museo Nacional de la Máscara) y siguen cortados los nombres del «Museo del Ferrocarril…» y de la «Casa del Poeta…», dos puntos sin evento pegados al borde derecho.
17. **El encuadre a 72 px, 1 280** (`17`): antes, «MUNI…» cortado por el borde del panel y «Teatro de la Paz», «Museo Nacional de la Máscara», «Casa del Poeta…» y «Casa de Cultura…» por el derecho. Después, los nombres de los cinco lugares con evento enteros (ACHE Galería, Aether, Teatro de la Paz, MUNI y Casa de Cultura); siguen cortados los de dos puntos sin evento junto al borde derecho («Museo Nacional de la Máscara» y «Casa del Poeta…»).

## Anotado para las piezas que siguen

- **P9 (altas).** Nada del mapa: `Mapa` ya no tiene el modo «elegir»; las hojas «Dónde está» y «Dónde es» siguen con `MapaDondeEs`, el único mapa con un pin suelto.
- **P10 (chips).** Nada del mapa. Los colores de los pines siguen en `lib/pines.ts`.
- **P12 (retiros).** Si el founder quiere que ningún nombre toque el borde, las dos salidas están en la decisión 11. `MapaDondeEs` y `Mapa` siguen siendo dos mapas; unirlos (bitácora 208) queda para entonces. El número «Lugares» del artista (P6) sigue solo informando: P8 no le da salto. Si se retira el pulso, ver el punto 3 de esta bitácora.

## Archivos

Sin migraciones ni variables de entorno. En `src`, sin pruebas, +330 líneas y −230 (`Mapa.tsx` de 418 a 396).

**Nuevos:** `components/useUbicacionFresca.ts`, `app/eventos/[id]/MetaSitio.tsx`, esta bitácora y `docs/rediseno/capturas-266/`. **Con cambios:** `lib/pines.ts` (y su prueba), `lib/ficha.ts` (y su prueba), `components/Mapa.tsx` y `Mapa.module.css`, `components/MapaDondeEs.tsx` (un comentario), `app/lugares/[id]/KpiDistancia.tsx`, `app/lugares/VistaLugares.tsx` (un comentario), `app/eventos/[id]/page.tsx`; documentos: `docs/ops/OPEN_LOOPS.md`. **Sin tocar:** `package.json` y el lock, `CLAUDE.md`, `apps/**`, `supabase/**`, `docs/ops/ASIGNACIONES.md` y el doc 50.
