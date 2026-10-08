# 375 · «Festivales y exposiciones» trae todos los festivales; un festival sin cartel usa el de su próximo acto

**Pieza:** OL-346. **Rama:** `festivales-todos-y-portada`, desde `origin/main` (`3eb8c648`). **Fecha:** 2026-10-08. **Operador:** Claude (agente del gestor IV). **Sin migración:** todo se deriva al leer.
**Manda:** lo que vio el founder en su iPhone el 2026-10-08: «La línea de festivales no los tiene todos. En CINEMA no tiene cartel y el título se subió a la card; deberíamos usar un cartel del próximo evento.» Antecedentes: bitácoras [371](371-carril-festivales.md) (OL-342, el carril) y [368](368-festival-sedes.md) (OL-339, las sedes derivadas de los actos: el patrón que se imita aquí).
**Estado:** hecho y probado con lógica pura, componentes (Chrome) y la app compilada contra una copia del respaldo local (390×844); falta el iPhone del founder.

## Diagnóstico: qué faltaba y por qué

Leído en producción (solo lectura, API pública con la llave anónima) el 2026-10-08 a las 04:55 UTC: nueve festivales visibles. Con las reglas de OL-342, a la hora en que miró el founder (mañana del 8, San Luis Potosí), el carril solo podía traer **Xantolo** y **Electric Universe Festival**. Los demás:

| Festival | Por qué no salía | Regla |
|---|---|---|
| 9° Festival de Cine UASLP | Es el primero de la tira de destacados: ya había salido en «Destacados» | `vistos` |
| CINEMA: XV Festival de Cine México-Alemania | Tiene un acto el 14 de oct (20:00): salió en «Esta semana» como su marco | `vistos` |
| Fotovision 31 | Acto el 8 de oct: «Esta semana» | `vistos` |
| Ciclo Fellini | Acto el 14 de oct: «Esta semana» | `vistos` |
| Verbena, ritmo y Sabor | Actos el 10 y 11 de oct: «Esta semana» | `vistos` |
| KOWAIFEST | Sin actos publicados | `festivalesVigentes` (`programa.registrados === 0`, decisión 4 de la bitácora 371) |
| Festival del Libro Independencia 4ta. Edición | Su ciudad es **Dolores Hidalgo**: la agenda de Inicio es de la ciudad elegida (`cargarAgenda` filtra por ciudad) | ciudad (no cambia aquí; ver decisión 4) |

Y CINEMA «sin cartel»: el festival no tiene `imagen` y su lugar (Cinema 7B) no tiene portada; la tarjeta caía al caso sin foto. Sus 11 actos sí tienen cartel. Hoy su portada derivada sería la de «Chatbot Challenge» (15 de oct, 02:00 UTC), su próximo acto. Lo mismo el 9° Festival de Cine UASLP (14 actos con cartel; hasta hoy mostraba la portada de su lugar, el CC200) y Verbena (2 actos con cartel). Xantolo no tiene ningún cartel en sus actos: sigue con la portada de su lugar.

**«El título se subió a la card».** No es un defecto de maquetación: es la tarjeta sin foto firmada en el doc 50 (H-03, P10): sin foto no hay bloque de imagen, el nombre va grande sobre el fondo suave, en el sitio de la foto, con el rótulo dentro y los datos debajo (captura 02, Xantolo). No se encima nada ni se corta. Con la portada derivada, CINEMA ya no cae en ese caso. **No lo cambié**; queda como decisión 3.

## Qué cambió

