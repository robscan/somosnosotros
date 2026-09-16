# 050 · La lista de ciudades vuelve, el campo pegajoso en "Dónde es" y la propuesta para más ciudades

**Fecha:** 2026-09-16 (tarde) · **Base:** dos observaciones del founder · **PR:** #59.

## Qué se hizo
- **El chip de ciudad abre siempre su hoja.** Antes solo se abría con más de una ciudad con eventos próximos; como hoy hay una sola, el chip era un letrero sin acción y el founder echó de menos la lista. La hoja lista las ciudades con eventos (hoy, San Luis Potosí · 85 eventos).
- **"Dónde es": el campo se queda arriba.** Al recorrer la lista de lugares en la hoja, el campo de búsqueda se iba con el contenido. Ahora es pegajoso arriba de la hoja, con una sombra del color del fondo que tapa lo que pasa por debajo. Medido: con la lista desplazada 600 px, el campo sigue arriba de la hoja.

## Propuesta: que se sienta escalable a todo el mundo
Hoy la ciudad es una lista fija de una entrada (`lib/ciudad.ts`); el alta de lugar no deduce la ciudad (la base pone "San Luis Potosí" a todo lo que se registra) y Lugares y Artistas no tienen chip de ciudad. Para que crezca sola:
1. **El alta de lugar deduce la ciudad del punto.** Mapbox ya devuelve la ciudad al elegir la sugerencia o al poner el pin; se guarda con el lugar. Un evento en "otro sitio" toma la ciudad del pin.
2. **Las ciudades salen de los lugares que hay**, con conteo, centro y zoom calculados de sus lugares; la hoja las lista y cualquiera puede abrir una registrando el primer lugar ("Otra ciudad: registra el primer lugar").
3. **Curación mínima**: Mapbox separa Soledad de Graciano Sánchez de la capital y para la gente son una sola ciudad; una tabla corta de equivalencias (municipio → ciudad) evita partir el área metropolitana. Lo mismo servirá en otras zonas.
4. **El mismo chip de ciudad en Lugares y Artistas**, y el mapa centrado en la ciudad elegida.
Estimado: media jornada, con migración (columna ya existe) y pruebas. No se empezó: es una decisión de producto (el 14 de septiembre se decidió "sin segunda ciudad").

## Evidencia
lint, typecheck y 145 pruebas en verde. Navegador integrado a 390: la hoja "Dónde" se abre desde el chip; "Dónde es" con la lista desplazada y el campo arriba (usuario desechable, borrado).

## Firma
Firmado por el founder en el iPhone (2026-09-16, tarde): "Te firmo todo".
