# 53 — Inventario de las pantallas de publicar (línea base para rehacerlas por pasos)

**Fecha:** 2026-10-05 · **Pieza:** OL-293 · **Estado:** inventario de lo que hay hoy; no propone nada y no toca código.
**Base leída:** `origin/main` en `20898529` (2026-10-05). **Método:** lectura del código; la app no se ejecutó (lo que solo se vería corriendo está en la sección 8, «Sin comprobar»).

Para qué sirve: el análisis 51 (`51-publicar-por-pasos.md`, hoy en la rama `prototipo-eventos-donde`) pide medir en toques el prototipo por pasos contra la pantalla de hoy. Aquí está «la pantalla de hoy», con la ruta del archivo y la línea de cada afirmación.

## 0. Cómo leer este documento

**Rutas completas de los archivos citados** (en las tablas van solo con su nombre y la línea):

| Nombre corto | Ruta |
| --- | --- |
| `page.tsx` (alta) | `src/app/nuevo/page.tsx` |
| `Alta.tsx` | `src/app/nuevo/Alta.tsx` |
| `FormularioEvento.tsx` | `src/app/eventos/FormularioEvento.tsx` |
| `TarjetaCartel.tsx`, `estadoCartel.ts`, `gestosFlyer.ts`, `borrador.ts`, `direccionEvento.ts`, `SelectorCuando.tsx`, `SelectorQuien.tsx`, `operacionEvento.ts` | `src/app/eventos/…` |
| `acciones.ts` (eventos) | `src/app/eventos/acciones.ts` |
| `FormularioLugar.tsx` | `src/app/lugares/FormularioLugar.tsx` |
| `acciones.ts` (lugares) | `src/app/lugares/acciones.ts` |
| `FormularioArtista.tsx`, `HojaCiudad.tsx` | `src/app/artistas/…` |
| `acciones.ts` (artistas) | `src/app/artistas/acciones.ts` |
| `HojaDonde.tsx` | `src/components/HojaDonde.tsx` |
| `SalirSinPublicar.tsx`, `SelectorEnlaces.tsx`, `MapaDondeEs.tsx` | `src/components/…` |
| `Atras.tsx`, `Barra.tsx`, `BotonPublicar.tsx`, `CampoLargo.tsx`, `Hoja.tsx`, `SelectorFecha.tsx`, `Limpiar.tsx`, `ContadorCaracteres.tsx`, `abrirConError.ts` | `src/components/ui/…` |
| `CampoImagenUrl.tsx` | `src/components/CampoImagenUrl.tsx` |
| `eventos/[id]/page.tsx`, `lugares/[id]/page.tsx`, `artistas/[id]/page.tsx` (las fichas) | `src/app/eventos/[id]/page.tsx` y las otras dos |
| `lib/eventos.ts`, `lib/cartel.ts`, `lib/formulario.ts`, `lib/hojaDonde.ts`, `lib/buscarLugares.ts`, `lib/lugares.ts`, `lib/artistas.ts`, `lib/fechas.ts`, `lib/calendario.ts`, `lib/subirFoto.ts`, `lib/guardiaSalida.ts`, `lib/armazon.ts`, `lib/limites.ts` | `src/lib/…` |
| `tope_de_lecturas.sql` | `supabase/migrations/20260917160000_tope_de_lecturas.sql` |
| `lugares_privados.sql` | `supabase/migrations/20260915110000_lugares_privados.sql` |

**Cómo se cuenta en las secciones de «toques»:**

- **Toque** = un toque sobre un control de la app. Tocar un campo para que salga el teclado cuenta como un toque cuando el campo no tiene foco automático.
- **Escritura** = un campo que se llena con el teclado (se cuenta aparte; no se cuentan las letras).
- **Sistema** = lo que pasa fuera de la app: el selector de fotos del teléfono y el permiso de ubicación. Se estima 2 para elegir una foto (fuente y foto); es una estimación: no está en el código de la app.
- El conteo empieza con la pantalla de alta ya abierta (tocar el «+» sumaría 1). Esperar la lectura del cartel no es un toque. Desplazar la pantalla no se cuenta (si el botón de publicar queda a la vista sin desplazarse: sin comprobar).
- **Acciones** = toques + escrituras + sistema.
- Salvo que el caso diga otra cosa: se acepta lo que el sistema propone (la fecha sugerida, «Gratis», el tipo deducido).

## 1. La pantalla de alta, común a los tres tipos

Una sola ruta, `/nuevo`, con los tres formularios montados a la vez; solo se ve el del tipo elegido y los otros quedan escondidos con lo escrito (`Alta.tsx:36-37`, `Alta.tsx:53-55`).

| Elemento | Qué hace hoy | Ref. |
| --- | --- | --- |
| Barra de arriba | Título «Publicar un evento», «Registrar un lugar» o «Registrar artista» (en un duplicado, «Duplicar evento») y una ✕ a la derecha | `Alta.tsx:52`, `lib/armazon.ts:66-70`, `Barra.tsx:28-35` |
| Tira de tipos al pie | Evento · Lugar · Artista, fija abajo; cambiar de tipo no apila historial, sube al inicio de la pantalla y no pierde lo escrito en los otros | `Alta.tsx:45-48`, `Alta.tsx:56-64`, `Alta.module.css:19-31` |
| Sin tira | En un evento «ya armado» (`?desde=`, `?lugar=` o `?artista=`) solo hay formulario de evento y no hay tira | `page.tsx:43-44`, `page.tsx:102-117`, `Alta.tsx:43` |
| Sin sesión | Se redirige a `/entrar` con la ruta de vuelta; la sesión se pide antes de ver el formulario | `page.tsx:42` |
| Entradas por la dirección | `?tipo=` el tipo con el que abre; `?ciudad=` la ciudad del chip (acerca la búsqueda de dirección y es la ciudad inicial del artista); `?nombre=` lo que se buscó y no se encontró (lugar y artista); `?lat=&lng=` el punto sostenido en el mapa (lugar); `?lugar=`, `?artista=` y `?desde=` un evento ya armado | `page.tsx:28-34`, `page.tsx:36-41` |
| Foco automático | El nombre de lugar y el de artista toman el foco solo si ese es el tipo con el que abrió; el de evento nunca | `Alta.tsx:54-55`, `FormularioEvento.tsx:556-559` |

### Qué se conserva y qué se pierde (común)

| Gesto | Qué pasa | Ref. |
| --- | --- | --- |
| ✕ o «Atrás» de la barra | Si algo cambió respecto a cómo se abrió, pregunta en una hoja «¿Salir sin publicar?» con «Se borra lo que escribiste.», «Seguir editando» y «Salir y borrar». Si no cambió nada, sale sin preguntar. La comparación es campo por campo sobre los tres formularios (solo cuentan los campos con `name`) | `SalirSinPublicar.tsx:9-12`, `SalirSinPublicar.tsx:21-58`, `Atras.tsx:30-51` |
| Gesto de atrás nativo de la app instalada | Hace lo mismo que el botón (queda registrado como el «volver» visible) | `Atras.tsx:26-29`, `Atras.tsx:44` |
| Botón o gesto de atrás del navegador del sistema | El código no consulta la guardia en ese caso (solo hay `popstate` para otros fines y ningún `beforeunload`); lo escrito se pierde sin preguntar. Leído en el código, sin comprobar corriendo | `Atras.tsx:41`, `lib/guardiaSalida.ts:19-24`, búsqueda de `beforeunload` sin resultados en `src` |
| Recargar la página | Todo lo escrito se pierde: el borrador guardado en el teléfono se borra al montar el formulario de evento, y solo volvería si otra pantalla hubiera dejado la señal de «vuelvo de registrar un lugar», que hoy ningún código deja (`avisarQueVuelvo` no tiene quién la llame). Sobreviven los parámetros de la dirección (`?tipo=`, `?ciudad=`…) | `FormularioEvento.tsx:308-344` (línea 317), `borrador.ts:29-45` |
| Foto o cartel ya subidos | Se suben a Storage en cuanto se elige el archivo; si la persona se va, el archivo queda subido (no hay código en estos formularios que lo borre) | `FormularioEvento.tsx:409-420`, `FormularioLugar.tsx:252-261`, `FormularioArtista.tsx:143-153` |
| Lectura de cartel consumida | El cupo se aparta antes de llamar al modelo y las lecturas fallidas también cuentan; salir a mitad no la devuelve | `acciones.ts` (eventos) `150-160`, `tope_de_lecturas.sql:5-6` |
| Tocar «Publicar» dos veces | El evento manda una clave de operación que se conserva si el formulario no cambió; el botón se apaga mientras guarda | `operacionEvento.ts:4-7`, `FormularioEvento.tsx:541-542`, `FormularioEvento.tsx:781` |
| Publicar con error del servidor | Los campos siguen como estaban (el borrador solo se suelta al enviar) y el error sale junto al campo o encima del botón | `FormularioEvento.tsx:543-545`, `FormularioEvento.tsx:775-780` |

---

## 2. EVENTO

### 2.1 Qué ve la persona al llegar (de arriba abajo)

Estado: alta nueva, con la lectura de cartel activa (`ofrecerCartel = cartelActivo && esAlta`, `FormularioEvento.tsx:359`; `cartelActivo` es que el servidor tenga llave de Anthropic, `lib/cartel.ts:10-12`, `page.tsx:93`). Sin esa llave no hay tarjeta y quedan 7 bloques.

