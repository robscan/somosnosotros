# 321 · Inventario de las pantallas de publicar (línea base)

**Pieza:** OL-293. **Rama:** `inventario-publicar` (local `inventario-publicar-op`, ver «Rama»). **Fecha:** 2026-10-05.
**Estado:** entrega solo de documentos para el gestor; sin código, sin PR y sin publicar.

## Para qué

El founder quiere rehacer la publicación por pasos, como Instagram (análisis [51](../../../rediseno/51-publicar-por-pasos.md), en la rama `prototipo-eventos-donde`). El prototipo nuevo se medirá contra lo que hay hoy, así que hacía falta medir lo de hoy con exactitud. Esta pieza no propone nada ni opina: describe.

## Qué se hizo

- Lectura del código de `src/app/nuevo/*`, `FormularioEvento.tsx`, `FormularioLugar.tsx`, `FormularioArtista.tsx`, `HojaDonde.tsx` y de lo que usan (tarjeta y lectura del cartel, validaciones, deducciones, guardia de salida, hojas, fichas de destino), con base `origin/main` `20898529`.
- Documento [`docs/rediseno/53-inventario-publicar.md`](../../../rediseno/53-inventario-publicar.md): por cada tipo (evento, lugar, artista), lo que se ve al llegar, lo que el sistema resuelve y lo que pregunta aunque podría deducirlo, toques mínimos en los casos pedidos con cada conteo paso a paso, hojas y pantallas secundarias con lo que se conserva o se pierde, todos los mensajes con su condición, y qué pasa al publicar. Cada afirmación lleva archivo y línea. Al final, la tabla resumen.
- No se ejecutó la app (permitido por el encargo). Lo que solo se vería corriendo está listado como «Sin comprobar» en la sección 8 del documento.

## Resumen medido

| Formulario | Bloques a la vista | Controles a la vista (formulario + ✕ y tira) |
| --- | --- | --- |
| Evento (con cartel) | 8 | 9 + 4 = 13 |
| Lugar | 5 | 6 + 4 = 10 |
| Artista | 9 | 9 + 4 = 13 |

| Caso | Toques | Escrituras | Sistema | Acciones |
| --- | --- | --- | --- | --- |
| Evento (a) cartel legible que resuelve todo | 2 | 0 | 2 | 4 |
| Evento (b) cartel con nombre y fecha, sin lugar ni precio (lugar del directorio / con costo / sitio nuevo) | 6 / 8 / 7 | 1 / 2 / 2 | 2 | 9 / 12 / 11 |
| Evento (c) sin cartel, lugar del directorio | 6 | 2 | 0 | 8 |
| Evento (d) sin cartel, sitio fuera del directorio (dirección / punto de interés / «Estoy aquí» / agregarlo) | 7 / 6 / 5 / 9 | 3 / 2 / 2 / 3 | 0 / 0 / 1 / 0 | 10 / 8 / 7-8 / 12 |
| Lugar, caso corto (sugerencia / «Estoy aquí» / punto del mapa) | 2 / 2 / 1 | 1 | 0 / 1 / 0 | 3 / 3-4 / 2 |
| Lugar, caso largo | 13 | 4 | 2 | 19 |
| Artista, caso corto | 1 | 1 | 0 | 2 |
| Artista, caso largo | 16 | 3 | 4 | 23 |

## Hallazgos que afectan a la comparación (hechos del código, sin juicio)

1. Con cartel no hay pantalla de confirmación: la revisión es el mismo formulario ya relleno.
2. Tres datos se publican con un valor que nadie leyó ni confirmó: la fecha sugerida (aunque el cartel no traiga fecha, el renglón no dice «Falta»), «Gratis» (si el cartel no trae precio) y un sitio leído del cartel sin dirección (sin pin, ciudad San Luis Potosí).
3. Un fin de evento que cae después de medianoche se lee del cartel con el mismo día y el servidor lo rechaza al publicar.
4. El borrador del evento guardado en el teléfono ya no vuelve nunca: `avisarQueVuelvo` no tiene quién la llame, así que recargar pierde todo.
5. La guardia «¿Salir sin publicar?» cubre Atrás, la ✕ y el gesto de la app instalada; el botón de atrás del navegador no la consulta (por el código; sin comprobar corriendo).
6. El selector de dirección de un evento abre vacío aunque el nombre ya esté escrito, y con una dirección como resultado pide además el nombre del sitio.

## Rama

El nombre `inventario-publicar` ya existía como rama local vieja (en `.claude/worktrees/inventario-publicar`, a 27 commits de `origin/main`, sin remoto), así que no se pudo crear con ese nombre dentro de este árbol. El trabajo está en la rama local `inventario-publicar-op` creada desde `origin/main` y se empuja a `origin/inventario-publicar` (`git push -u origin inventario-publicar-op:inventario-publicar`).

## No se hizo

- No se tocó código, ni `docs/rediseno/51-…` (queda en su rama), ni `ASIGNACIONES.md`.
- No se corrió la app, ni lint, typecheck o pruebas: documentación sola.
