# 068 · Las hojas ya no se aprietan en escritorio

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
- lint (un aviso viejo, ajeno), typecheck, 206 pruebas y build en verde.
- **Antes y después a 1280×800**, con el build de la rama servido en local y datos de producción, solo lectura:
  - la hoja Dónde de Artistas pasa de 680 px, con 340 px de relleno y el texto en 44 px, a 600 px centrada, alineada con la columna de la lista, con 20 px de relleno y el texto en 560 px en un renglón;
  - el menú "···" de la ficha de Casa del Poeta pasa de "Reportar" en una tira al centro a "Reportar" a todo lo ancho;
  - con la hoja abierta, el detector ya no encuentra nada.
- **A 390×844 queda igual que en producción:** hoja de 390 px, 20 px de relleno, texto en 350 px.
- **Sin mirar en escritorio:** las hojas que piden sesión (Voy, Seguir, Borrar, las de las altas). Son la misma pieza, pero conviene pasarlas en la firma.

## Firma pendiente
En el escritorio del founder:
- la hoja Dónde;
- el menú "···" de una ficha;
- una hoja de un alta.

En el iPhone no cambia nada. Push y PR cuando el founder lo pida.