| # | Bloque | Qué muestra | Controles a la vista | Obligatorio para publicar | Plegado | Ref. |
| --- | --- | --- | --- | --- | --- | --- |
| – | Barra | Título y ✕ | ✕ | – | – | `Alta.tsx:52` |
| 1 | Tarjeta del cartel | «Sube el cartel» / «Leemos el nombre, la fecha, el lugar y el precio.» con icono de cámara; todo el recuadro es el control | Tarjeta (abre el selector de fotos) | No (opcional) | No | `FormularioEvento.tsx:554`, `TarjetaCartel.tsx:35-42`, `TarjetaCartel.tsx:78-84` |
| 2 | Nombre | Campo con lupa, «Nombre del evento», borde discontinuo mientras está vacío; ✕ para borrar al haber texto; contador desde el 75 % de 120 | Campo | Sí (`faltaNombre`) | No | `FormularioEvento.tsx:560-577`, `lib/limites.ts:11-18`, `ContadorCaracteres.tsx:14-16` |
| 3 | Cuándo | Valor ya puesto: día · 19:00 (hoy si son antes de las 18:00 del sitio, mañana si no) | «Cambiar» | Sí, pero llega resuelto | Sí: Empieza/Termina | `FormularioEvento.tsx:587-617`, `FormularioEvento.tsx:164`, `lib/fechas.ts:193-197` |
| 4 | Dónde | «Falta» con dos iconos | «Estoy aquí», «Buscar el lugar» | Sí | La hoja «¿Dónde es?» | `FormularioEvento.tsx:620-661`, `FormularioEvento.tsx:643-655` |
| 5 | Quién | «Sin artista» (o «Nombre · tú» si la cuenta tiene exactamente un artista ligado) | «Agregar» | No | Sí: buscador de artistas | `FormularioEvento.tsx:664-676`, `FormularioEvento.tsx:267`, `FormularioEvento.tsx:379` |
| 6 | Cuánto | «Gratis» ya puesto | «Cambiar» | Sí, pero llega resuelto | Sí: tres chips y, con costo, un número | `FormularioEvento.tsx:679-718`, `FormularioEvento.tsx:194`, `FormularioEvento.tsx:378` |
| 7 | Más | «Descripción, enlace, foto» | «Agregar» | No | Sí: descripción, enlace, imagen | `FormularioEvento.tsx:721-746` |
| 8 | Publicar evento | Botón y, debajo, la nota «Falta el nombre y dónde es.» | Botón (en apariencia apagado mientras falte algo) | – | – | `FormularioEvento.tsx:781-783`, `BotonPublicar.tsx:11-22`, `lib/formulario.ts:25-27` |
| – | Tira de tipos | Evento · Lugar · Artista | 3 botones | – | – | `Alta.tsx:56-64` |

**Recuento a la vista (alta con cartel):** 8 bloques del formulario (+ barra y tira del armazón = 10); 9 controles en el formulario (tarjeta 1, nombre 1, Cuándo 1, Dónde 2, Quién 1, Cuánto 1, Más 1, Publicar 1) + 4 del armazón (✕ y tres tipos) = 13. Sin lectura de cartel: 7 bloques y 8 controles (+4 del armazón). Cuatro bloques traen su contenido plegado (Cuándo, Quién, Cuánto, Más) y uno lo abre en otra pantalla (Dónde). Cuándo, Quién y Cuánto funcionan como acordeón: abrir uno cierra el que estaba abierto; Más es independiente (`FormularioEvento.tsx:283-284`, `FormularioEvento.tsx:591`, `FormularioEvento.tsx:668`, `FormularioEvento.tsx:683`, `FormularioEvento.tsx:725`).

**Lo que hay dentro de lo plegado** (aparece al tocar el renglón):

| Plegado | Contenido | Ref. |
| --- | --- | --- |
| Cuándo | Fila «Empieza» con dos píldoras (fecha, hora); fila «Termina» con «Sin hora de fin» (o fecha y hora más una ✕ «Quitar la hora de fin»); cada píldora abre la hoja de fecha (sección 2.5) | `SelectorCuando.tsx:98-129` |
| Quién | Fichas de los elegidos con ✕, campo «Nombre de artista o grupo» (o «Otra persona o grupo»), sugerencias desde 2 letras (hasta 5, las propias primero), «Crear a «…»», y una nota si no hay nada | `SelectorQuien.tsx:88-159` |
| Cuánto | Tres chips «Gratis», «Cooperación solidaria», «Con costo»; con «Con costo», campo numérico «Ej. 150» (con foco automático) | `FormularioEvento.tsx:688-705` |
| Más | «Descripción» (renglón que abre una capa a pantalla completa), «Enlace», imagen puesta (si hay), «Poner el cartel o una foto» / «Cambiar la imagen»; para administración, además, un campo para pegar la dirección de una imagen | `FormularioEvento.tsx:728-745`, `CampoLargo.tsx:61-117` |

### 2.2 Qué resuelve ya el sistema sin preguntar, y qué pregunta aunque podría deducirlo

| Dato | Qué hace el sistema | Ref. |
| --- | --- | --- |
| Cuándo | Propone hoy 19:00 (antes de las 18:00) o mañana 19:00; no hay marca de «sin confirmar»: si nadie lo toca, se publica con esa fecha. La hora sugerida solo se señala dentro de la lista de horas | `lib/fechas.ts:193-197`, `FormularioEvento.tsx:164`, `SelectorFecha.tsx:88` |
| Cuándo (zona) | Si luego se elige un sitio de otra zona y nadie tocó la hora, la hora sugerida se vuelve a calcular en esa zona | `FormularioEvento.tsx:77-84`, `FormularioEvento.tsx:388`, `lib/fechas.ts:203-209` |
| Cuánto | «Gratis» de entrada, sin preguntar | `FormularioEvento.tsx:194` |
| Quién | Vacío; solo si la cuenta tiene un único artista ligado, viene con él | `FormularioEvento.tsx:267` |
| Dónde | Solo viene resuelto si llega con `?lugar=` o si el directorio de lugares tiene uno solo (caso teórico) | `FormularioEvento.tsx:137` |
| Ciudad del evento y zona horaria | Se deducen (del lugar elegido o del pin) y no se muestran | `acciones.ts` (eventos) `51-67` |
| Ciudad elegida en el chip | Solo acerca la búsqueda de la hoja «¿Dónde es?»; no rellena nada | `page.tsx:100`, `lib/hojaDonde.ts:204-207` |
| Lugar en la hoja | El campo abre vacío aunque el nombre del evento ya esté escrito (en el alta de lugar la hoja sí hereda el nombre) | `HojaDonde.tsx:136`, `lib/hojaDonde.ts:192-194` |
| Nombre del sitio | Si el pin viene de una dirección (no de un punto de interés), el nombre se pide a mano y «Listo» no se enciende sin él | `HojaDonde.tsx:353`, `lib/hojaDonde.ts:75-79` |
| Artistas | Solo se sugieren al escribir en Quién (o salen del cartel); el nuevo viaja con el nombre y se crea al publicar | `SelectorQuien.tsx:78-83`, `acciones.ts` (eventos) `89` |
| Tipo del artista nuevo | Se deduce del nombre, «solista» por omisión | `acciones.ts` (eventos) `89` |
| Hora de fin | No se propone; «Sin hora de fin» | `SelectorCuando.tsx:121-123` |

### 2.3 La lectura del cartel: qué devuelve y qué no

**Qué se le pide al modelo** (todo puede venir vacío): título, fecha, hora, hora de fin, lugar, dirección, gratis (sí/no/no se sabe), precio, descripción, enlace y artistas (`lib/cartel.ts:14-26`). El modelo es `claude-sonnet-5` con esfuerzo bajo; se le dice la fecha de hoy y que no invente (`lib/cartel.ts:36-41`). Cupo: 20 lecturas al mes por cuenta, renovadas el día 1; las fallidas cuentan; la administración no tiene tope (`tope_de_lecturas.sql:5-9`, `tope_de_lecturas.sql:17-18`).

**Cómo cae cada dato en el formulario** (`lib/eventos.ts:418-434`, `FormularioEvento.tsx:500-523`). Solo se rellena un campo si nadie lo tocó ni venía de antes (`gestosFlyer.ts:49-60`).

