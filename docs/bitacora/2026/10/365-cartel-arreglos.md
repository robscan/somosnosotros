# 365 · Arreglos del creador de cartel

**Pieza:** OL-336 (sigue a OL-324, bitácora [353](353-creador-de-cartel.md)). **Rama:** `cartel-arreglos` (sobre `origin/main` `418f952d`, con `main` traído después hasta `456a0ef9`). **Fecha:** 2026-10-07. **Operador:** Claude (agente del gestor IV).
**Estado:** hecho y probado con la app compilada contra el respaldo local (Chrome de la Mac, historial real) y con el banco de dibujo; falta el iPhone del founder y el Safari del simulador. **Sin migración.**

## Qué pidió el founder (2026-10-07, tras probar en su iPhone)

Ocho cosas: (1) la fecha final mal en eventos de varios días («Ciclo Fellini» guarda su fin a las 00:00 del 15 y el cartel decía 15); (2) a un festival o una exposición, solo el mes, porque el cartel es una imagen que no se actualiza; (3) la fecha salía dos veces en una plantilla; (4) sello con el símbolo de la app y el dominio; (5) «Crea su cartel» siempre en «Publicado» (no lo vio); (6) Atrás útil tras «Usar como cartel del evento» («siempre el botón atrás sea útil»); (7) «No me gusta ninguno»; (8) medir todo el flujo.

## Qué cambió

1. **Último día con la regla de la ficha.** La regla de `rangoDelPeriodo` (un fin justo a la medianoche es el final del día anterior) sale a una función propia, `ultimoDiaDelPeriodo` (`src/lib/claseEvento.ts`), que usan la ficha y el cartel. `datos.ts` escribe el rango, la fecha corta y la fecha en grande con ese último día. Con un fin a las 00:00 el evento acaba con su último día, así que la hora es solo la de inicio (como ya pasaba con las 23:59): «10:00 h», no «10:00–00:00 h». Pruebas: el caso del banco `variosDias` (9 al 15 a las 00:00 → «Del 9 al 14 de octubre», «9–14 OCT»), una noche que termina a las 00:00 (un solo día), de un mes a otro y la regla sola en `claseEvento.test.ts`.
2. **Festival y exposición: solo el mes.** `cargar.ts` trae `clase` (la ficha ya la lee con `*`). Para esas dos clases: «Octubre 2026», «Octubre – Noviembre 2026» o «Diciembre 2026 – Enero 2027»; la fecha corta «Oct 2026»; la fecha en grande «OCT» con «2026»; **sin hora** (`hora: null`; ninguna plantilla escribe «Horario por día» ni una hora). Un fin a las 00:00 del día 1 no suma ese mes. Eventos y talleres, igual que antes.
3. **Una sola fecha por cartel.** Los textos traen la fecha en tres formas (`dia`, `diaCorto` y `fecha`, la de la imagen: número y mes) y cada composición usa una. Revisadas las doce:
   - cine a sangre y banda: con foto, la fecha va en los datos; sin foto, la fecha en grande es la imagen y los datos solo dicen la hora (si no cabe en grande, vuelve a los datos);
   - tipográfico franja: sin foto, la fecha girada (con la hora) y abajo solo sitio y quién; con foto, en los datos;
   - tipográfico fecha (la que vio el founder): la fecha enorme manda y los datos de abajo ya no la repiten;
   - feria papel picado y boleto: sin foto, el sello redondo con el día; la cinta o el boleto dicen solo la hora (en un festival sin foto el boleto lleva el precio);
   - zine cinta: la fecha va solo en el sello (ahora con el rango o el mes); zine recorte: solo en la etiqueta de arriba; los datos de abajo ya no llevan la fecha (y el precio no se repite si ya va arriba);
   - galería marco: «Cuándo» una vez; galería columna sin foto: el día enorme en la columna y el rótulo pasa a «Hora»;
   - deco arco y sol: sin foto, el día en la forma y la línea dorada solo la hora.
   Prueba nueva en `dibujar.test.ts` (`fechaUnaVez`): en las 12 plantillas × 2 formatos × con y sin foto, cada día del evento lo nombra un solo texto de los que colocó satori, la hora una vez, el 15 de «Fellini» nunca, y un festival dice el año una vez y ninguna hora. Control: devolviendo la fecha a los datos de «tipográfico fecha», la prueba falla en sus 12 casos.
