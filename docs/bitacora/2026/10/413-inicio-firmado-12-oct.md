# 413 · Inicio firmado el 12 de octubre (OL-382)

**Fecha:** 2026-10-12. **Rama:** `inicio-firmado-12-oct`, base `origin/main` (`152ea11a`). **Operador:** Claude (agente del gestor VI). **Sin migración.**
**Estado:** lista para la revisión del gestor y su PR. Falta el «publica» del founder.

## Lo que se lleva a la app

Lo que firmó el founder el 12 de octubre a las 10:40 en el prototipo `docs/rediseno/prototipos/inicio-propuestas.html` (rama `prototipo-inicio-propuestas`, bitácora 408), preajuste **«Firmada»**: «ok te firmo Personalizada · N foto grande · T1 completo · D1 · D2 XL · T2 · I1 arriba izq. · F1 · Y1 · X1 como pasado · X2». De eso, esta pieza lleva lo de Inicio: **N, T1, T2, D1, D2, I1 y F1**. Y1 («Ya fui» en la ficha de la expo) va con el historial; X1 y X2 (lo pasado del festival) son de OL-383; D3 no se firmó. Las medidas son las del prototipo a 390 de ancho.

1. **N · Foto grande** (founder: «probemos un tamaño más grande para generar más ancho y quepa más texto»). En «Lugares de la semana» y «Artistas de la semana» la foto redonda pasa de 64 a **88 px** (`--avatar-carril`) y la columna de 76 a **108** (88 + 20, con 8 entre columnas). El nombre va a `--letra-sm` (15 px), centrado, en **dos líneas** repartidas parejas (`text-wrap: balance`) y, si no cabe, cortado en palabra entera con «…», igual que el título de la tarjeta. La novedad («Nuevo video», «Nuevo audio») sigue debajo, a 8 px. El nombre entero sigue en el nombre del enlace. «Artistas destacadxs» no cambia: es la tarjeta mediana, no el avatar.
2. **T1 · Título completo tal cual** (founder: «¿de dónde sacas este título corto? … si no lo pone el usuario dejaría el que tiene original … dejamos como está el título por ahora aunque se corte»). Todas las tarjetas de evento de Inicio enseñan el título que escribió quien publicó, sin `tituloCorto` ni `comoOracion`: bajo el cartel y en la zona del título de la portada del sistema. `tarjetaEvento` sigue calculando `corto` (no se quita, por si otro lado lo usa), pero la tarjeta de Inicio ya no lo enseña. `nombreDeTarjeta` ya llevaba el título completo. Las historias (`Historias.tsx`) no usan el título corto: no se tocaron.
3. **T2 · Tres líneas.** El título de la tarjeta (bajo el cartel y dentro de la portada del sistema) ocupa hasta **tres** líneas antes de cortarse en palabra con «…» (antes, dos). También el nombre de un artista en «Artistas destacadxs», que es el mismo título. En la portada del sistema la zona del título crece hacia arriba y la figura se vuelve a medir (`PortadaSistema`, `useLayoutEffect` + `ResizeObserver`): el sello y la zona van en filas distintas de la rejilla, así que no se enciman (captura 04: KOWAIFEST en tres líneas, la figura más chica).
4. **D1 · Destacados en la primera línea** (founder: «siempre en la primera línea»). El carril estelar («Destacados» o «Seleccionados para ti») va justo debajo de la fila «Ahora» y antes de «Tus planes» (`Inicio.tsx`). Cada carril conserva su `<Suspense>` independiente; el esqueleto del estelar es el XL.
5. **D2 · XL** (founder: «como el de Instagram»). Solo el carril estelar: tarjeta de **248 px** con cartel 4:5 (**248×310**), se ve una y media; título a `--letra-xl` (19 px) y las líneas de abajo a `--letra-md` (17 px). En la portada del sistema, la zona del título con 16 de relleno y el título a 24 px (`--letra-portada-xl`, el `1.5rem` del prototipo). Nuevo tamaño `xl` en `CarrilEventosCliente`, `Destacados`, `TarjetaEvento`, `PortadaSistema` y `CarrilEsqueleto`, junto a `grande` y `mediana`. Los demás carriles no cambian.
6. **I1 · Icono arriba a la izquierda** (founder: «solo con el icono arriba a la derecha en vez del chip» y luego «prueba arriba a la izquierda»). El chip «Te interesa» desaparece. Si la persona marcó «Me interesa», un círculo de **36 px** (`--marca-interes`) con fondo `--vidrio` y el marcador relleno en `--primario` (el `IconoMarcador` de la app, 20 px) va arriba a la izquierda de la portada, a 8 del borde; el sello de fecha se queda arriba a la derecha. En la portada del sistema va en la celda del símbolo, y las figuras dejan libre su esquina igual que la del sello (como el prototipo: la esquina libre es la unión de las dos). Sin figura (P7, un evento sin imagen), el símbolo SN se corre a la derecha del icono (36 + 8 = 44 px). El chip «N van» sigue igual, abajo a la izquierda, y ahora también sale en lo que te interesa (antes, «Te interesa» lo tapaba). El nombre del enlace sigue diciendo «Te interesa» (y, si van, cuántos).
7. **F1 · Primero la fecha, luego el lugar** (founder: «bajo la tarjeta primero la fecha y luego el lugar»). Bajo todas las tarjetas de evento de Inicio, la línea de cuándo (violeta) arriba y el lugar (gris) debajo, en la rejilla y en el orden del código. En la tarjeta de artista (E9), la fecha antes del género.

