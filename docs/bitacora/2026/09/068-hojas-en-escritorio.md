# 068 · Las hojas: ya no se aprietan en escritorio ni se recortan con el teclado del iPhone

**Fecha:** 2026-09-16 (noche) · **Rama:** `hojas-en-escritorio` (commit local, sin push) · **Pieza:** OL-042.

## Qué vio el founder
Una captura en escritorio de la hoja "Dónde" de Artistas: la hoja medía lo que la columna, pero el contenido estaba en una tira angosta al centro, con "San Luis Potosí" partido en tres renglones. "Revisa de paso por qué ese drawer en desktop se rompe horrible. Corrige ese y todos los elementos que tengan el mismo problema en desktop."

## Por qué pasaba
- `--gutter` (en `globals.css`) vale `max(20px, (ancho de la ventana − 600px) / 2)`. Está hecho para lo que va a todo lo ancho: en escritorio crece para que el contenido quede centrado en la columna de 600 px.
- `ui/Hoja` mide la columna (`max-width: var(--columna)`, centrada) y además usaba ese `--gutter` como relleno a los lados.
- A 1280 px, el relleno era de 340 px por lado: la hoja se estiraba a 680 px y al contenido le quedaban **44 px**, medido en producción ("Las / ciudades / donde / ya…").
- En el teléfono no se notaba: ahí `--gutter` vale 20 px.

## Qué se hizo
- `ui/Hoja` usa a los lados el relleno del teléfono (`--espacio-5`, 20 px) en vez de `--gutter`. En el teléfono es el mismo valor: no cambia nada.
- El comentario de `--gutter` en `globals.css` ya dice que es solo para cajas que van a todo lo ancho de la ventana. También decía que las hojas iban a lo ancho y ya no era cierto.

## Todos los elementos con el mismo problema
- **Todas las hojas usan `ui/Hoja`, así que el arreglo alcanza a las 13:**
  - Dónde (agenda, Lugares, Artistas);
  - el menú "···" de las fichas;
  - Voy y Seguir con la pregunta de avisos;
  - Borrar, Soy yo / es mi grupo, Es mi espacio, perfil reservado;
  - Instalar, Salir sin publicar;
  - Dónde está (alta de lugar) y Dónde es (alta de evento).
  
  El visor de fotos no es hoja: ocupa la pantalla entera.
- **Revisado en el código, sin cambios:** los demás archivos que usan `--gutter` lo hacen en cajas a todo lo ancho (páginas, cabeceras pegajosas, barra inferior, botón flotante, barra de Seguir o Voy, capas del mapa, esqueletos) o con margen negativo que llega al borde (barra interior). Ninguna otra caja mide la columna.
- **Revisado en pantalla a 1280×800 en producción**, con un detector de elementos cuyo relleno o margen se come más de la mitad del ancho, o con texto largo en una tira angosta:
  - solo encontró la hoja (Dónde en Artistas; el menú "···" de la ficha de un lugar se veía igual de roto);
  - agenda, Lugares en lista y en mapa, ficha de lugar, Entrar y Aviso de privacidad: nada apretado.

## Evidencia
- lint (un aviso viejo, ajeno), typecheck, 206 pruebas y build en verde (también después del segundo arreglo).
- **Antes y después a 1280×800**, con el build de la rama servido en local y datos de producción, solo lectura:
  - la hoja Dónde de Artistas pasa de 680 px, con 340 px de relleno y el texto en 44 px, a 600 px centrada, alineada con la columna de la lista, con 20 px de relleno y el texto en 560 px en un renglón;
  - el menú "···" de la ficha de Casa del Poeta pasa de "Reportar" en una tira al centro a "Reportar" a todo lo ancho;
  - con la hoja abierta, el detector ya no encuentra nada.
- **A 390×844 queda igual que en producción:** hoja de 390 px, 20 px de relleno, texto en 350 px.
- **Sin mirar en escritorio:** las hojas que piden sesión (Voy, Seguir, Borrar, las de las altas). Son la misma pieza, pero conviene pasarlas en la firma.

## Segundo arreglo: la hoja con el teclado del iPhone
El founder preguntó si la hoja de ciudad (rama `ciudad-de-artistas`, bitácora 067) se recalcula con el teclado del celular. Probado en el simulador (iPhone 15 Pro, iOS 26.3, Safari, teclado en pantalla, tecleando con toques).

**El fallo.**
- La hoja sí se acomoda sobre el teclado al abrir y al llegar los resultados.
- Pero al arrastrar la lista con el teclado arriba, se movía la página de atrás y la hoja quedaba recortada, con un hueco blanco debajo. Se reprodujo dos veces.
- Solo pasa cuando la hoja se vuelve desplazable después de que el teclado ya está arriba, como en la hoja Ciudad: su lista crece al llegar los resultados.
- En "Dónde es" no pasa (su lista ya desborda al abrir, aunque se filtre), ni sin teclado.

**Qué se hizo en `ui/Hoja`:**
- **Mientras hay una hoja abierta, la página de atrás no se desplaza** (`overflow: hidden` en `<html>`). Con varias hojas abiertas, se suelta al cerrar la última. Solo en `<html>`: con `<body>` también, la página volvía arriba al abrir (medido: de 300 a 0).
- **Arrastrar la hoja con el teclado arriba lo guarda**, como en las búsquedas del iPhone. No pasa sobre el mismo campo, para poder mover el cursor. Sin teclado, la hoja crece a toda la altura y la lista se recorre.

**Cambio de comportamiento a firmar:** en "Dónde es" y "Dónde está", antes la lista se recorría con el teclado arriba. Ahora el primer arrastre guarda el teclado y los siguientes recorren.

**Evidencia en el simulador:**
- *Hoja Ciudad*, con el cambio puesto de forma temporal en su rama y quitado después: con "San" y el teclado arriba, el primer arrastre guarda el teclado y la hoja queda a toda la altura, sin recorte ni hueco; el segundo recorre la lista con el campo pegado arriba.
- *"Dónde es"*, con el build de esta rama: el arrastre guarda el teclado y la lista se recorre con el campo arriba.
- *Menú "···"* de una ficha desplazada 300 px, a 390×844 en el navegador: al abrir la hoja la página sigue en 300 con `<html>` bloqueado; al cerrar, sigue en 300 y se suelta.

## Firma pendiente
En el escritorio del founder:
- la hoja Dónde;
- el menú "···" de una ficha;
- una hoja de un alta.

En el iPhone real:
- abrir la hoja Ciudad o "Dónde es";
- escribir y arrastrar los resultados con el teclado arriba;
- abrir y cerrar el menú "···" con la ficha desplazada.

Push y PR cuando el founder lo pida. **La rama `ciudad-de-artistas` conviene mezclarla junto con esta o después.**