4. **Sello: símbolo SN y dominio.** El pie lleva el símbolo SN como trazo en línea (satori lo dibuja sin pedir nada a la red; probado: se ve nítido a tamaño real) y `DOMINIO_CARTEL` (`src/lib/carteles/tokens.ts`, hoy `somosnosotros.org`, con su comentario: cuando el founder compre `somosnosotrxs.org` se cambia ahí y nada más; la dirección corta `/e/<slug>` sigue valiendo). Misma letra y tamaño de pie de antes, siempre en el color suave de la paleta: las doce paletas lo prueban con 4,5:1 sobre su fondo, así el sello es AA en todas (deco usaba el texto al 60 %, sin prueba; ahora el suave). El trazo del símbolo vive en `src/lib/simboloSN.ts` y lo comparten el cargador (`ui/SimboloCargando`) y el cartel.
5. **«Crea su cartel» siempre en «Publicado».** Por qué no salía: la condición pedía «sin otra sugerencia» y la de OL-323 (`SugerenciaPublicado`) siempre está montada para un evento o un taller, aunque no enseñe nada. Ahora sale siempre, tenga o no cartel subido: sola, en punteado con su botón secundario; tras otra sugerencia a la vista (la de OL-323 abierta o hecha, «¿Tiene inauguración?», «¿Falta algo del programa?»), después y en una línea quieta «Crear su cartel», nunca dos cajas. «Compartir» sigue siendo el principal salvo con la sugerencia de OL-323 abierta (sin cambios).
6. **Atrás útil.** La ✕ del creador, «No me gusta ninguno» y «Usar como cartel» llevan a la ficha sin dejar el creador detrás: con el historial si la pantalla de detrás es la ficha y, si no, reemplazando el creador (`useVolverA` nuevo en `ui/Atras.tsx`; «Usar» con el `useTerminar` de siempre, que además relee la ficha). Antes «Usar» hacía `router.push` y Atrás volvía al creador. «Crear cartel» de «Publicado» abre el creador con `replace` (terminar el alta no la deja en el historial). `PorPasos` acepta `salida.alSalir` y `Cerrar` `alCerrar` para eso.
7. **«No me gusta ninguno»**, enlace quieto bajo «Ver otros diseños». Se mide y vuelve a la ficha (como la ✕), sin preguntar por qué y **sin aviso**: `ui/Confirmacion` se va con la pantalla que lo pide, y en la ficha no hay nada que confirmar.
8. **Medición del flujo** (lista cerrada de `src/lib/medir.ts`, máximo dos datos, opciones de letras y guiones bajos como pide su prueba):

   | Acción | Datos |
   | --- | --- |
   | `cartel_abierto` | `desde`: menu / accion / publicado / otro |
   | `cartel_otros` | `tanda`: primera / segunda / tercera (la que se ve después) |
   | `cartel_elegido` | `plantilla` (las 12, `cine_sangre`…) · `formato`: publicacion / historia |
   | `cartel_formato` | `formato` |
   | `cartel_titulo_acortado` | — (nunca lo escrito) |
   | `cartel_descargado` | `plantilla` · `formato` (descargado o en Fotos, solo si terminó bien: `alGuardar` nuevo en `BotonDescargarCartel`) |
   | `cartel_usado` | `plantilla` · `formato` |
   | `cartel_ninguno` | `tanda` |

   **Sin id ni slug del evento:** el canon de OL-325 prohíbe «ids de fichas» en los datos (la página va, limpia, en la URL que ya manda Vercel, como cualquier acción de una ficha). El origen viaja en `?origen=` (`src/lib/carteles/origen.ts`, sin dependencias para no cargar las medidas de las letras en el alta); el redireccionamiento de id a slug lo conserva. «Se abrió» espera hasta 5 s a saber quién mira (la marca de rol llega en streaming en una carga completa). Una prueba comprueba que la lista de plantillas medidas es la del catálogo. El aviso de privacidad ya dice «acciones sin nombre»: no hace falta un renglón nuevo.

