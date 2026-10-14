# 436 · El grafo: la leyenda de capas en píldoras, replegar al quitar la lente y el doc 56 con umbral 1 (OL-405)

**Fecha:** 2026-10-14. **Rama:** `grafo-leyenda`, base `origin/main` (`99a9851f`). **Operador:** agente de la pieza (Fable 5.1), sin otros agentes. **Sin migración, sin tablas nuevas y sin variables de entorno nuevas.**
**Estado:** lista para la revisión del gestor y el «publica» del founder.

## El encargo

El founder cerró las dudas de las bitácoras 432 y 435 la noche del 13 de octubre: «tomo todas tus recomendaciones». Se quedan como están el radio de 50 m de los sitios, «sigue a» fina y tenue, el panel de ayuda del teléfono que no recuerda «abierto» y la caché de una hora con «Actualizar». Cambian tres cosas: la leyenda de capas, qué pasa con una capa que desplegó una lente y una corrección del doc 56.

## Lo que se ve

1. **Las capas son una fila de píldoras bajo la barra**, encima de la escena: «Lugar», «Artista», «Asistente» y, aparte, «Yo». Cada una con su punto de color; plegada, el punto queda hueco y el texto apagado (`aria-pressed`). Se ven de 36 de alto (`--alto-chip`) y se tocan de 44 (un `::after` sale de la caja, como el chip de la app; el probador de toques lo confirma). La fila corre a lo ancho con el aire lateral de la barra (`--espacio-4`) y, a 320, se desliza de lado sin cortar píldoras (355 de contenido en 320). Los textos largos de la leyenda («en su posición real», «sobre el lugar donde más toca», «anónimo, posición inventada», «por dar de alta») salieron de la pantalla; viven en el panel de ayuda y en el manual. La escena ya no lleva nada abajo a la izquierda salvo la ⓘ y «Lentes · Lista», que no se movieron.
2. **Al quitar una lente, las capas vuelven a como las tenía la persona.** Con «Lugar» plegado, la lente «¿Qué lugares no comparten artista con nadie?» lo despliega (como hasta hoy, y lo avisa bajo «Islas»); al quitar la lente, «Lugar» vuelve a plegarse. Lo que se guarda en el aparato (`localStorage`) es solo lo que la persona eligió: durante la lente sigue diciendo «Lugar plegado». Si la persona toca una píldora con la lente puesta, esa elección se guarda y gana (la capa deja de ser «de la lente»).
3. **Doc 56:** «umbral de 3» pasa a 1 con la nota fechada que pidió el founder.

## Archivo por archivo

- `src/app/admin/grafo/capas.ts` (nuevo) y `capas.test.ts` (8 pruebas): la lógica pura de las capas. El estado son dos cosas: `elegidas` (lo de la persona, lo único que se guarda) y `porLente` (las que una lente desplegó). Se ve una capa si está en cualquiera de las dos. `aplicarLente`, `quitarLente`, `alternarCapa`/`ponerCapa` (la persona manda y saca la capa de `porLente`), `capasGuardables` y `estadoDeGuardado` (solo cuentan booleanos).
- `motor.ts`: usa `capas.ts`. `capas` sigue siendo lo que se ve (el resto del motor no cambió); `guardar()` escribe `capasGuardables`; `aplicarLente` despliega por la lente; `quitarLente` las vuelve a plegar y, si algo cambió, repinta con `refrescarCapas()` (barra, árbol, tarjeta, escena, lista; si la tarjeta tenía un punto de una capa que se pliega, se suelta). «Yo» pone `persona` como elección de la persona. El botón «Yo» sin asistencias ya no usa `disabled`, sino `aria-disabled` (ver decisiones).
- `Grafo.tsx`: la fila `.capas` (grupo «Capas») entre la barra y la escena; la pila de abajo se quedó con el panel de ayuda y los botones; se fueron la marca «Sitio sin ficha · por dar de alta» y el texto «Aún no has asistido ni seguido».
- `Grafo.module.css`: una fila más en la rejilla (`capas`); en columnas anchas (desde 1048) la fila queda solo sobre la escena y el árbol y la lista siguen ocupando toda la altura; las píldoras; la pila en horizontal pasa a «botones · panel» (antes «leyenda · panel» y botones debajo); en horizontal bajo 520 de alto, «Red» y «Desde arriba» van en una fila (con la fila de capas encima, en columna ya no cabían con el mando). Se borraron `.leyenda`, `.capa`, `.marcaSitio` y `.sinAsistencias`. `medidasEnDuro` sigue en 342.
- `ayuda.ts`: «Capa Lugar», «Capa Artista», «Capa Asistente» y «Yo» dicen lo que decía la leyenda (el gris de los sitios, «tócala para plegarla», «sin asistencias queda apagado»); los detalles (y con ellos el manual) cuentan que las capas son las píldoras bajo la barra y que una lente solo despliega la capa mientras está puesta. La entrada «Sitio sin ficha» se queda (la usa la tarjeta del sitio) y el manual no cambia de estructura.
- `scripts/ops/auditoria-ui/medidas.aceptadas.json`: `s29-admin-grafo` baja de 464 · 464 · 502 · 501 a **460 · 460 · 498 · 497** nodos (se fueron cuatro: la marca, el aviso, los envoltorios de la leyenda; entró la fila). Profundidad igual (11). `s30` no se movió. Ajustado a mano; solo bajó.
- `motor.ts` y `docs/rediseno/prototipos/grafo-3d.html`: las dos luces de la sección «Luces».
- `docs/rediseno/56-grafo-cultural-3d.md`: § 5 punto 7 (con la nota fechada del founder), § 3.6 (la frase que remite a la pregunta 10), § 7 bis (nota al final de la sección: la sección no nombraba el 3) y la pregunta 10 (tachado el 3, 1, y la nota). El resto del documento no se tocó.

