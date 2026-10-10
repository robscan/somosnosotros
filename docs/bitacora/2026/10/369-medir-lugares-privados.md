# 369 · La URL medida ya no lleva el nombre de una ficha (OL-340)

**Pieza:** OL-340, residuo de OL-334 (bitácora [363](363-medir-urls-y-plazo.md)) y de OL-325 (bitácora [354](354-medir-acciones.md)). **Rama:** `medir-lugares-privados`, desde `origin/main` `c121be99`. **Fecha:** 2026-10-10. **Operador:** Claude (agente del gestor V). Sin migración, sin variables nuevas y sin cambios de pantalla.

## Qué se medía

Vercel Analytics y Google Analytics recibían la dirección de cada página ya sin búsqueda, sin filtros libres y sin el id de una persona, pero con el slug de la ficha: `/lugares/casa-inventada`, `/eventos/fiesta-inventada/cartel`. El slug sale del nombre, así que el de un lugar privado, el de un evento oculto o el de un sitio con la dirección reservada llegaba a la medición. En el teléfono no se sabe si una ficha es privada sin preguntar a la base, así que la regla tiene que ser la misma para todas.

## Qué se mide ahora

Toda ruta de ficha se mide como su sección, sin importar lo que siga. Vale para las vistas y para la página de cada acción medida («Voy», «Seguir», compartir…), en Vercel y en Google: es una sola limpieza.

| Ruta | Se mide |
| --- | --- |
| `/lugares/<slug>`, y su edición | `/lugares` |
| `/eventos/<slug>`, y edición, cartel y calendario | `/eventos` |
| `/artistas/<slug>`, y edición, letrero y novedades | `/artistas` |
| `/sitios/<slug>` (OL-348) | `/sitios` |
| `/personas/<id>` (ya desde OL-334) | `/personas` |
| `/obra/<id>/mando` y `/pared` | `/obra` |
| `/e/<slug>`, la dirección corta del cartel | `/e` |
| `/api/…/<id>` y `/auth/<proveedor>` (no son páginas; misma regla) | `/api`, `/auth` |

Igual con mayúsculas, barra final, barras repetidas, barra codificada (`%2f`) o letras codificadas. Las listas (`/lugares`, `/agenda`, `/artistas`) y sus filtros de la lista cerrada no cambian; en una ficha también se conserva la consulta permitida, como ya pasaba en `/personas`. Las rutas privadas siguen sin mandarse. Lo que se pierde: en Google y en la dirección que guarda Vercel ya no se sabe qué ficha se vio, y la lista y las fichas de una sección cuentan juntas.

## Cómo

- `rutaSinId` (`src/lib/limpiarUrlAnalitica.ts`) se generaliza: antes solo reconocía `/personas`; ahora reconoce la lista de secciones con ficha, que son todas las rutas dinámicas de `src/app` que no son privadas, más `/e`.
- `limpiarUrlEvento` ya pasaba por esa limpieza; en una ruta privada, su primer tramo se corta también en la barra codificada.
- Ninguna acción medida manda el slug, el id ni el título por otro dato: la lista cerrada de `src/lib/medir.ts` solo acepta opciones fijas y lo que va a Google por el servidor lleva solo el nombre y esos datos. No hubo nada que quitar.

## Cómo se verifica

- `src/lib/limpiarUrlAnalitica.test.ts`: cada ruta dinámica con lo que la sigue, mayúsculas, barra final, `%2f`, un `%` suelto, la consulta permitida, las listas sin cambio, las rutas privadas en null y `limpiarUrlEvento` con slug. Una prueba recorre `src/app`, pone un slug inventado en cada tramo dinámico y falla si alguna vista o acción lo deja salir: una ruta nueva sin cubrir rompe la prueba.
- `medir.test.ts`, `analyticsGoogle.test.ts` y `AnalyticsVercel.test.ts`: lo que se le pasa a Vercel, la vista de Google y su contexto llevan la sección.
- Control negativo: con la limpieza anterior fallan 16 de las 22 pruebas nuevas o cambiadas (las otras seis comprueban lo que no debe cambiar: listas, rutas fijas, rutas privadas, que Vercel y Google vean lo mismo y que la búsqueda de rutas funcione); si se quita `obra` de la lista, falla la que recorre `src/app`.
- `npm run lint && npm run typecheck && npm test && npm run inventario && npm run medir` sobre el commit del código (`a7a1d199`): lint sin errores (el aviso de `VisorImagen.componentes.test.mjs` ya estaba), tipos correctos, 3461 pruebas en 190 archivos, inventario sin novedades y 37 pantallas × 4 anchos sin novedades. Sin cambios de pantalla: no hay captura nueva.

## Aviso de privacidad

Sin cambio. Dice que se mide «qué páginas se ven» y que no se manda el nombre, el correo, lo que se escribe al buscar ni la ubicación; sigue siendo cierto, y ahora se manda menos.

Pendiente: revisión del gestor y «publica» del founder.
