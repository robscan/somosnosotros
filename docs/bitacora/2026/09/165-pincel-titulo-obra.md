# 165 · Pincel: el título de la obra sigue al lugar elegido (OL-130)

**Fecha:** 2026-09-22 · **OL:** OL-130 · **Rama:** `pincel-titulo-obra` desde `origin/main` (`9f39770`) · **Commit:** uno (el hash va en el aviso al gestor) · **Sin push** (lo sube el gestor) · Sin migración.

## Lo que dijo el founder (literal)

«Al crear una pared el título se toma del lugar seleccionado, pero si lo cambio el título no se actualiza.»

## Causa, medida en el código

En `CrearObraAqui.tsx` el nombre sugerido («Pincel en <lugar>») se calculaba dos veces —al montar, con el primer lugar de la lista, y al terminar de leer la ubicación, con el lugar más cercano— y se guardaba como texto en su propio estado. Al cambiar el lugar en el selector solo cambiaba `lugarId`; el nombre no se recalculaba nunca. Además un solo `tocado` marcaba tanto «eligió otro lugar» como «escribió el nombre», así que después de tocar el selector la ubicación ya no proponía nada, y el «×» del campo dejaba el nombre vacío para siempre. Medido antes del cambio (Chrome real, captura `antes-tras-cambiar-lugar.png`): al abrir «Pincel en Centro de prueba»; al elegir «Otro lugar lejano», seguía «Pincel en Centro de prueba»; tras el «×» y otro lugar, vacío.

## Qué cambia

- **Dos modos, puros** (`src/lib/pincel.ts`): `TituloObra` es `{ modo: "automatico" }` o `{ modo: "manual"; texto }`. `tituloDeObra(titulo, lugarNombre)`: automático → «Pincel en <lugar>» (o vacío sin lugar); manual → lo escrito. `alEscribirTitulo(texto, lugarNombre)`: vacío o exactamente la sugerencia → automático; cualquier otra cosa → manual. Cuatro pruebas: el automático sigue al lugar y cambia con él; lo escrito se respeta aunque cambie el lugar; borrar el campo (el «×») o escribir justo la sugerencia vuelve al automático; editar la sugerencia a medias es manual.
- **El formulario** guarda el modo, no el texto: el nombre que se muestra y se manda es `tituloDeObra(titulo, lugarElegido)`, así al cambiar el lugar el título automático lo sigue solo; el `onChange` del campo pasa por `alEscribirTitulo`; el «×» del campo (`Limpiar`, que dispara un `input` vacío) cae en el mismo camino y vuelve al automático. La ubicación al abrir solo propone el lugar más cercano si la persona no había elegido uno (`lugarTocado`), y el título lo sigue.

## Verificación

Chrome real, Administración → Obras colectivas, 390×844, sin permiso de ubicación (el lugar de arranque es el primero de la lista):

| paso | antes | después |
| --- | --- | --- |
| al abrir | Centro de prueba · «Pincel en Centro de prueba» | igual |
| elegir «Otro lugar lejano» | **sigue «Pincel en Centro de prueba»** | **«Pincel en Otro lugar lejano»** |
| escribir «Mural de la tarde» y volver a «Centro de prueba» | «Mural de la tarde» | «Mural de la tarde» (se respeta) |
| «×» del campo | vacío | **«Pincel en Centro de prueba»** (automático otra vez) |
| «×» y luego «Otro lugar lejano» | vacío | **«Pincel en Otro lugar lejano»** |

Capturas: `evidencia-ol126/admin-ol130-390x844-{antes,despues}-{tras-cambiar-lugar,titulo-propio,tras-x}.png` (abiertas).

`npm run typecheck && npm run lint` (0 errores; 1 aviso previo) `&& npm test` (1005/1005, 4 nuevas) `&& npm run build`: verde.

## Lo que solo puede verificar el founder

Que al crear una pared en su teléfono, cambiar el lugar cambie el título, que lo que escriba se quede, y que el «×» lo devuelva al automático.