## Medidas finales (390 de ancho)

| Pieza | Antes | Ahora |
|---|---|---|
| Carril estelar | grande, 165×206 | XL, 248×310 (285,6×357 desde 1048: crece con la grande) |
| Título bajo el cartel | 17 px (grande), 2 líneas | 19 px en la XL, 17 en la grande, 15 en la mediana; 3 líneas |
| Líneas de abajo | lugar y luego cuándo, 15 px | cuándo y luego lugar; 17 px en la XL |
| Título en la portada del sistema | 19 px, 2 líneas, zona de 12 | 3 líneas; en la XL, 24 px y zona de 16 |
| «Te interesa» | chip abajo a la izquierda | marcador de 36 arriba a la izquierda (8 px); el chip queda para «N van» |
| Avatar | 64 en columna de 76, nombre a 14 en 1 línea | 88 en columna de 108, nombre a 15 en 2 líneas |

Tokens nuevos en `globals.css`: `--tarjeta-xl` (`--tarjeta-grande` × 248/165) y `--tarjeta-xl-foto`, `--marca-interes` (36 px) y `--letra-portada-xl` (24 px); `--avatar-carril` pasa de 64 a 88. `tamanoImagenCarril` gana `xl` («(min-width: 1048px) 286px, 248px») y el avatar pide 88 px.

**`npm run medir`:** Inicio con sesión (`s01-inicio-sesion`) pasa de 364 a **368 nodos** (366 → 370 desde 820): el marcador es un `span` con su `svg` y su `path`, y donde antes iba el chip «Te interesa» ahora va también el de «N van». Presupuesto ajustado a mano en `medidas.aceptadas.json`. Inicio sin sesión no cambia (363). Profundidad igual (11). Con `--letra=2`, sin novedades.

## Código

- `src/components/inicio/TarjetaEvento.tsx` + `.module.css`: título tal cual, `interesa` y el componente `Interesa` (el marcador), el tamaño `xl`, `cuando` antes que `lugar`, tres líneas. El corte en palabra sale a `src/components/inicio/useTextoEnPalabra.ts` (el mismo de antes, ahora compartido con el avatar).
- `src/components/inicio/PortadaSistema.tsx` + `.module.css`: el marcador en la celda del símbolo (`interesa`, como el sello), las esquinas libres de la figura con el marcador, el símbolo corrido, `--zona-lado` y la XL, tres líneas.
- `src/components/inicio/TarjetaAvatar.tsx` + `.module.css`: cliente, nombre en dos líneas cortado en palabra.
- `src/components/Destacados.tsx` + `.module.css`, `CarrilEsqueleto.tsx` + `.module.css`, `inicio/CarrilEventosCliente.tsx`, `inicio/CarrilAgenda.tsx` (el estelar en `xl`), `Inicio.tsx` (el orden).
- `src/lib/tarjetaInicio.ts`: `chipDeTarjeta(t)` ya solo dice cuántos van; `nombreDeTarjeta` dice «Te interesa» por su cuenta. `src/lib/imagenOptima.ts`: `xl` y el avatar de 88.

## Verificación