## A dónde lleva Atrás en cada entrada (comprobado con el historial real de Chrome)

App compilada (`next build && next start`) contra el respaldo local; marcas leídas de `history.state` en cada paso.

| Entrada al creador | Salida | Queda | Atrás de la ficha |
| --- | --- | --- | --- |
| Menú «···» de la ficha (desde la agenda) | «No me gusta ninguno» | la misma entrada de la ficha (marca 1, detrás la agenda); el creador queda adelante | la agenda |
| Menú «···» | la ✕ | igual: un solo toque a la ficha | la agenda |
| Menú «···», en «Así queda» | atrás del navegador | la ficha (los pasos no son historial); otra vez, la agenda | — |
| Acción redonda (evento sin cartel) | elegir, «Ver otros diseños», formato, «Descargar el cartel» (se descargó `cartel-ecos-de-papel-galeria-columna.jpg`; la pantalla no se mueve) y «Usar como cartel del evento» | la ficha, con el historial (marca 1) y releída | la agenda |
| «Publicado» del alta (desde la agenda) | «Crear cartel» | el creador en el lugar de «Publicado» (el largo del historial no cambia) | — |
| «Publicado» | la ✕ del creador | la ficha del evento nuevo en ese mismo lugar (detrás, la agenda) | la agenda: adonde mandaba el alta |
| Enlace directo al creador (sin nada detrás) | cualquiera | la ficha reemplaza al creador | la pantalla madre de la ficha |

En «Así queda» el chevrón de la barra vuelve a «¿Cuál te gusta?» (canon de `PorPasos`: los pasos son estado) y la ✕ del primer paso a la ficha; tras descargar, la persona sigue en el creador hasta tocar una de las dos. Las mismas secuencias están como pruebas en `historial.test.ts` («el creador de cartel: Atrás útil»), con el caso de antes (el `push` volvía al creador) para que no regrese.

**«Usar como cartel» en el respaldo:** en HTTP la app no acepta la URL del cartel subido (`imagenPermitida` pide https en el 443, y escuchar en el 443 de la Mac no se permite sin abrirlo a toda la red), así que la acción contesta «No se pudo guardar». Para recorrer la pantalla con el historial real se cambió en el navegador esa única respuesta por la de éxito; el dibujo, la subida al Storage del respaldo y el `update` sí corrieron de verdad. **Falta probarlo en la vista previa de Vercel.**

**Safari:** no se probó en el simulador. Lo que se apoya en el historial (la ✕, «ninguno», «Usar») usa `history.back()` desde JavaScript, que en Safari respeta las entradas de la app (bitácora 102); el atrás del propio navegador desde el creador cae en la ficha si se vino de ella. Por confirmar en el iPhone.

## Decisiones del operador (por confirmar)

1. `public/logotipo-chico.svg` es el logotipo SMSNSTRS (3903 × 790), no el símbolo: el sello lleva el **símbolo SN** del favicon y del cargador.
2. Un evento de varios días con fin a las 00:00 dice solo la hora de inicio.
3. La fecha en grande de un festival es «OCT» con «2026» al lado (y «OCT–NOV»); la de varios días, «9–14» con «OCT».
4. «No me gusta ninguno» sin aviso.
5. La ✕ del creador abierto desde «Publicado» va a la ficha del evento nuevo (dice «Volver al evento»), no a donde estaba la persona antes del alta; el Atrás de esa ficha sí va ahí.
6. «Crea su cartel» también sale si el evento ya tiene cartel subido.
7. Cuando la sugerencia de OL-323 llega después de pintar «Publicado», la caja del cartel pasa a línea quieta (un salto de alto, como el que ya hace la sugerencia al llegar).
8. Lo que se mide va sin el evento (ni id ni slug).