| Campo del formulario | Lo que llega del cartel | Qué pasa cuando el cartel no lo trae | Ref. |
| --- | --- | --- | --- |
| Nombre | Título (hasta 120) | Se queda lo que hubiera escrito (vacío) | `lib/eventos.ts:423`, `FormularioEvento.tsx:501` |
| Cuándo | Fecha + hora; si hay fecha sin hora, 19:00 | Sin fecha: no se toca la fecha sugerida y la tarjeta dice «Revisa la fecha…», pero el renglón no dice «Falta»: muestra la sugerida y se puede publicar con ella | `lib/eventos.ts:424`, `FormularioEvento.tsx:502-506`, `FormularioEvento.tsx:522` |
| Termina | Hora de fin **el mismo día** que el inicio | Sin hora de fin, vacío. Si el fin cae después de medianoche, queda antes del inicio y el servidor lo rechaza al publicar («El fin tiene que ser después del inicio.») | `lib/eventos.ts:425`, `lib/eventos.ts:373` |
| Cuánto | Gratis solo si el cartel no dice que hay precio y no trae precio; con precio, el **primer número** del texto («$100 estudiantes» pasa a 100; «$1,500» a 1500; más de 6 dígitos queda vacío) | **Sin precio y sin «gratis» en el cartel: queda «Gratis» sin avisar** (no se lista entre lo que falta). Con costo y número ilegible: «Con costo» sin número, y al publicar el servidor pide el precio | `lib/eventos.ts:426-427`, `lib/eventos.ts:161-179`, `FormularioEvento.tsx:507-511`, `lib/eventos.ts:376` |
| Descripción | Una o dos frases (hasta 1000) | Se queda vacía | `lib/cartel.ts:23`, `FormularioEvento.tsx:512` |
| Enlace | Un enlace o dominio tal cual; «@usuario» pasa a Instagram; un teléfono se descarta (queda solo en la descripción) | Vacío | `lib/eventos.ts:409-415`, `FormularioEvento.tsx:513` |
| Quién | Hasta 6 nombres; cada uno se busca en el directorio por nombre (en todas las ciudades) y, si coincide, es la ficha existente; si no, «nuevo» | **Sin artistas, Quién queda vacío y se borra el artista propio que venía por omisión** | `lib/eventos.ts:432`, `acciones.ts` (eventos) `170-176`, `gestosFlyer.ts:45-47`, `FormularioEvento.tsx:514` |
| Dónde, caso 1 | Nombre del lugar que coincide con **exactamente una** ficha pública del directorio (la búsqueda exige 4 letras y que el nombre del cartel esté contenido en el de la ficha; trae hasta 5 y solo con 1 se elige) | – | `acciones.ts` (eventos) `164-168`, `lugares_privados.sql:33-42`, `FormularioEvento.tsx:515-517` |
| Dónde, caso 2 | Con dirección: sitio «en otro sitio» con el pin pendiente. Con nombre del lugar y dirección, el renglón dice «Confirmar» (muestra la dirección); con dirección y sin nombre, el renglón dice «Falta» y la dirección queda guardada sin verse. En los dos casos, al abrir la hoja se busca sola la dirección y, si hay una coincidencia clara, se fija el punto; si no hay nombre, «Listo» sigue apagado hasta escribir uno | Con nombre y sin dirección: ver caso 3 | `FormularioEvento.tsx:518-521`, `FormularioEvento.tsx:369-370`, `FormularioEvento.tsx:633-642`, `HojaDonde.tsx:181-190`, `HojaDonde.tsx:236-240`, `lib/hojaDonde.ts:133-135`, `lib/hojaDonde.ts:154-161` |
| Dónde, caso 3 | Solo nombre de lugar que no está en el directorio: se guarda como «en otro sitio» **sin pin y sin pedir confirmación** (el renglón muestra «Nombre · otro sitio» y el botón se enciende); la ciudad del evento cae en San Luis Potosí | Sin lugar ni dirección: «Falta» | `direccionEvento.ts:16-19`, `FormularioEvento.tsx:518-521`, `lib/eventos.ts:353-358`, `acciones.ts` (eventos) `64-67` |
| Imagen del evento | La foto del cartel se pone como imagen del evento (es la portada de la ficha) | Si la lectura falla, la imagen igual se queda puesta | `FormularioEvento.tsx:491-493`, `acciones.ts` (eventos) `161` |

**Qué no devuelve la lectura:** coordenadas del sitio; ciudad; un sitio reservado; fecha de fin distinta del día de inicio; precios por categoría (solo el primer número); tipo de evento (no existe ese campo en el formulario).

**Qué ve la persona al terminar de leer:** la tarjeta cambia a «Leí el cartel» con miniatura y la frase «Revisa el nombre, la fecha, dónde y publica.» (solo lo que falta de esas tres) o «Revisa que todo esté bien y publica.» No hay pantalla de confirmación aparte: el formulario de abajo es la revisión (`estadoCartel.ts:37-40`, `FormularioEvento.tsx:522-523`, `TarjetaCartel.tsx:35-42`).

### 2.4 Toques mínimos hasta publicar (evento)

Todos con la lectura activa, la fecha sugerida aceptada, «Gratis» aceptado y sin artistas, salvo que se diga otra cosa.

**(a) Cartel legible que resuelve todo** (nombre, fecha y hora, lugar que existe una sola vez en el directorio, precio):

| Paso | Qué se hace | Toques | Escrituras | Sistema |
| --- | --- | --- | --- | --- |
| 1 | Tocar la tarjeta «Sube el cartel» | 1 | – | – |
| 2 | Elegir fuente y foto en el selector del teléfono (estimado) | – | – | 2 |
| 3 | Esperar «Leyendo el cartel…» («Tarda unos segundos») | – | – | – |
| 4 | Tocar «Publicar evento» | 1 | – | – |
| **Total** | | **2** | **0** | **2** → **4 acciones** |

Sostén: `FormularioEvento.tsx:461-532` (lectura), `FormularioEvento.tsx:374` y `lib/formulario.ts:25-27` (el botón se enciende con nombre y dónde resueltos).

**(b) Cartel que resuelve nombre y fecha pero no lugar ni precio.** El precio queda «Gratis» sin avisar (2.3), así que el cartel no obliga a tocar Cuánto; falta Dónde.

| Variante | Pasos tras subir el cartel (1 toque + 2 de sistema) | Toques | Escrituras | Sistema | Acciones |
| --- | --- | --- | --- | --- | --- |
| **b-1** lugar que está en el directorio, gratis | Tocar «Buscar el lugar» (1); tocar el campo «Nombre o dirección» (1, la hoja no tiene foco automático en un evento) y escribir el nombre (1 esc.); tocar el lugar en la lista (1); tocar «Listo» (1); tocar «Publicar evento» (1) | 1 + 5 = **6** | **1** | 2 | **9** |
| **b-2** igual que b-1 pero con costo | b-1 más: «Cambiar» de Cuánto (1), chip «Con costo» (1), escribir el número (1 esc.; el campo tiene foco automático) | **8** | **2** | 2 | **12** |
| **b-3** sitio que no está en el directorio, con una dirección | Tocar «Buscar el lugar» (1); campo (1) y escribir la dirección (1 esc.); tocar la sugerencia de Mapbox (1); tocar el campo «Nombre del lugar» del resumen (1) y escribirlo (1 esc.); «Listo» (1); «Publicar evento» (1) | 1 + 6 = **7** | **2** | 2 | **11** |
| b-3 con punto de interés | Si el resultado es un punto de interés, ya trae nombre: se salta el campo del nombre | **6** | **1** | 2 | **9** |

Sostén: `FormularioEvento.tsx:643-655` (Dónde sin resolver), `HojaDonde.tsx:646` (`autoFocus={lugar?.conFoco}`, sin valor para evento), `HojaDonde.tsx:721-746` (lista), `HojaDonde.tsx:353` (una dirección no pone nombre), `lib/hojaDonde.ts:75-79` (`Listo` pide nombre), `HojaDonde.tsx:627` (Listo).

**(c) Sin cartel, en un lugar del directorio** (gratis, fecha sugerida):

| Paso | Qué se hace | Toques | Escrituras |
| --- | --- | --- | --- |
| 1 | Tocar el campo «Nombre del evento» (sin foco automático) y escribirlo | 1 | 1 |
| 2 | Tocar «Buscar el lugar» | 1 | – |
| 3 | Tocar el campo «Nombre o dirección» y escribir el lugar | 1 | 1 |
| 4 | Tocar el lugar en la lista | 1 | – |
| 5 | Tocar «Listo» | 1 | – |
| 6 | Tocar «Publicar evento» | 1 | – |
| **Total** | | **6** | **2** → **8 acciones** |

Variantes del mismo caso: con otra fecha, +4 toques (Cambiar de Cuándo; píldora de fecha; un día del calendario; «Listo» de la hoja) y +1 más si también cambia la hora (`SelectorCuando.tsx:79-92`, `SelectorFecha.tsx:59-61`, `SelectorFecha.tsx:102`): **10 toques**. Con costo, +2 toques y +1 escritura. Si se llega desde la ficha de un lugar (`?lugar=`), Dónde ya viene resuelto y quedan **2 toques y 1 escritura** (campo del nombre, Publicar). Si se duplica un evento (`?desde=`), todo viene copiado menos la fecha: cambiar la fecha y publicar son **5 toques** (`page.tsx:48-52`, `FormularioEvento.tsx:164`).

**(d) Sin cartel, en un sitio que no está en el directorio** (gratis, fecha sugerida):

| Variante | Pasos | Toques | Escrituras | Sistema | Acciones |
| --- | --- | --- | --- | --- | --- |
| **d-1** dirección escrita | Campo del nombre (1) y escribirlo (1 esc.); «Buscar el lugar» (1); campo de la hoja (1) y escribir la dirección (1 esc.); tocar la sugerencia (1); campo «Nombre del lugar» (1) y escribir (1 esc.); «Listo» (1); «Publicar evento» (1) | **7** | **3** | – | **10** |
| **d-2** punto de interés de Mapbox (ya trae nombre) | Igual que (c) | **6** | **2** | – | **8** |
| **d-3** «Estoy aquí» | Campo del nombre (1) y escribirlo (1 esc.); icono «Estoy aquí» (1); permiso de ubicación la primera vez (1 de sistema); campo «Nombre del lugar» (1) y escribir (1 esc.); «Listo» (1); «Publicar evento» (1) | **5** | **2** | 1 (primera vez) | **7 u 8** |
| **d-4** agregarlo como lugar del directorio | Nombre (1 + 1 esc.); «Buscar el lugar» (1); campo (1) y escribir el sitio (1 esc.); «Agregar «…» como lugar» (1); campo «Dirección» (1) y escribirla (1 esc.); tocar la sugerencia (1); «Guardar y usar este lugar» (1); «Listo» (1); «Publicar evento» (1). Crea una ficha de lugar (no un sitio suelto) | **9** | **3** | – | **12** |

Sostén: `HojaDonde.tsx:454-465` (agregar), `HojaDonde.tsx:467-508` (guardar), `HojaDonde.tsx:853-857` (botón), `FormularioEvento.tsx:647-649` («Estoy aquí»), `FormularioEvento.tsx:291-306`.

### 2.5 Hojas y pantallas secundarias del evento

