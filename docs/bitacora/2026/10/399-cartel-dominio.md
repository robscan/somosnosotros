# 399 · El cartel firma con somosnosotrxs.org (OL-368)

**Fecha:** 2026-10-10. **Rama:** `cartel-dominio`, base `origin/main` (`c121be99`). **Hecho por:** el gestor V. Sin migración.

## Qué pidió el founder

«3 comprado y conectado pero solo vamos a cambiar dominio en el cartel, no en ningún otro lugar.» Desde OL-336 el pie del cartel lleva el símbolo SN y el dominio en una sola constante, `DOMINIO_CARTEL`, preparada para este cambio.

## Comprobado antes de cambiar

- `https://somosnosotrxs.org` y `https://www.somosnosotrxs.org` responden con un 308 a `https://somosnosotros.org/`, conservando la ruta: `somosnosotrxs.org/e/austin-tv-ma-tour-san-luis-potosi` llega a la ficha del evento con un 200.
- La constante solo se usa en el cartel: el sello del pie (`plantillas/piezas.tsx`) y la dirección corta `enlaceCorto` (`datos.ts`), que hoy no se dibuja. Nada más de la app la lee.

## Qué cambió

- `src/lib/carteles/tokens.ts`: `DOMINIO_CARTEL = "somosnosotrxs.org"`, con la decisión del founder en el comentario.
- `src/app/eventos/[id]/cartel/page.tsx`: la versión de las vistas previas del creador incluye el dominio. Las vistas previas se guardan un día en la caché del teléfono; sin esto, quien ya abrió el creador vería hasta mañana el dominio viejo.
- Comentarios de `datos.ts` y `plantillas/tipos.ts`, y la prueba de `enlaceCorto`.
- El resto de la app sigue con somosnosotros.org: metadatos, sitemap, correos, compartir y la app de tienda no cambian.

## Evidencia

Los 480 carteles de prueba de `dibujar.test.ts` (12 plantillas × 2 formatos × con y sin foto × 10 casos) se dibujaron con el dominio nuevo y pasan su revisión de que nada se sale ni se encima. Dos en `docs/rediseno/capturas-399/`:

- `01-tipo-franja-4x5-sin-foto.jpg`: «Noche de son huasteco»; al pie, el símbolo SN y «somosnosotrxs.org».
- `02-cine-banda-9x16-con-foto.jpg`: la misma firma en el formato de historia con foto.

Los carteles que ya se descargaron conservan el dominio con que se dibujaron.

## Verificación

`npm run lint && npm run typecheck && npm test && npm run inventario && npm run medir`: lint sin errores (el aviso de siempre en `VisorImagen.componentes.test.mjs`), tipos correctos, 3445 pruebas en 190 archivos, inventario y medición (37 pantallas × 4 anchos) sin novedades.