## Decisiones que tomé

- **«Sitio sin ficha» no es una capa:** hoy era una marca (un párrafo con su punto gris, sin interruptor; plegar «Lugar» ya lo pliega). Como dijo el encargo («va dentro de Lugar»), **no hice píldora**: la explicación vive en la ayuda de «Capa Lugar» (los sitios son los grises) y en la tarjeta del sitio, y el árbol conserva su fila «Sitios sin ficha» con el punto gris. Costo: ya no hay un punto gris en la fila superior.
- **«Yo» sin asistencias:** antes decía debajo «Aún no has asistido ni seguido». Ese texto salió de la pantalla; «Yo» se ve atenuado y la ayuda dice «queda apagado» y por qué. Usé `aria-disabled` en vez de `disabled` para que el panel de ayuda siga recibiendo el puntero (un botón deshabilitado no lo recibe) y para que el lector de pantalla lo anuncie; el clic ya salía sin hacer nada.
- **Gutter:** la fila usa `--espacio-4`, el aire de la barra de esta pantalla, no `--gutter` (que mide por la columna de la app y aquí la escena es de borde a borde, con columnas a los lados).
- **«Yo» mide 44 de ancho** (el probador exigió 44 de toque en los dos sentidos; a la primera falló con 40) y 36 de alto a la vista. Va con un hueco extra a la izquierda para leerse «aparte».
- **Si la persona pliega con la lente puesta una capa que la lente había desplegado**, queda plegada y guardada (su elección gana, aunque la lente se quede sin esa capa). Si la despliega de nuevo, queda desplegada y guardada y sobrevive a quitar la lente.
- **Cambiar de una lente a otra** primero vuelve a plegar lo de la primera y luego aplica la segunda: nunca se acumulan capas.

## Verificación

`npm run lint` (0 errores, el aviso de siempre), `npm run typecheck`, `npm test`: **220 archivos, 3 907 pruebas** (8 nuevas en `capas.test.ts`), `npm run inventario`: sin novedades (342 medidas en duro, 1 bloque duplicado aceptado), `npm run medir`: 40 pantallas × 4 anchos, **sin novedades** con el presupuesto nuevo (a la primera falló el toque de «Yo» de 40×44; con 44 de ancho pasó).

**A mano**, `next build` + `next start` contra el respaldo local (llave de servicio inventada puesta solo en el entorno de la orden; sin `.env` ni `.env.local` en el árbol), Chrome real con toques, 2×:
- Todo encendido: «38 nodos · 73 conexiones»; las cuatro píldoras de 36 de alto, a 16 · 97 · 185 · 295 px de la izquierda; `elementFromPoint` a ±21 px del centro cae en la píldora (toque de 44).
- Plegar «Lugar»: «25 nodos · 33 conexiones»; `localStorage` dice `lugar:false`; al recargar sigue plegado.
- Con «Lugar» plegado y la página recargada, aplicar «¿Qué lugares no comparten artista con nadie?»: la píldora pasa a desplegada, la barra dice «38 nodos · 73 conexiones» y **`localStorage` sigue diciendo `lugar:false`**. Quitar la lente: «Lugar» vuelve a plegado y la barra a «25 nodos · 33 conexiones».
- Con la lente puesta y «Lugar» desplegado por ella, tocar «Asistente»: se pliega y `localStorage` pasa a `persona:false`; al quitar la lente quedan plegados «Lugar» (el de la persona) y «Asistente» (el nuevo): «14 nodos · 6 conexiones · 14 artistas».
- «Yo» con la cuenta de administración: se llena (blanco), `yo:true` guardado, «Tú» sobre su punto. Con la cuenta sin asistencias: «Yo» atenuado, el toque no hace nada y no guarda nada.
- 844×390 (táctil): la escena queda libre; la fila de capas empieza a 157 px (con la barra de la app y la barra del grafo encima) y la escena mide 233 de alto. 320×640: la fila se desliza (355 de contenido).
- Con el ratón en 1280×800, el puntero sobre «Lugar» abre «Capa Lugar» con el texto nuevo.