- `npm run lint` (0 errores; el aviso de siempre en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (3578), `npm run inventario` (sin novedades), `npm run build` y `npm run medir` (sin novedades tras el presupuesto de arriba).
- **Componentes:** `Destacados.componentes.test.mjs` (26) y `Inicio.componentes.test.mjs` (9) en verde con Arial (la CI), con la letra de la app (`FUENTE=.next/static/media/74effe…woff2`) y con `TZ=UTC`. Nuevas o cambiadas: el carril XL (248×310, 285,6×357 desde 1048; título a 19 y líneas a 17; en la portada del sistema, título a 24 y zona de 16), el marcador (36 px a 8 del borde arriba a la izquierda, vidrio, marcador violeta de 20, el sello sigue a la derecha, el centro es el enlace; en cartel, portada del sistema y P7, en la grande, la mediana y la XL; sin «Me interesa», ninguno), sin chip «Te interesa» y con «3 van», el título completo tal cual (Kopk Poj entero, «DESIERTO: Observación y Espacio» con sus mayúsculas), tres líneas como mucho cortadas en palabra, cuándo antes que el lugar (eventos, portadas del sistema y artistas), las figuras que no pisan el marcador, el SN corrido a 44, el orden de carriles (Destacados primero, antes de «Tus planes»), avatares de 88 en columnas de 108 con el nombre a 15 en dos líneas («Casa de Cultura del Barrio de San…» con la letra de la app, como la captura 06b del prototipo) y los esqueletos (el XL, y el avatar con el nombre en dos líneas). Unitarias: `chipDeTarjeta`, `nombreDeTarjeta` con «Te interesa. 3 van», `tamanoImagenCarril`.
- `npm run test:componentes` completo: 591 de 591 en verde (Chromium de Playwright, el de la CI).

## Capturas (`docs/rediseno/capturas-413/`)

La app compilada contra el respaldo local (`scripts/ops/auditoria-ui/respaldo-local`, datos inventados) con el reloj fijo el lun 12 de oct a las 10:00 y la sesión inventada de Ana, en el Chrome de la Mac con playwright-core a 390×844 (2×). Sin `.env.local`: las variables del respaldo se pasan al compilar y al arrancar. **Ni una lectura a producción:** los carteles y fotos se contestan en el navegador (`/_next/image` interceptado) con los archivos del prototipo firmado (la carpeta `inicio-propuestas/` de su rama), elegidos por el nombre del evento o del lugar; por eso algunas fotos no corresponden a su tarjeta (Leonora lleva el cartel de «Una vez más»). Guion en el scratchpad de la sesión. Abiertas una por una y comparadas con las 03, 06b, 25 y 24 de `capturas-408`.

- `01-arriba-ahora-destacados-xl.png` — la fila «Ahora» y, justo debajo, «Seleccionados para ti» en XL (248×310): se ve una y media; «Master Class - 9° Festival de Cine UASLP» entero en dos líneas a 19 px, luego «mar 20 de oct · 12:00» en violeta y el lugar en gris. Como la 03 del prototipo.
- `02-tus-planes-van-y-portada-con-marcador.png` — «Tus planes»: la charla con «1 va» (Voy: sin marcador) y el título entero en tres líneas; el taller de linóleo (portada del sistema) con el marcador arriba a la izquierda y el sello «oct 14» a la derecha; la figura se queda debajo de los dos.
- `03-tus-planes-2-van-y-cartel-con-marcador.png` — «LXS COLOCAOS: La última fogueada» con «2 van» abajo a la izquierda (Vas: sin marcador) y «Leonora in the morning light» (Me interesa) con el marcador arriba a la izquierda sobre el cartel y el sello «oct 21» a la derecha. Como la 25 del prototipo.
- `04-festivales-portada-tres-lineas.png` — «Festivales y expos»: «KOWAIFEST: festival de cultura japonesa» en tres líneas dentro de su portada del sistema, que sigue en 4:5; la figura se encoge y no toca el sello ni la zona. Como la 24 del prototipo.
- `05-lugares-de-la-semana-dos-lineas.png` y `06-lugares-de-la-semana-al-final.png` — avatares de 88 en columnas de 108: «MUNI Museo Universitario…», «Casa de Cultura del Barrio de San…», «Centro Cultural Universitario…» en dos líneas cortadas en palabra; «ACHE Galería» y «Teatro de la Paz» enteros. Como la 06b del prototipo.
- `07-artistas-destacadxs-y-de-la-semana.png` — «Artistas destacadxs» sin cambio de tamaño, con la fecha antes del género («hoy · 18:00» y luego «Música académica y cl…»); «Artistas de la semana» con los avatares de 88 y «Nuevo audio» debajo del nombre.

## Por confirmar con el founder

1. **La XL desde 1048 px crece con la grande** (285,6×357; la grande pasa de 165 a 190). El prototipo solo midió el teléfono. Si en tableta y escritorio la quiere fija en 248, es un token.
2. **El chip «N van» ahora también sale en lo que te interesa.** Antes, «Te interesa» lo tapaba (un solo chip); con el marcador arriba ya no compiten, así que la tarjeta dice las dos cosas, como el prototipo («“3 van” sigue como chip»).
3. **Con el título en tres líneas, una portada del sistema grande con chip, ceja y título largo puede pasar de 4:5** (crece unos px, la regla firmada de OL-375: nunca corta el título). Con la letra de la app pasa poco (Bricolage es angosta); con Arial, en las pruebas, el taller con su chip y su ceja crece 6 px. La XL cabe siempre.
4. **El esqueleto del avatar** reserva dos líneas para el nombre (la mayoría de los nombres de lugares las ocupa a 108); uno corto («MUNI») deja una línea de aire debajo mientras carga.

## Lo que no entra aquí

D3 (solo eventos en Destacados) no se firmó. Y1, X1 y X2 son de otras piezas (OL-383 toca la ficha del festival; esta pieza no toca `src/app/eventos/[id]/page.tsx`). `tituloCorto` y `comoOracion` siguen en la librería con sus pruebas: ya no los usa Inicio.