**Parte 1 · todos los festivales.**
- `lib/agendaPorClase.ts` · `festivalesVigentes`: todos los marcos que no han pasado; ya no deja fuera al que no tiene actos.
- `lib/inicio.ts` · `carrilFestivales`: a los festivales no se les descuenta `vistos` (este carril es su sitio: salen aunque ya estén en «Destacados», «Seleccionados para ti», «Tus planes» o «Esta semana»); a las exposiciones sí, como antes. Lo que sale aquí sigue quedando visto para «Nuevos eventos», con los actos de sus marcos. El orden por cercanía y el tope (20) no cambian.
- `lib/destacados.ts` · `notaDeClase`: un festival que se sabe sin actos dice **«Programa por confirmar»** (`PROGRAMA_POR_CONFIRMAR`); si no se pudo contar, nada (como antes). La tarjeta: «ACHE Galería · Programa por confirmar» (lo capturado es lo único que dice dónde, como en su ficha); sin sitio capturado, solo «Programa por confirmar» (no dos veces «por confirmar»). El renglón de la agenda lo dice tras el cuándo, por la misma `notaDeClase`.
- Ficha del festival sin actos: la línea bajo los números dice «sáb 17 de oct · Programa por confirmar» (antes «Programa registrado: 0 actividades»); lo mismo el texto de compartir, que usa esa línea.

**Parte 2 · portada derivada del próximo acto.** Resuelta en un sitio y leída en todos:
- `lib/sedesFestival.ts` · `portadaDeFestival(actos, ahora)`: el cartel del primer acto con cartel que todavía no empieza; si todos empezaron, el del último; null si ninguno tiene. Puro, junto a `sedesDeFestival`; `ActoConSitio` gana `imagen`.
- `lib/cargarSedes.ts`: `cargarActosDeMarcos` ya traía los actos visibles de los festivales en una consulta; ahora pide también su `imagen` (sin consulta nueva). `conSedes` pasa a `conLoDeSusActos`: pone `sedes` y, sin imagen propia, `portadaActo`.
- `lib/eventos.ts` · `EventoResumen.portadaActo` y **`fotoDeEvento`** (imagen propia → cartel del próximo acto → portada del lugar → null). La usan `tarjetaEvento` (todos los carriles de Inicio y Buscar), `RenglonEvento` (agenda, fichas de lugar y artista, Tus planes), la cabecera de la ficha y `og:image`/`twitter:image` al compartir.
- Quién la deriva: `cargarAgenda` (agenda e Inicio, de la misma lectura que el programa y las sedes), Buscar y sus recientes (`conLoDeSusActos`), «Tus planes»/perfil (`conLoDeSusActos`), la ficha (de los actos que ya carga, los publicados) y `generateMetadata` (una lectura de actos para sedes y portada, en vez de la de solo sedes).
- Sin ningún acto con cartel, todo sigue como hoy: la portada del lugar, y si no, la tarjeta sin foto (H-03) o el símbolo SN donde ya se usa.

## Decisiones del operador (por confirmar con el founder)

1. **El cartel del acto va antes que la portada del lugar.** Un festival sin imagen y con lugar con portada (el 9° Festival de Cine UASLP y su CC200) ahora muestra el cartel de su próximo acto: dice más del festival que la foto del edificio. Si prefiere la foto del lugar cuando la hay, es cambiar el orden en `fotoDeEvento`.
2. **«Próximo» = el primero que todavía no empieza.** Un acto que empezó hace una hora ya cede su cartel al siguiente; si todos empezaron, se queda el del último.
3. **La tarjeta sin foto (H-03) no cambia.** Es lo que el founder vio como «el título se subió a la card». Con la portada derivada casi ningún festival cae ahí (en producción, ninguno: Xantolo toma la portada de su lugar). Si quiere otra cosa para lo que no tiene ninguna imagen (p. ej. la imagen del símbolo SN con el título debajo, como antes de H-03), es una pieza aparte que toca todos los carriles.
4. **Otras ciudades.** «Festival del Libro Independencia» es de Dolores Hidalgo y sale en el Inicio de esa ciudad, no en el de San Luis Potosí: la agenda de Inicio es de la ciudad elegida. No lo cambié (es la regla de todo Inicio, no de este carril).
5. **Un festival puede salir dos veces en Inicio** (en «Esta semana» como su marco, «3 actividades esta semana», y aquí con su programa entero), como pidió el encargo (captura 05).
6. El JSON-LD del festival sigue con la imagen propia (no la del acto): Google pide la imagen del evento mismo.

## Pruebas