| Pantalla | Cómo se abre | Controles | Atrás / ✕ | Recargar o salir | Ref. |
| --- | --- | --- | --- | --- | --- |
| **¿Dónde es?** (pantalla completa, no entra al historial) | «Estoy aquí» (la abre y lee la ubicación) o «Buscar el lugar»; «Cambiar»/«Confirmar» cuando ya hay algo | Atrás; Listo (apagado hasta que haya pin y nombre); campo «Nombre o dirección» con ✕; mapa (tocar un pin registrado, un punto de interés o un punto vacío; arrastrar el pin); botón flotante «Estoy aquí»; resumen con «Nombre del lugar» editable, dirección y notas; lista flotante de lugares y direcciones; barra «Agregar lugar» al haber lista; hoja «Agregar lugar» | **Atrás no cambia nada**: nada se avisa al formulario hasta «Listo». Al reabrir, la hoja arranca desde lo ya elegido en el formulario, con el campo vacío | Se pierde lo que no se confirmó con «Listo» | `HojaDonde.tsx:619-630`, `HojaDonde.tsx:129-130`, `HojaDonde.tsx:547-551`, `FormularioEvento.tsx:785-804` |
| **Agregar lugar** (hoja a media pantalla dentro de la anterior) | Barra «Agregar «…» como lugar» | Nombre (con lo escrito ya puesto); Dirección con lista flotante (o tocar el mapa o «Estoy aquí»); interruptor «Es un lugar privado» («Solo tú lo ves; podrás volver a usarlo en otros eventos»); «Guardar y usar este lugar» (apagado sin nombre y sin punto) | Se cierra al guardar; «Listo» sigue siendo necesario después | Al guardar se **crea de verdad** la ficha de lugar (con o sin privado) | `HojaDonde.tsx:767-848`, `HojaDonde.tsx:830-835`, `HojaDonde.tsx:841-846`, `acciones.ts` (lugares) `91-105` |
| **Fecha y hora** (hoja de abajo, «Selecciona la fecha del evento») | Las píldoras de Empieza o Termina | ✕ «Cerrar»; calendario con «Mes anterior» y «Mes siguiente» (sin días pasados, salvo el que ya estaba elegido); lista de horas de 15 en 15 min (96 opciones); «Duración» informativa (solo en Empieza); «Listo» (apagado sin día y hora) | ✕, tocar fuera o Escape cierran **sin aplicar**; «Listo» aplica | El valor aplicado vive en el formulario | `SelectorFecha.tsx:50-108`, `Hoja.tsx` (cabecera con ✕), `lib/calendario.ts:155-161` |
| **Descripción** (capa a pantalla completa, sin ✕) | Tocar el renglón «Descripción» dentro de Más | Título, contador desde el 75 % de 1000, «Listo», área de texto con foco y cursor al final | Solo «Listo»; no toca el historial | El texto vive en el formulario, no en la capa | `CampoLargo.tsx:19-30`, `CampoLargo.tsx:94-117` |
| **Quién** (dentro del formulario, no es hoja) | «Agregar»/«Cambiar» | Ver 2.1 | – | Se pierde con el formulario | `SelectorQuien.tsx:88-159` |
| **¿Salir sin publicar?** | ✕ o Atrás con cambios | «Seguir editando», «Salir y borrar» | Tocar fuera = seguir | – | `SalirSinPublicar.tsx:42-57` |
| Selector de fotos y permiso de ubicación | Del sistema | – | – | – | – |

### 2.6 Mensajes de «falta», de error y de aviso (evento)

**Los que el formulario muestra sin ir al servidor**

| Mensaje | Condición | Dónde se ve | Ref. |
| --- | --- | --- | --- |
| «Falta el nombre.» / «Falta dónde es.» / «Falta confirmar dónde es.» / «Falta el nombre y dónde es.» / «Falta el nombre y confirmar dónde es.» | Nombre vacío; Dónde sin nada escrito; Dónde leído pero con el pin sin confirmar | Bajo el botón; tocar el botón no hace nada más | `lib/formulario.ts:17-27`, `BotonPublicar.tsx:14-21`, `FormularioEvento.tsx:374`, `FormularioEvento.tsx:540` |
| Valores «Falta» y «Confirmar»; «Sin artista»; borde discontinuo del nombre | Cuándo sin fecha válida; Dónde vacío o por confirmar; Quién vacío; nombre vacío | En el renglón o el campo | `FormularioEvento.tsx:377`, `FormularioEvento.tsx:633-655`, `FormularioEvento.tsx:379`, `FormularioEvento.tsx:560` |
| «Subiendo…» | Se sube una foto desde «Más» sin tarjeta de cartel | Bajo el nombre | `FormularioEvento.tsx:578` |
| «Esa hora ya pasó.» | La hora de inicio está en el pasado y Cuándo está abierto. **No bloquea la publicación** | Dentro de Cuándo | `SelectorCuando.tsx:136-140` |
| «n/tope» (por ejemplo 90/120) | El texto llega al 75 % del tope | Junto al campo | `ContadorCaracteres.tsx:14-22` |
| «{Este teléfono / Esta computadora} no da su ubicación. Toca el mapa donde es.» / «No se pudo leer tu ubicación. Toca el mapa donde es.» | «Estoy aquí» sin soporte / con error o permiso negado | En la hoja «¿Dónde es?» | `FormularioEvento.tsx:302`, `HojaDonde.tsx:675` |
| «Tiene que empezar por https://» | Administración pega la dirección de una imagen sin https | Bajo ese campo | `CampoImagenUrl.tsx:20-23` |

**La tarjeta del cartel** (titular / detalle; `TarjetaCartel.tsx:35-62`, `estadoCartel.ts`)

| Titular y detalle | Condición |
| --- | --- |
| «Sube el cartel» / «Leemos el nombre, la fecha, el lugar y el precio.» | Reposo |
| «Leyendo el cartel…» / «Tarda unos segundos. No cierres la pantalla.» y una barra | Subiendo y leyendo |
| «Leí el cartel» / «Revisa {lo que falte: el nombre, la fecha, dónde, separado por comas} y publica.» o «Revisa que todo esté bien y publica.» | Lectura terminada (`FormularioEvento.tsx:522`, `estadoCartel.ts:38-40`) |
| «Te queda 1 lectura este mes.» / «Te quedan 2 (o 3) lecturas este mes.» | Quedan 3 o menos (`estadoCartel.ts:56`) |
| «Se acabaron tus lecturas del mes» / «Se renuevan el 1 de {mes}.» y chip «Pedir más» («Pidiendo…») | Cupo agotado y sin petición |
| «Ya pedimos más para ti» / «Te escribimos en cuanto lo revisemos.» | Petición ya hecha |
| «No pude mandar la petición. Puede ser tu conexión.» | Falla «Pedir más» (`FormularioEvento.tsx:443`) |
| «No pude confirmar tus lecturas» / «Revisa tu conexión e intenta de nuevo. Puedes seguir a mano.» y chip «Reintentar» | No se pudo consultar el cupo |
| «No pude leer el cartel» / «Llena los datos a mano; la imagen se queda puesta.» y chip «Probar con otra foto» | El modelo no devolvió nada |
| «No pude subir el cartel» / «La imagen pesa más de 5 MB.» o «Puede ser tu conexión.» (y «La imagen que ya tenías se queda.») | Falla la subida (`estadoCartel.ts:18-22`, `lib/subirFoto.ts:20`) |
| «Se cortó a la mitad» / «Puede ser tu conexión.» | Excepción durante la lectura |
| «No se leyó otro cartel» / «La imagen que tenías se queda.» o «Puedes seguir a mano.» | Cupo agotado entre abrir y leer (`FormularioEvento.tsx:478-481`) |
| «La imagen no es de aquí.», «No pude apartar la lectura. Intenta de nuevo.» | Respuestas del servidor (`acciones.ts` (eventos) `153`, `157`) |

**Los del servidor al publicar** (`lib/eventos.ts:352-383`; salen junto a su campo)

| Mensaje | Condición | Campo |
| --- | --- | --- |
| «Ponle título al evento.» / «Máximo 120 caracteres.» | Nombre vacío / largo | Nombre |
| «Falta la fecha y hora. Sin fecha no se publica.» | Inicio ilegible | Cuándo |
| «La hora de fin no se entiende.» / «El fin tiene que ser después del inicio.» | Fin ilegible / fin antes o igual al inicio (por ejemplo, fin después de medianoche leído del cartel) | Cuándo |
| «Elige el lugar donde es.» | Modo lugar sin lugar válido | Dónde |
| «Di dónde es (ej. "Plaza de Armas").» / «Di cómo se anuncia el sitio (ej. "Casa en Tequis").» | Otro sitio o reservado sin nombre | Dónde |
| «Máximo 120 caracteres.» / «Máximo 200 caracteres.» | Sitio o dirección largos | Dónde |
| «Confirma la ubicación eligiendo una dirección o poniendo el pin.» | Dirección o pin sin punto válido; pin pendiente | Dónde |
| «Pon la dirección exacta: solo se revela cuando toca.» | Sitio reservado sin dirección | Dónde |
| «Pon el precio, o marca que es gratis.» | «Con costo» sin número (también con 7 o más dígitos, que se descartan) | Cuánto |
| «El precio debe ser solo números (máximo 6 dígitos, ej. 150).» | Número inválido (el campo ya solo admite dígitos) | Cuánto |
| «Máximo 1000 caracteres.» | Descripción larga | Más |
| «Demasiado largo.» / «Ese enlace no se ve bien. Revisa que empiece con https://» | Enlace de más de 500 / sin forma de enlace con https y un punto | Más |
| «La imagen no se subió bien. Intenta de nuevo.» | La imagen no es de nuestro Storage (salvo administración) | Más |
| «La imagen pesa más de 5 MB. Elige otra.» / «No se pudo subir la imagen. Intenta con otra.» / «No se pudo subir. Revisa tu conexión y prueba otra vez.» | Foto desde «Más»: pesa / error de Storage / excepción | Más (`lib/subirFoto.ts:19-25`, `FormularioEvento.tsx:416`) |
| «No se pudo publicar el evento completo. Intenta de nuevo.» | El guardado falla o no hay clave de operación | Encima del botón (`acciones.ts` (eventos) `105`, `FormularioEvento.tsx:775-780`) |