## Pruebas

- `npm run lint` (solo el aviso viejo de `VisorImagen`), `npm run typecheck`, `npm test` (**3229**, 181 archivos, con `main` traído), `npm run inventario` (sin novedades), `npm run medir` (35 pantallas × 4 anchos, sin novedades; el creador no está en `medir`).
- Nuevas o cambiadas: `datos.test.ts` (fechas del cartel, siete casos), `dibujar.test.ts` (una sola fecha en las 12 × 2 × 2 con tres casos nuevos del banco: `variosDias`, `festival`; y nada se corta con «…» en ellos), `claseEvento.test.ts` (`ultimoDiaDelPeriodo`), `historial.test.ts` (cinco casos del creador), `medir.test.ts` (los ocho eventos, lo que no se manda y las tandas), `elegir.test.ts` (plantillas medidas = catálogo).
- Componentes: `Sugerencias.componentes.test.mjs` ajustada (sin sugerencia, «Crea su cartel» en punteado con botón secundario y «Compartir» principal; con la de H1, la línea quieta «Crear su cartel»); las tres del alta, 101/101. `npm run test:componentes` completo: 506/508 con dos fallos de tiempo bajo carga (`HojaLugares`, `Confirmacion`) que pasan solos (25/25); no los toca esta pieza.

## Capturas (`docs/rediseno/capturas-365/`)

Abiertas y miradas una por una.

- `365-390-01-cual-te-gusta`: «¿Cuál te gusta?» del taller (desde el menú), cuatro familias, cada una con una sola fecha y el sello abajo; debajo «Ver otros diseños» y «No me gusta ninguno». Flojo: hay mucho aire entre los dos enlaces quietos (el espacio de la columna de `PorPasos`).
- `365-390-02-publicado-crea-su-cartel`: «Evento publicado» sin otra sugerencia: «Crea su cartel» en punteado con «Crear cartel» secundario y «Compartir» principal en el pie.
- `365-390-03-publicado-con-otra-sugerencia`: del banco de componentes (sin Bricolage, 1×): con la exposición sugerida (OL-323) abierta, «Crear su cartel» va después como línea quieta.
- `carteles/` (JPEG a tamaño real, como se descargan, dibujados por la app compilada con foto inventada):
  - evento puntual (taller, viernes 9): `365-puntual-tipo-fecha-4x5` («9 OCT 17:00 h» arriba y la fecha no se repite abajo) y `365-puntual-cine-sangre-4x5` («Viernes 9 de octubre · 17:00 h» en los datos);
  - varios días con fin a las 00:00 del 14 («Linternas»; trae horario por día en el respaldo): `365-varios-dias-tipo-fecha-4x5` («9–13 OCT»), `365-varios-dias-galeria-marco-4x5` («Del 9 al 13 de octubre») y `365-varios-dias-zine-cinta-9x16` (el sello «9–13 OCT»): el último día es el 13, no el 14;
  - festival (fin a las 00:00): `365-festival-tipo-fecha-4x5` («OCT 2026», sin hora), `365-festival-deco-arco-9x16` («OCT 2026») y `365-festival-cine-banda-4x5` («Octubre 2026»).
  En todos el sello (símbolo SN y `somosnosotros.org`) se lee en el color suave de su paleta.

## Pendiente

- El iPhone del founder: «Usar como cartel» de punta a punta (vista previa de Vercel) y el Atrás del navegador y del gesto en Safari y en la app instalada.
- Si el founder quiere aviso tras «No me gusta ninguno», haría falta un aviso que sobreviva al cambio de pantalla (hoy no existe).