## Capturas (`docs/rediseno/capturas-436/`, Chrome real, 2×, respaldo local con datos inventados)

1. `01-movil-pildoras-todas.png` (390×844): la nube al abrir; bajo la barra, las cuatro píldoras con su punto lleno (violeta, blanco, naranja; «Yo» sin punto); la escena no lleva nada abajo a la izquierda salvo la ⓘ plegada y «Lentes · Lista».
2. `02-movil-lugar-plegado.png`: «Lugar» plegado: su punto está hueco y su texto apagado; desaparecen los violetas y sus líneas; la barra dice «25 nodos · 33 conexiones».
3. `03-movil-lente-despliega-lugar.png`: con «Lugar» plegado se aplicó la lente de las islas: «Lugar» vuelve a verse desplegada (punto lleno), la barra «38 nodos · 73 conexiones» y los lugares aparecen; el resto, atenuado por la lente. La hoja «Lista» ya se cerró para ver la escena.
4. `04-movil-lente-quitada-lugar-replegado.png`: la lente se quitó: «Lugar» vuelve a plegada (punto hueco) y la barra a «25 nodos · 33 conexiones». Es la misma imagen que la 2: el estado de la persona.
5. `05-horizontal-844x390.png`: el teléfono en horizontal; la fila de píldoras bajo la barra, «Red» y «Desde arriba» en fila sobre el mando, «Lentes · Lista · ⓘ» abajo a la izquierda y la escena libre en medio (con la barra y el carril de la app, que ya salían desde 792).
6. `06-escritorio-1280x800.png`: tres columnas; la fila de píldoras encima de la escena, el árbol y la lista a toda la altura; el panel de ayuda abierto (hay ratón) abajo.
7. `07-movil-yo-encendido.png`: «Yo» encendido, en blanco; la cámara vuela a su punto con el anillo y el rótulo «Tú».
8. `08-movil-yo-sin-asistencias.png`: la cuenta de administración sin asistencias: «Yo» atenuado y ningún texto debajo.
9. `09-escritorio-ayuda-capa-lugar.png` (1280×800): con el puntero sobre «Lugar», el panel de ayuda enseña «Capa Lugar: Los lugares (violeta) y los sitios sin ficha (gris), en su posición real…», el texto que salió de la pantalla.
10. y 11. `10-luces-antes-0.55-2.2.png` y `11-luces-despues-0.75-1.6.png`: ver «Luces».

## Luces

Ajuste que el founder aprobó tras ver capturas comparadas, ya dentro de esta pieza: «sube intensidad de ambiente a ,75. Baja clave a 1.6 manten los demás valores» → «apruebo». En `motor.ts` la luz de ambiente pasa a `HemisphereLight(0xffffff, 0x2a2438, 0.75)` (antes 0,55) y la clave a `DirectionalLight(0xfff4e6, 1.6)` (antes 2,2); relleno (0,7), contraluz (1,1), tono ACES y exposición no se tocaron. Lo mismo en las dos líneas de `docs/rediseno/prototipos/grafo-3d.html` (224 y 225, editadas por reemplazo exacto; no se reescribió el archivo) para que prototipo y app no diverjan. Commit aparte.

Capturas acercadas (390×844 táctil, respaldo local, el Centro Cultural Universitario Bicentenario elegido y `grafo.cam.distancia = 500`; la «antes» salió de la app compilada con los valores viejos y la «después» de la compilada con los nuevos, mismo guion):
- `10-luces-antes-0.55-2.2.png`: valores viejos (ambiente 0,55 · clave 2,2).
- `11-luces-despues-0.75-1.6.png`: valores nuevos (ambiente 0,75 · clave 1,6). El cambio es sutil, como era de esperar con +0,2 y −0,6: el lado iluminado de las esferas baja un poco y su lado en sombra sube un poco (por ejemplo, el promedio de color del lugar violeta grande pasa de RGB 119·106·144 a 114·102·140 y el del artista blanco de 144·142·140 a 141·140·138); la composición y las líneas son iguales.

## Lo que no entró

- Una píldora propia para los sitios sin ficha (decisión arriba).
- En un teléfono con las barras de Safari a la vista en horizontal (menos de 390 de alto útil) la escena queda aún más baja; con la barra de la app encima desde 792 ya era un caso apretado. Se vería en el iPhone con la vista previa.
- El doc 56 sigue diciendo (§ 5, punto 6) «Sin líneas desde Seguir»; desde OL-404 «sigue a» sí es línea. No lo toqué: el encargo era solo el umbral.
- Probar en Safari del iPhone: hecho en Chrome real; la prueba del dedo es con la vista previa de la rama.

## Para el gestor

Nada que aplicar en Supabase ni en Vercel. Conflictos probables: `docs/ops/OPEN_LOOPS.md` (una bala y la cabecera) y `scripts/ops/auditoria-ui/medidas.aceptadas.json` (la línea de `s29-admin-grafo`).