Si llega un error de Descripción, Enlace o Imagen con «Más» cerrado, «Más» se abre solo y el aviso se acerca (`FormularioEvento.tsx:356`, `abrirConError.ts:16-28`). Los errores del servidor sobre Dónde casi nunca se alcanzan desde la pantalla porque el botón ya los detiene (sin comprobar uno por uno).

**Dentro de la hoja «¿Dónde es?»** (`HojaDonde.tsx`)

| Mensaje | Condición | Ref. |
| --- | --- | --- |
| ««{texto}» no tiene ficha.» + «Agrégalo, o toca el mapa para ubicarlo.» | Hay texto y no hay resultados | `HojaDonde.tsx:747-752` |
| «Buscando…» | Búsqueda en curso (3 letras o más) | `HojaDonde.tsx:753-757` |
| «No pude buscar. Intenta de nuevo o toca el mapa.» | Falla Mapbox o falta el token | `HojaDonde.tsx:230`, `HojaDonde.tsx:761-765` |
| «No pude ubicar esa opción. Busca de nuevo o toca el mapa.» | Falla al traer el punto del resultado | `HojaDonde.tsx:356` |
| «Ubicando…» | Se mueve el pin y se resuelve la dirección | `HojaDonde.tsx:315`, `HojaDonde.tsx:699` |
| «Moviste el pin. Revisa que la dirección corresponda.» | Se arrastró el pin | `HojaDonde.tsx:703` |
| ««{nombre}» ya existe como lugar público.» | Se pidió privado y ya había uno público parecido | `HojaDonde.tsx:498` |
| «Falta la ubicación: busca la dirección, toca el mapa o usa «Estoy aquí».» | «Agregar lugar» sin punto | `HojaDonde.tsx:846` |
| «No se pudo guardar el lugar. Intenta de nuevo.» o el texto del servidor | Falla «Guardar y usar este lugar» | `HojaDonde.tsx:504`, `acciones.ts` (lugares) `104` |
| «No se pudo cargar el mapa. Revisa el token de Mapbox.» | El mapa no carga | `MapaDondeEs.tsx:293` |

### 2.7 Después de publicar (evento)

La acción redirige a la ficha del evento **reemplazando la alta** en el historial, con `?nuevo=1`; avisa a quien sigue (cola de avisos) y refresca Agenda, Artistas y las fichas de lugar y artistas (`acciones.ts` (eventos) `97-113`, `acciones.ts` (eventos) `69-77`). En la ficha, arriba, una franja «**Publicado.** Ya está en la agenda.» con un botón «Compartir»; debajo, la ficha como la verá la gente (cartel como portada, hora y día, costo, cuántos van, Compartir, A mi calendario, Cómo llegar) (`eventos/[id]/page.tsx:361-369`, `eventos/[id]/page.tsx:395-420`). No hay sugerencias de siguiente paso en la ficha publicada (la búsqueda de «sugerencia» solo da resultados en la edición). Si recargar la ficha vuelve a mostrar la franja (depende del `?nuevo=1` de la dirección): sin comprobar.

---

## 3. LUGAR

### 3.1 Qué ve la persona al llegar

| # | Bloque | Qué muestra | Controles a la vista | Obligatorio | Plegado | Ref. |
| --- | --- | --- | --- | --- | --- | --- |
| – | Barra | «Registrar un lugar» y ✕ | ✕ | – | – | `lib/armazon.ts:68` |
| 1 | Nombre | Campo con lupa «Nombre del lugar»; foco automático si el alta abrió como lugar (menos si llegó con nombre y punto); ✕ al haber texto | Campo | Sí | No | `FormularioLugar.tsx:283-306`, `FormularioLugar.tsx:297` |
| 2 | Dónde | «Falta» con dos iconos; con punto, la dirección (o «Pin en el mapa») y «Cambiar» | «Estoy aquí», «Buscar la dirección» | Sí | La hoja «¿Dónde está?» | `FormularioLugar.tsx:373-403` |
| 3 | Tipo | «Por el nombre» (vacío) o el tipo deducido; «Cambiar» | «Cambiar» | No (se deduce) | Sí: nueve chips (y «Otro» pide «¿Qué es?») | `FormularioLugar.tsx:406-444`, `lib/lugares.ts:12-22` |
| 4 | Más | «Descripción, redes, foto» | «Agregar» | No | Sí: descripción corta, «Redes y contacto», foto de portada; administración suma pegar imagen y «Solo yo lo veo» | `FormularioLugar.tsx:447-480` |
| 5 | Publicar lugar | Botón y la nota «Falta el nombre y dónde está.» | Botón | – | – | `FormularioLugar.tsx:519-521`, `lib/formulario.ts:30-32` |
| – | Tira de tipos | Evento · Lugar · Artista | 3 botones | – | – | `Alta.tsx:56-64` |

**Recuento a la vista:** 5 bloques del formulario (+ barra y tira = 7); 6 controles en el formulario (nombre 1, Dónde 2, Tipo 1, Más 1, Publicar 1) + 4 del armazón = 10. Tres bloques traen plegado (Tipo, Más) o abren otra pantalla (Dónde).

### 3.2 Qué resuelve el sistema y qué pregunta aunque podría deducirlo

| Dato | Qué hace el sistema | Ref. |
| --- | --- | --- |
| Tipo | Se deduce del nombre por palabras («museo», «galería», «teatro», «plaza», «jardín»…) o de las categorías de Mapbox; sin pista, queda «Otro» (el renglón dice «Otro», no «Por el nombre»); nunca detiene. Se deja de deducir cuando la persona lo elige a mano | `FormularioLugar.tsx:173-182`, `FormularioLugar.tsx:203-206`, `lib/buscarLugares.ts:116-133` |
| Punto, dirección y ciudad | Al **tocar** una sugerencia de Mapbox (ni siquiera una sola se elige sola) vienen el punto, la dirección y la ciudad; también al mover el pin, con «Estoy aquí» o al llegar con `?lat=&lng=` (la dirección se deduce sola) | `FormularioLugar.tsx:184-211`, `FormularioLugar.tsx:213-233` |
| Sugerencias mientras se escribe | Desde 3 letras, 350 ms después, lugares de Mapbox acotados a la ciudad de contexto más los ya registrados («Ya tiene ficha: …»); aviso en una línea al salir del campo | `FormularioLugar.tsx:139-171`, `FormularioLugar.tsx:265-268`, `FormularioLugar.tsx:314-321` |
| Ciudad | No se pregunta ni se muestra; viene de Mapbox y, si no vino, el servidor pone San Luis Potosí | `lib/lugares.ts:325` |
| Contexto de búsqueda | `?ciudad=` o, sin él, San Luis Potosí; luego el pin, el texto o la posición cacheada | `page.tsx:114`, `lib/hojaDonde.ts:204-207` |
| Nombre en la hoja | La hoja «¿Dónde está?» arranca con el nombre ya escrito (al entrar por «Buscar») | `HojaDonde.tsx:136`, `lib/hojaDonde.ts:192-194` |
| Lo que sí pregunta aunque podría deducirlo | El punto (siempre exige tocar una sugerencia, el pin o «Estoy aquí», aunque la lista traiga una sola); «Tipo» queda en «Otro» sin pedir confirmación | `FormularioLugar.tsx:184`, `FormularioLugar.tsx:264` |

### 3.3 Toques mínimos hasta publicar (lugar)

Nombre con foco automático (se llegó con «+» desde Lugares o `?tipo=lugar`); si se llegó por la tira de tipos, +1 toque para el campo (`Alta.tsx:54`).

**Caso corto** (el nombre deduce el tipo y hay ubicación):

| Variante | Pasos | Toques | Escrituras | Sistema | Acciones |
| --- | --- | --- | --- | --- | --- |
| **A** sugerencia de Mapbox | Escribir el nombre (1 esc.); tocar la sugerencia (trae punto, dirección, ciudad y tipo); tocar «Publicar lugar» | **2** | **1** | – | **3** |
| **B** «Estoy aquí» | Escribir el nombre; icono «Estoy aquí» (1); permiso de ubicación la primera vez; «Publicar lugar» (1) | **2** | **1** | 1 (primera vez) | **3 o 4** |
| **C** punto del mapa (`?lat=&lng=`, dedo sostenido en Lugares) | Escribir el nombre (sin foco automático si ya venía con nombre; con solo el punto sí); «Publicar lugar» | **1** | **1** | – | **2** |
| Con nombre y punto | Si llega `?nombre=` y `?lat=&lng=` juntos, solo falta «Publicar lugar» | **1** | **0** | – | **1** |
| Con parecido | A cualquiera se suman «No, es otro: publicar de todos modos» (1) y «Publicar lugar» otra vez (1) si hay un lugar con ese nombre a menos de 150 m | **+2** | – | – | **+2** |

Sostén: `FormularioLugar.tsx:184-211`, `FormularioLugar.tsx:387-389`, `FormularioLugar.tsx:264`, `FormularioLugar.tsx:492-512`, `acciones.ts` (lugares) `52-55`.

**Caso largo** (sin pista del nombre; se completa todo):