- `npm run lint` (0 errores; el aviso de siempre en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (**185 archivos, 3363 pruebas**, en verde), `npm run inventario` (sin novedades) y `npm run medir` (**36 pantallas × 4 anchos, sin novedades**: en el respaldo del repo el festival sigue oculto).
- Componentes (Playwright, Chrome de la Mac): `Inicio`, `Destacados` y `AgendaPorClase`, 33 de 33.
- Nuevas o ajustadas:
  - `lib/agendaPorClase.test.ts`: el festival con actos en la semana sale en «Esta semana» **y** en el carril, con su programa entero; uno destacado o en «Tus planes» también sale, una exposición destacada no; orden con el festival sin actos en su sitio por cercanía; `festivalesVigentes` con el que no tiene actos; «Programa por confirmar» en la nota y en la tarjeta (con y sin sitio capturado); festival ya visto sale igual, exposición ya vista no, y lo que sale queda visto.
  - `lib/sedesFestival.test.ts`: `portadaDeFestival` (el próximo con cartel aunque lleguen desordenados y salte uno sin cartel; todos pasados → el último; ninguno o sin actos → null) y `fotoDeEvento` (propia → acto → lugar → null), con la tarjeta de un festival sin imagen.
  - `lib/cargarAgenda.test.ts`: la portada sale de la misma lectura que el programa; un festival con imagen propia no la lleva; sin carteles en sus actos, tampoco.

## Capturas (`docs/rediseno/capturas-375/`, 390×844 a 2×)

App compilada (`next build && next start`) contra una copia del respaldo local en el scratchpad, con «Ecos de papel» a la vista y tres festivales como los de producción: «9° Festival de Cine UASLP» (sin imagen propia, en curso, tres actos con cartel: el de la apertura ya pasó), «KOWAIFEST» (con su cartel, sin actos, sitio capturado ACHE Galería) y «Xantolo ¡Se vive en tu ciudad!» (sin imagen y sus dos actos sin cartel, sin lugar del directorio). Chrome de la Mac, sin errores de página (solo el script de Vercel, que no existe en local); `scrollWidth` 390. Cada una abierta y mirada:

- `01-inicio-festivales-portada-derivada.png`: «Festivales y exposiciones»: el **9° Festival de Cine UASLP con el cartel de «El diablo fuma»** (su próximo acto, no el de la apertura que ya pasó) y el rótulo «Festival», «Del 6 al 9 de oct», «Centro Cultural Universitario Bicente…»; asoma «Ecos de papel» con «Exposición».
- `02-carril-sin-actos-y-sin-cartel.png`: el carril deslizado: **KOWAIFEST** con su cartel, «sáb 17 de oct», **«ACHE Galería · Programa por confirmar»**; asoma **Xantolo**, sin ninguna imagen: la tarjeta sin foto de H-03 (el nombre grande en el fondo suave, el rótulo dentro, «vie 23 de oct · Plaza de Fundadores · 2 a…» debajo).
- `05-esta-semana-el-mismo-festival.png`: arriba, «Esta semana» abre con el mismo 9° Festival de Cine UASLP (su marco, con el mismo cartel derivado); debajo, el carril de festivales lo vuelve a traer (deslizado en esta captura hasta KOWAIFEST).
- `03-ficha-festival-portada-derivada.png`: la ficha del festival: cabecera con el cartel de «El diablo fuma»; «Actos 3 · Gratis · Sedes 1»; «Del 6 al 9 de oct · Programa registrado: 3 actividades»; el programa con la apertura (mar 6 de oct) y «El diablo fuma» (mañana), cada uno con su cartel. `og:image` de la página = el mismo cartel.
- `04-ficha-festival-sin-actos.png`: la ficha de KOWAIFEST: su cartel propio, «Actos 0», **«sáb 17 de oct · Programa por confirmar»**, «Todavía no hay actividades publicadas» y «Dónde» con ACHE Galería (el mapa sale vacío en local: sin llave de Mapbox).

## Qué falta

- Probarlo en el iPhone del founder (Safari) con la vista previa de la rama: CINEMA con el cartel de su próximo acto y KOWAIFEST con «Programa por confirmar» en el carril.
- Las seis decisiones de arriba, por confirmar.