| Paso | Qué se hace | Toques | Escrituras | Sistema |
| --- | --- | --- | --- | --- |
| 1 | Escribir el nombre | – | 1 | – |
| 2 | Dónde por dirección: «Buscar la dirección» (1); ✕ para borrar el nombre que la hoja trae puesto (1); escribir la dirección (1 esc.); tocar el resultado (1); «Listo» (1) | 4 | 1 | – |
| 3 | Tipo: «Cambiar» (1); un chip (1) | 2 | – | – |
| 4 | Más: «Agregar» (1) | 1 | – | – |
| 5 | Descripción: tocar el renglón (1); escribir (1 esc.); «Listo» de la capa (1) | 2 | 1 | – |
| 6 | Redes: tocar el campo (1); pegar el enlace (1 esc.); «Añadir» (1) | 2 | 1 | – |
| 7 | Foto de portada: tocar (1); elegir en el teléfono | 1 | – | 2 |
| 8 | «Publicar lugar» | 1 | – | – |
| **Total** | | **13** | **4** | **2** → **19 acciones** |

Sostén: `HojaDonde.tsx:136`, `HojaDonde.tsx:646`, `HojaDonde.tsx:652`, `HojaDonde.tsx:353`, `FormularioLugar.tsx:410-428`, `FormularioLugar.tsx:451-465`, `CampoLargo.tsx:64-71`, `CampoLargo.tsx:99`, `SelectorEnlaces.tsx:209-241`.

### 3.4 Hojas y pantallas secundarias del lugar

| Pantalla | Cómo se abre | Controles | Atrás / ✕ | Recargar o salir | Ref. |
| --- | --- | --- | --- | --- | --- |
| **¿Dónde está?** (la misma pantalla completa de evento con otro cuerpo) | «Buscar la dirección» (con foco) o «Cambiar» (sin foco, campo vacío) | Atrás, Listo (basta un punto), campo, mapa, «Estoy aquí», resumen con dirección (sin nombre editable), notas | Atrás no cambia nada; «Listo» devuelve punto, dirección y ciudad | Se pierde lo que no se confirmó | `FormularioLugar.tsx:523-544`, `HojaDonde.tsx:541-545`, `lib/hojaDonde.ts:75-79` |
| En esa hoja, un lugar registrado | Tocar un pin o un renglón registrado | Solo avisa ««{nombre}» ya existe cerca de aquí. Ver ficha»; **nunca lo elige** | – | – | `HojaDonde.tsx:363-370`, `HojaDonde.tsx:705-709` |
| **Lista flotante del nombre** | Escribir 3 letras | Sugerencias de Mapbox, «Ya tiene ficha: …», errores; se cierra al salir del campo | – | – | `FormularioLugar.tsx:328-369` |
| **Tipo** (plegado) | «Cambiar» | Nueve chips (Casa de cultura, Museo, Foro, Galería, Escuela, Colectivo, Biblioteca, Plaza, jardín o parque, Otro); con «Otro», «¿Qué es?» opcional | Elegir uno (menos «Otro») cierra el renglón | Se pierde con el formulario | `FormularioLugar.tsx:413-443`, `lib/lugares.ts:12-22` |
| **Más** (plegado) | «Agregar» | «Descripción corta» (capa a pantalla completa), «Redes y contacto» (campo y «Añadir», enlaces reordenables con título), foto de portada, y para administración pegar imagen y «Solo yo lo veo» | – | Se pierde con el formulario | `FormularioLugar.tsx:455-479`, `SelectorEnlaces.tsx:143-249` |
| **Aviso de parecido** | Tras tocar «Publicar» si el servidor encuentra uno | «¿Es este?» con enlaces a los parecidos y «No, es otro: publicar de todos modos» | Los enlaces salen de la pantalla (pasa por la guardia) | – | `FormularioLugar.tsx:492-512` |
| ¿Salir sin publicar? | ✕ o Atrás con cambios | Igual que en 2.5 | – | – | `SalirSinPublicar.tsx` |

### 3.5 Mensajes de «falta», de error y de aviso (lugar)

| Mensaje | Condición | Dónde | Ref. |
| --- | --- | --- | --- |
| «Falta el nombre.» / «Falta dónde está.» / «Falta el nombre y dónde está.» | Nombre vacío; sin punto | Bajo el botón | `lib/formulario.ts:30-32`, `FormularioLugar.tsx:264` |
| «Falta» y borde discontinuo; «Por el nombre»; «Pin en el mapa» | Dónde vacío; Tipo sin nombre; punto sin dirección | En el renglón | `FormularioLugar.tsx:385`, `FormularioLugar.tsx:409`, `FormularioLugar.tsx:378` |
| «Buscando…», «Trayendo la ubicación…» | Búsqueda o recuperación de una sugerencia | Lista flotante | `FormularioLugar.tsx:329-332` |
| «Ya tiene ficha: {enlaces}. Si es otro con el mismo nombre, sigue.» | Hay lugares registrados cuyo nombre o dirección contienen todas las palabras (con el campo enfocado) | Lista flotante | `FormularioLugar.tsx:335-349`, `lib/buscarLugares.ts:140-146` |
| «Ya hay uno (o varios) con este nombre: {nombre} Ver» | Igual, con el campo sin foco | Bajo el campo | `FormularioLugar.tsx:314-321` |
| «No pude buscar. Intenta de nuevo.» | Falla Mapbox o falta el token | Lista flotante | `FormularioLugar.tsx:163`, `FormularioLugar.tsx:362-366` |
| «{Este teléfono} no da su ubicación. Busca la dirección o toca el mapa.» / «No se pudo leer tu ubicación. Busca la dirección o toca el mapa.» | «Estoy aquí» sin soporte / con error | Nota del renglón Dónde | `FormularioLugar.tsx:246`, `FormularioLugar.tsx:400-402` |
| «Escribe el nombre del lugar.» / «Máximo 120 caracteres.» | Nombre vacío / largo (servidor) | Bajo el nombre | `lib/lugares.ts:329-330`, `FormularioLugar.tsx:307-310` |
| «Falta la ubicación: busca la dirección o mueve el pin en el mapa.» | Sin punto válido (servidor) | Nota del renglón Dónde | `lib/lugares.ts:333-334`, `FormularioLugar.tsx:396-399` |
| «Elige qué tipo de lugar es.» | Tipo fuera de la lista (casi no se alcanza: el tipo se deduce siempre) | – | `lib/lugares.ts:331` |
| «Máximo 200 caracteres.» (dirección), «Máximo 60 caracteres.» (¿Qué es?), «Máximo 600 caracteres.» (descripción) | Servidor | Junto al campo | `lib/lugares.ts:327-335` |
| «La foto no se subió bien. Intenta de nuevo.» | Imagen que no es de nuestro Storage | En Más | `lib/lugares.ts:336` |
| «La foto pesa más de 5 MB. Elige otra.» / «No se pudo subir la foto. Intenta con otra.» / «…Intenta de nuevo.» | Foto de portada | En Más | `lib/subirFoto.ts:19-25`, `FormularioLugar.tsx:466-470` |
| «Hay un enlace demasiado largo.» / «No parece un enlace, un @perfil ni un teléfono.» | Un enlace de más de 300 / texto que no se reconoce al añadir | En Más | `lib/lugares.ts:337`, `SelectorEnlaces.tsx:57-59` |
| «¿Es este? Ya hay un lugar con ese nombre muy cerca:» + lista + «No, es otro: publicar de todos modos» | Un lugar parecido a menos de 150 m y sin confirmar | Encima del botón | `FormularioLugar.tsx:492-511`, `acciones.ts` (lugares) `52-55` |
| «No se pudo guardar el lugar. Intenta de nuevo.» | Falla el guardado | Encima del botón | `acciones.ts` (lugares) `62`, `FormularioLugar.tsx:514-518` |
| ««{nombre}» ya existe cerca de aquí. Ver ficha» | En la hoja, un lugar registrado a menos de 150 m del punto, o el tocado | Resumen de la hoja | `HojaDonde.tsx:556`, `HojaDonde.tsx:705-709` |
| ««{texto}» no tiene ficha. Toca el mapa para ubicarlo.» | En la hoja, texto sin resultados | Lista de la hoja | `HojaDonde.tsx:747-751` |

(La hoja «¿Dónde está?» comparte «Buscando…», «No pude buscar…», «No pude ubicar esa opción…», «Ubicando…» y «Moviste el pin…» con la de evento: ver 2.6.)

### 3.6 Después de publicar (lugar)

Redirige a la ficha del lugar reemplazando la alta, con `?nuevo=1` (`acciones.ts` (lugares) `64-68`). La ficha dice «**Publicado.** Ya está en Lugares.» y, a su lado, «Completar» (que lleva a editar) si la persona puede editarlo y no tiene descripción, portada ni redes; si no, «Compartir» (`lugares/[id]/page.tsx:62`, `lugares/[id]/page.tsx:82-96`). Lo mismo cuando se registra desde la hoja «Agregar lugar» de un evento: ahí no redirige, devuelve el lugar a la hoja (`acciones.ts` (lugares) `66-67`, `acciones.ts` (lugares) `100-105`).

---

## 4. ARTISTA

### 4.1 Qué ve la persona al llegar

| # | Bloque | Qué muestra | Controles a la vista | Obligatorio | Plegado | Ref. |
| --- | --- | --- | --- | --- | --- | --- |
| – | Barra | «Registrar artista» y ✕ | ✕ | – | – | `lib/armazon.ts:69` |
| 1 | Nombre | Campo con estrella «Nombre de artista o grupo»; foco automático si el alta abrió como artista | Campo | Sí | No | `FormularioArtista.tsx:178-202`, `FormularioArtista.tsx:193` |
| 2 | Qué hace | «Por el nombre» (vacío); con nombre, siempre una disciplina (Música si no hay pista) | «Cambiar» | No (se deduce) | Sí: paso 1 ocho chips; paso 2 subcategorías y «En una palabra» | `FormularioArtista.tsx:235-352`, `lib/artistas.ts:135-144` |
| 3 | Es | Solista, Grupo o Colectivo deducido (Solista por omisión) | «Cambiar» | No | Sí: tres chips | `FormularioArtista.tsx:355-385`, `lib/artistas.ts:124-129` |
| 4 | Ciudad | La que se veía en Artistas (o San Luis Potosí) | «Cambiar» | No | La hoja «Ciudad» | `FormularioArtista.tsx:388-395`, `page.tsx:76` |
| 5 | Foto | «Sin foto» con cámara | Cámara | No | – | `FormularioArtista.tsx:398-423` |
| 6 | Portada | «Sin portada» con cámara | Cámara | No | – | `FormularioArtista.tsx:426-451` |
| 7 | Soy yo / es mi grupo | «No»; interruptor | Interruptor | No (solo en el alta) | – | `FormularioArtista.tsx:454-461` |
| 8 | Más | «Redes, descripción» | «Agregar» | No | Sí: «Redes y contacto», descripción; administración suma pegar foto y portada | `FormularioArtista.tsx:464-477` |
| 9 | Publicar artista | Botón y la nota «Falta el nombre.» | Botón | – | – | `FormularioArtista.tsx:495-497`, `lib/formulario.ts:35-37` |
| – | Tira de tipos | Evento · Lugar · Artista | 3 botones | – | – | `Alta.tsx:56-64` |

**Recuento a la vista:** 9 bloques del formulario (+ barra y tira = 11); 9 controles en el formulario (nombre 1, Qué hace 1, Es 1, Ciudad 1, Foto 1, Portada 1, Soy yo 1, Más 1, Publicar 1) + 4 del armazón = 13. Plegados: Qué hace, Es, Más; abre otra pantalla: Ciudad.

### 4.2 Qué resuelve el sistema y qué pregunta aunque podría deducirlo

| Dato | Qué hace el sistema | Ref. |
| --- | --- | --- |
| Qué hace | Del nombre («teatro», «ballet», «cine», «circo», «pintura», «poesía»…); **sin pista, Música** (el renglón nunca queda en «Por el nombre» una vez escrito el nombre). Manda lo elegido a mano | `lib/artistas.ts:135-144`, `FormularioArtista.tsx:106-109` |
| Subcategoría | Al elegir disciplina, ofrece las ya usadas en ella (global, no por ciudad) para no duplicar; avisa «Ya hay N artistas con «…»» | `FormularioArtista.tsx:112-127`, `FormularioArtista.tsx:283-340` |
| Es | Por la primera palabra del nombre («Los», «Trío», «Colectivo», «Orquesta»…), si no, Solista | `lib/artistas.ts:124-129` |
| Ciudad | La del contexto (`?ciudad=` o la elegida en Artistas); se cambia en la hoja | `page.tsx:76`, `page.tsx:117` |
| Ya existe | Mientras se escribe, busca el mismo nombre **en la misma ciudad**; con uno, el botón queda con la nota «Ese nombre ya tiene ficha.» y no publica | `FormularioArtista.tsx:129-140`, `FormularioArtista.tsx:155-161`, `lib/formulario.ts:35-37` |
| Soy yo | No se deduce: queda en «No» aunque la cuenta pudiera estar ligada a otros artistas | `FormularioArtista.tsx:82`, `FormularioArtista.tsx:458` |
| Foto y portada | Se muestran como renglones en la primera vista aunque son opcionales | `FormularioArtista.tsx:398-451` |

### 4.3 Toques mínimos hasta publicar (artista)

Nombre con foco automático (se llegó con «+» desde Artistas o `?tipo=artista`); por la tira de tipos, +1 toque.

**Caso corto** (con el nombre basta):

| Paso | Qué se hace | Toques | Escrituras |
| --- | --- | --- | --- |
| 1 | Escribir el nombre | – | 1 |
| 2 | Tocar «Publicar artista» | 1 | – |
| **Total** | | **1** | **1** → **2 acciones** |

Sostén: `FormularioArtista.tsx:106-110` (disciplina y tipo deducidos), `FormularioArtista.tsx:161` (solo falla el nombre o el repetido), `lib/artistas.ts:337-338`. Con el nombre repetido en la ciudad no se puede publicar (`faltaEnArtista`).

**Caso largo** (se completa todo, subcategoría conocida y ciudad de la lista):

| Paso | Qué se hace | Toques | Escrituras | Sistema |
| --- | --- | --- | --- | --- |
| 1 | Escribir el nombre | – | 1 | – |
| 2 | Qué hace: «Cambiar» (1); chip de disciplina (1); chip de subcategoría (1, cierra el renglón) | 3 | – | – |
| 3 | Es: «Cambiar» (1); chip (1, cierra el renglón) | 2 | – | – |
| 4 | Ciudad: «Cambiar» (1); tocar una ciudad de la lista (1) | 2 | – | – |
| 5 | Foto: tocar la cámara (1); elegir en el teléfono | 1 | – | 2 |
| 6 | Portada: tocar la cámara (1); elegir en el teléfono | 1 | – | 2 |
| 7 | Soy yo / es mi grupo: interruptor (1) | 1 | – | – |
| 8 | Más: «Agregar» (1) | 1 | – | – |
| 9 | Redes: campo (1); pegar enlace (1 esc.); «Añadir» (1) | 2 | 1 | – |
| 10 | Descripción: renglón (1); escribir (1 esc.); «Listo» (1) | 2 | 1 | – |
| 11 | «Publicar artista» | 1 | – | – |
| **Total** | | **16** | **3** | **4** → **23 acciones** |

Sostén: `FormularioArtista.tsx:239-300`, `FormularioArtista.tsx:366-376`, `FormularioArtista.tsx:392`, `HojaCiudad.tsx:76-88`, `FormularioArtista.tsx:408-411`, `FormularioArtista.tsx:436-439`, `FormularioArtista.tsx:459`, `FormularioArtista.tsx:468-473`. Si la subcategoría no existe, escribirla suma 1 toque y 1 escritura (`FormularioArtista.tsx:307-313`); si la ciudad no está en la lista, buscarla suma 1 escritura (el campo de la hoja tiene foco automático, `HojaCiudad.tsx:72`). Si en el paso 2 no hay subcategorías conocidas, el renglón no se cierra solo y hace falta además «Listo» (`FormularioArtista.tsx:307-313`).

### 4.4 Hojas y pantallas secundarias del artista

| Pantalla | Cómo se abre | Controles | Atrás / ✕ | Recargar o salir | Ref. |
| --- | --- | --- | --- | --- | --- |
| **Ciudad** (hoja de abajo) | «Cambiar» del renglón Ciudad | ✕ «Cerrar»; campo «Busca la ciudad» con foco automático y ✕; sin escribir, las ciudades que ya tienen artistas con su conteo; al escribir (2 letras o más), ciudades de Mapbox de cualquier país; un toque elige y cierra | ✕, tocar fuera o Escape cierran sin cambiar | Se pierde lo no elegido | `HojaCiudad.tsx:32-119`, `FormularioArtista.tsx:499` |
| **Qué hace** (plegado, dos pasos) | «Cambiar» | Paso 1: ocho chips (Música, Teatro, Danza, Artes visuales, Letras, Cine, Artes circenses, Otro); paso 2: el chip elegido con ✕ que deshace los dos pasos, chips de subcategorías ya usadas y «Otra…», o «En una palabra» (hasta 40) con «Usar esa» ante una parecida | Elegir subcategoría cierra el renglón; el texto libre pide «Listo» | Se pierde con el formulario | `FormularioArtista.tsx:243-350`, `lib/artistas.ts:216-229` |
| **Es** (plegado) | «Cambiar» | Tres chips | Elegir cierra | – | `FormularioArtista.tsx:362-384` |
| **Más** (plegado) | «Agregar» | «Redes y contacto», «Descripción» (capa a pantalla completa, 600), y para administración pegar foto y portada | – | – | `FormularioArtista.tsx:471-476`, `CampoLargo.tsx` |
| **Lista flotante «Ya tiene ficha»** | Escribir un nombre que ya existe en la ciudad, con el campo enfocado | Aviso con enlace a la ficha; al salir del campo queda una línea «Ya tiene ficha: … Ver» | Los enlaces salen de la pantalla | – | `FormularioArtista.tsx:210-231` |
| ¿Salir sin publicar? | ✕ o Atrás con cambios | Igual que en 2.5 | – | – | `SalirSinPublicar.tsx` |

### 4.5 Mensajes de «falta», de error y de aviso (artista)

| Mensaje | Condición | Dónde | Ref. |
| --- | --- | --- | --- |
| «Falta el nombre.» / «Ese nombre ya tiene ficha.» | Nombre vacío / existe en la misma ciudad | Bajo el botón | `lib/formulario.ts:35-37`, `FormularioArtista.tsx:161` |
| «Ya tiene ficha:» {nombre} · {qué hace}. «Ábrela y, si es tuya, dilo ahí.» | Nombre repetido con el campo enfocado | Lista flotante | `FormularioArtista.tsx:222-231` |
| «Ya tiene ficha: {nombre} Ver» | Igual, sin foco | Bajo el campo | `FormularioArtista.tsx:210-217` |
| «Ya hay N artista(s) con «…». Usar esa» | Una subcategoría nueva parecida a una existente | Dentro de Qué hace | `FormularioArtista.tsx:315-340` |
| «Subiendo…», «Sin foto», «Lista», «Sin portada» | Estado de las dos imágenes | En los renglones | `FormularioArtista.tsx:406`, `FormularioArtista.tsx:434` |
| «La foto pesa más de 5 MB. Elige otra.» / «No se pudo subir la foto. Intenta con otra.» (y «portada») | Falla la subida | Nota del renglón | `lib/subirFoto.ts:19-25`, `FormularioArtista.tsx:418-422`, `FormularioArtista.tsx:446-450` |
| «Escribe el nombre de artista o grupo.» / «Máximo 80 caracteres.» | Servidor | Bajo el nombre | `lib/artistas.ts:335-336`, `FormularioArtista.tsx:203-206` |
| «Elige qué hace.» / «Elige si es solista, grupo o colectivo.» | Valores fuera de la lista (casi no se alcanzan) | Dentro de Qué hace / Es | `lib/artistas.ts:337-338`, `FormularioArtista.tsx:345-349`, `FormularioArtista.tsx:378-382` |
| «Máximo 40 caracteres.» (en una palabra), «Máximo 600 caracteres.» (descripción) | Servidor | Junto al campo | `lib/artistas.ts:339-340` |
| «La foto no se subió bien. Intenta de nuevo.» / «La portada no se subió bien. Intenta de nuevo.» | Imagen que no es de nuestro Storage | Nota del renglón | `lib/artistas.ts:341-342` |
| «Hay un enlace demasiado largo.» / «No parece un enlace, un @perfil ni un teléfono.» | Enlace de más de 300 / texto no reconocido | En Más | `lib/artistas.ts:343`, `SelectorEnlaces.tsx:57-59` |
| «Ya hay una ficha con ese nombre.» | Choque de nombre en la base (otra pestaña, otra persona al mismo tiempo) | Encima del botón (si no hay `repetido`) | `acciones.ts` (artistas) `64`, `FormularioArtista.tsx:490-494` |
| «No se pudo guardar. Intenta de nuevo.» | Falla el guardado | Encima del botón | `acciones.ts` (artistas) `65` |
| «Buscando…», «No se pudo buscar. Revisa tu conexión e intenta de nuevo.», «No encontramos «X». Prueba con el país, como «San José, Costa Rica».» | Hoja Ciudad | En la hoja | `HojaCiudad.tsx:90-104` |

### 4.6 Después de publicar (artista)

Redirige a la ficha del artista reemplazando la alta, con `?nuevo=1`; si se marcó «Soy yo / es mi grupo», la cuenta queda ligada a la ficha (`acciones.ts` (artistas) `67-71`). La ficha dice «**Publicado.** Ya está en Artistas.» y, a su lado, «Completar» (a editar) si la ficha quedó solo con el nombre (disciplina «por completar») o sin descripción, foto, portada ni redes; si no, «Compartir» (`artistas/[id]/page.tsx:283`, `artistas/[id]/page.tsx:359-373`).

---

## 5. Sección común: lo que ofrece cada tipo al llegar con una entrada especial

| Entrada | Qué trae resuelto | Ref. |
| --- | --- | --- |
| `?desde=` (duplicar un evento) | Título, descripción, imagen, precio, enlace, lugar o sitio y artistas copiados; fecha vacía (se vuelve a sugerir); sin tarjeta de cartel, sin borrador, sin tira de tipos; subtítulo «Mismo evento, nueva fecha. Cambia lo que haga falta.»; título de la barra «Duplicar evento» | `page.tsx:48-52`, `FormularioEvento.tsx:551`, `Alta.tsx:52` |
| `?lugar=` (desde la ficha de un lugar) | Dónde resuelto con ese lugar; sin tira | `page.tsx:43`, `FormularioEvento.tsx:137` |
| `?artista=` (desde la ficha de un artista) | Quién resuelto con ese artista (y el cartel no lo pisa) | `page.tsx:53-56`, `gestosFlyer.ts:31` |
| `?nombre=` | Nombre del lugar o del artista ya escrito (hasta 80); en el lugar, el tipo ya deducido | `page.tsx:74`, `FormularioLugar.tsx:84-85`, `FormularioArtista.tsx:77` |
| `?lat=&lng=` | Lugar ya ubicado; su dirección se deduce sola | `page.tsx:109`, `FormularioLugar.tsx:231-233` |
| `?ciudad=` | Ciudad de contexto de la búsqueda de dirección; ciudad inicial del artista | `page.tsx:100`, `page.tsx:114`, `page.tsx:117` |

---

## 6. Resumen: lo que hay hoy, medido

**A la vista al llegar (390×844, alta nueva)**

| Formulario | Bloques del formulario | Controles del formulario | Controles del armazón (✕ + tira) | Total de controles | Obligatorios para publicar | Plegados o en otra pantalla |
| --- | --- | --- | --- | --- | --- | --- |
| Evento (con cartel) | 8 | 9 | 4 | 13 | Nombre y Dónde (Cuándo y Cuánto ya vienen resueltos) | 4 plegados + 1 hoja |
| Evento (sin cartel) | 7 | 8 | 4 | 12 | igual | igual |
| Lugar | 5 | 6 | 4 | 10 | Nombre y Dónde | 2 plegados + 1 hoja |
| Artista | 9 | 9 | 4 | 13 | Nombre (y que no esté repetido) | 3 plegados + 1 hoja |

(El doc 51 cuenta «nueve bloques y unos doce controles» para el evento: suma la tira de tipos como bloque; aquí la tira va aparte, en el armazón.)

**Toques hasta publicar** (toques de la app / escrituras / sistema → acciones)

| Caso | Toques | Escrituras | Sistema | Acciones |
| --- | --- | --- | --- | --- |
| **Evento (a)** cartel legible que resuelve todo | 2 | 0 | 2 | 4 |
| **Evento (b-1)** cartel con nombre y fecha; lugar del directorio; gratis | 6 | 1 | 2 | 9 |
| **Evento (b-2)** como b-1 pero con costo | 8 | 2 | 2 | 12 |
| **Evento (b-3)** como b-1 pero el sitio no está en el directorio (dirección) | 7 | 2 | 2 | 11 |
| **Evento (c)** sin cartel, lugar del directorio, gratis, fecha sugerida | 6 | 2 | 0 | 8 |
| **Evento (c)** con otra fecha | 10 | 2 | 0 | 12 |
| **Evento (d-1)** sin cartel, sitio nuevo escrito como dirección | 7 | 3 | 0 | 10 |
| **Evento (d-2)** sin cartel, punto de interés de Mapbox | 6 | 2 | 0 | 8 |
| **Evento (d-3)** sin cartel, «Estoy aquí» | 5 | 2 | 1 (primera vez) | 7 u 8 |
| **Evento (d-4)** sin cartel, se agrega el lugar al directorio | 9 | 3 | 0 | 12 |
| **Lugar, caso corto A** (sugerencia de Mapbox) | 2 | 1 | 0 | 3 |
| **Lugar, caso corto B** («Estoy aquí») | 2 | 1 | 1 (primera vez) | 3 o 4 |
| **Lugar, caso corto C** (punto ya puesto desde el mapa) | 1 | 1 | 0 | 2 |
| **Lugar, caso largo** | 13 | 4 | 2 | 19 |
| **Artista, caso corto** | 1 | 1 | 0 | 2 |
| **Artista, caso largo** | 16 | 3 | 4 | 23 |

---

## 7. Lo que el inventario deja a la vista (sin juicio, para medir contra el prototipo)

Hechos del código que afectan a la comparación; no son propuestas.

1. **Con cartel no hay pantalla de confirmación**: la «revisión» es el mismo formulario ya relleno; dos toques publican si todo se leyó (2.4, caso a).
2. **Tres datos se publican con un valor que nadie leyó ni confirmó**: la fecha sugerida (si el cartel no trae fecha, la tarjeta lo dice pero el renglón no dice «Falta»), «Gratis» (si el cartel no trae precio ni dice que es gratis) y, en un sitio leído del cartel sin dirección, el nombre del sitio sin pin con la ciudad San Luis Potosí (2.3).
3. **El fin que cae después de medianoche** se lee del cartel con el mismo día y el servidor lo rechaza al publicar (2.3, 2.6).
4. **Dónde se pide siempre en una hoja aparte**, que abre vacía (sin usar el nombre del evento) y exige un nombre del sitio si el punto es una dirección (2.2).
5. **El «borrador» guardado en el teléfono ya no vuelve nunca**: recargar pierde todo (sección 1).
6. **La guardia de salida protege solo el botón Atrás, la ✕ y el gesto de la app instalada**, no el botón de atrás del navegador (sección 1; sin comprobar corriendo).
7. **Foto y cartel se suben al elegirlos**, aunque luego se abandone la pantalla; y cada lectura de cartel gasta de las 20 mensuales aunque falle.
8. **Los tres formularios siguen montados** al cambiar de tipo: lo escrito en uno cuenta para la guardia de salida de los otros (`Alta.tsx:36-37`, `SalirSinPublicar.tsx:14-20`).

## 8. Sin comprobar

- Todo el documento sale de leer el código en `20898529`; no se ejecutó la app ni se midió en un teléfono. Ninguna medida de alto de pantalla se tomó: si «Publicar» queda a la vista sin desplazarse con el teclado abierto o tras leer un cartel, no se sabe.
- El selector de fotos del teléfono y el permiso de ubicación son del sistema: el «2» de sistema para elegir una foto y el «1» del permiso son estimaciones.
- Cuánto tarda la lectura del cartel («Tarda unos segundos» es el texto de la app, no una medida) y qué tan bien lee carteles reales: no se corrió ninguna lectura.
- Que el botón de atrás o el gesto de Safari no pregunte (sección 1): se deduce de que `pedirSalida` solo lo llaman `Atras.tsx` y el volver registrado, y de que no hay `beforeunload`.
- Si recargar una ficha recién publicada vuelve a mostrar la franja «Publicado.» (depende de que `?nuevo=1` siga en la dirección).
- Cuáles de los errores de servidor sobre Dónde se alcanzan alguna vez desde la pantalla (el botón ya detiene casi todos los casos).
- Si la tarjeta del cartel aparece en producción: depende de la llave de Anthropic del servidor (`lib/cartel.ts:10-12`), que no se leyó.
