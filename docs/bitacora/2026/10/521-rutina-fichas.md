# 521 · OL-489 · Rutina semanal «Completar fichas»: foto, portada, descripción e Instagram de artistas y lugares con fecha próxima

**Fecha:** 2026-10-29. **Rama:** `rutina-fichas` (desde `origin/main` `a7c2483e`). **Quién:** operador del Gestor de cambios VII (agente en
árbol aislado, sin subagentes). **Migración:** `20261029250000_rutina_fichas.sql` (solo añade). **Variables de entorno:** ninguna nueva (usa
`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `META_APP_SECRET` y el token de «Conectar Instagram» que ya existen).
**Estado:** lista para la revisión del gestor; la primera corrida real es del gestor (guion abajo). Nada se probó contra producción ni contra las
API reales de Anthropic o Meta.

## El pedido

Founder (2026-10-29): «cada semana desde aquí podemos correr rutina para buscar completar info de artistas o lugares que falten». La semana de
Instagram (OL-479/488) solo publica fichas con material (`instagram_candidatos`: foto, portada, descripción de 120 caracteres o más y, en un
artista, Instagram); hoy, de 52 artistas con fecha en 21 días, 31 tienen foto y portada; de 105 lugares con fecha, 25 tienen portada. La rutina
busca lo que falta y lo deja como **propuesta**; «aprueba tú» (2026-10-28) = el gestor acepta, no el founder en la pantalla.

## Qué cambió

**La migración** (`supabase/migrations/20261029250000_rutina_fichas.sql`): `rutinas_corridas.tipo` admite `fichas`; `propuestas.tipo` admite
`ficha`; columna nueva `propuestas.campo` (`foto` · `portada` · `descripcion` · `instagram`), obligatoria en una `ficha` y nula en los demás
tipos (`propuestas_campo_de_ficha`); índice parcial por `datos->>'ficha_id'` y campo. `aceptar_propuesta` no cambia: una `ficha`, como un
cartel, se marca aceptada sin crear ficha y el servidor la liga (`ficha_id`). Sin `cron.schedule` nuevo.

**La rutina** (`src/lib/rutinas/fichas.ts`, en el motor de OL-428 con el paso largo de 120 s). Parámetros: ciudad, `horizonte_dias` (21),
`max_fichas` (20), tope (0,50 USD). El primer paso, gratis, junta los artistas (por `eventos_artistas`) y lugares (por `eventos.lugar_id`)
visibles de la ciudad con un evento visible entre ahora y el horizonte, y les mira lo **vacío**: foto (solo artistas), portada, descripción e
Instagram en `redes`. Ordena por la fecha más cercana; más de 20 esperan a la siguiente (`descartados.de_mas`). Cada paso siguiente completa
**una** ficha, con las fuentes en este orden y su procedencia en la propuesta:

1. **Su Instagram** (`src/lib/rutinas/descubrir.ts`): Business Discovery con el token guardado y el id de `instagram_conexion` (si no,
   `INSTAGRAM_TOKEN`/`INSTAGRAM_USER_ID`), por `llamarGraph`, así va con `appsecret_proof` (OL-484). Foto = `profile_picture_url`; portada = la
   publicación más reciente que el modelo juzga foto de obra (artista) o del lugar (lugar), nunca `cartel_con_texto` ni `ninos` (regla del
   founder: portadas 3:2 de su obra, no carteles con texto, no niños); descripción = la biografía reescrita.
2. **Su sitio** (sin Instagram): la página desde el servidor con las reglas de `imagenWeb.ts` (https, dominio con nombre, redirecciones a mano,
   topes), og:image y las primeras imágenes (sin svg ni logos), su texto (`textoDePagina`) y, si enlaza a un Instagram, ese usuario como
   propuesta de Instagram (confianza media). **Facebook no se lee** (pide sesión y sus términos no dejan leerlo con un programa).
3. **Sin nada**: prueba con Business Discovery hasta 4 nombres plausibles (`usuariosPlausibles`: junto, con puntos, con guiones bajos, sin
   artículos) y **solo** la propone si el nombre completo o la biografía de la cuenta dicen el nombre de la ficha **y** la ciudad (o un alias)
   aparece en la biografía, el nombre o el sitio (`esLaCuenta`). Si coincide, propone su Instagram y lo demás de esa cuenta, todo con
   confianza media. Si no, «sin fuente».

Las imágenes se bajan en el momento (las del CDN de Instagram caducan en horas), se recortan con sharp al centro (foto cuadrada; portada 3:2;
1600 de ancho como mucho, sin agrandar; JPEG que cabe en el tope) y esperan en `fotos/<artistas|lugares>/rutina-fichas/<corrida>/` con su
miniatura de 360 de ancho (`src/lib/rutinas/fichasImagen.ts`). Una portada de menos de 600 de ancho no se propone (borrosa en la cabecera).
**Una sola llamada al modelo por ficha** (`claude.ts`, `llamarConEntrega`, herramienta estricta `entregar_ficha`) con las miniaturas y el texto:
clasifica cada imagen (obra · lugar · retrato · cartel_con_texto · ninos · logo · otro; ante la duda, cartel o niños) y escribe la descripción en
tercera persona y llana, 120 a 300 caracteres, solo con lo que dice el texto (sin emojis, arrobas, etiquetas, enlaces, teléfonos ni
promociones; se vuelven a quitar en `limpiarDescripcion`). Modelo: **Haiku 5.5** (`MODELO_FICHAS`), esfuerzo bajo; su gasto entra al tope
como en las demás rutinas.

Cada hallazgo es **una propuesta por campo** (`tipo = 'ficha'`, `campo`), con `datos` = ficha (tipo, id, nombre, ciudad), `imagen` y
`miniatura` (foto/portada), `valor` (descripción o enlace de Instagram), `origen` (la imagen original, el texto leído o la cuenta), `url` (la
página de la fuente: la publicación, el perfil o el sitio), `confianza` (alta: su propia cuenta; media: su sitio o una cuenta encontrada; baja:
una descripción de menos de 120) y `razon`. Fuentes (como agrupa la bandeja): «Instagram de la ficha», «Sitio de la ficha», «Instagram
encontrado». No se repite un campo que ya espera revisión ni una imagen o texto que se rechazó para esa ficha; **una ficha a la que no se le
encontró nada no se vuelve a buscar en 30 días** (`resumen.nada` de las corridas `fichas` de la ciudad). Una descripción que ya existe pero es
corta (menos de 120) **no se pisa**: sale en «sin fuente» para alargarla a mano.

**Aceptar** (`src/lib/rutinas/aceptarFicha.ts`, por `aceptarLeida` en `aceptarPropuesta.ts`: la bandeja y el guion `aceptar-corrida` de la
Mac usan lo mismo): solo si la ficha tiene **vacío** ese campo (nunca pisa, aunque alguien lo haya puesto después de proponerse); foto o
portada: la imagen de espera se pasa a `fotos/<artistas|lugares>/<admin>/<foto|portada>-<uuid>.jpg` (como las fichas que ya existen), se pone
con `… where <campo> is null` y las de espera se borran; descripción: el texto (con el tope de la ficha); Instagram: se añade a `redes` si no
tiene uno y le cabe. Luego se marca (`aceptar_propuesta`/`aceptar_propuesta_como`) y se liga (`ficha_id`). La línea dice «se puso su
portada», «se añadió su Instagram»…; «Ver ficha» lleva a ella. `scripts/instituciones/aceptar-corrida.ts` acepta `--solo ficha`.

**Semanal** (`src/lib/rutinas/semanales.ts`, `ajusteSemanal.ts`): el interruptor vive en `configuracion.rutina_fichas_semanal`
(`{ activa, tope_usd, cambiado_en, cambiado_por }`, **apagado** hasta que el gestor lo encienda). Cada llamada al motor
(`/api/rutinas/correr`: el cron diario de Vercel a las 12:00 UTC, el latido de Supabase con corridas vivas, la hoja «Correr») mira antes de dar
pasos si una ciudad abierta (o investigando) no tiene una corrida `fichas` creada en 7 días y, encendido, la deja pendiente con 0,50 USD; el
índice de una sola en curso por botón y ciudad impide duplicarla. Nunca tumba la llamada (`atender.ts`, `programar`).

**Pantallas** (solo administración):
- Administración › **Rutinas** (sección nueva en `src/app/admin/page.tsx`, la única que se toca ahí): «Completar fichas» con su palanca (la de
  toda la app, se guarda al tocar; `src/app/admin/rutinas/`), qué hace encendida o apagada y cómo le fue esta semana; y «Corridas» con el
  crédito y lo gastado esta semana.
- El panel de cada ciudad: tarjeta **«Fichas»** (las fichas con fecha a las que les faltaba algo en la última corrida) con el botón «Completar
  fichas» y su hoja (tope 0,50 por omisión, fuentes en orden). Nunca es el siguiente paso, como «Buscar carteles».
- La bandeja: cada campo con su miniatura (3:2 la portada, cuadrada la foto) o su texto, la razón, la fuente con enlace y la confianza.
- Corridas: la de fichas dice revisadas, propuestos, por revisar, sin fuente y gasto, y lleva a su **informe** (`/admin/corridas/[id]`):
  revisadas, propuestas por campo, gasto, «Revisar las N» y la lista «Sin fuente» con lo que le falta a cada ficha y por qué (cada renglón
  abre la ficha, para completarla a mano).

**Nada de vigilancia:** solo se leen las cuentas y sitios de fichas que ya están en el directorio (o, en (c), la cuenta pública que dice su
nombre y su ciudad) y solo lo que la propia cuenta publica como público; nada de personas particulares, ni seguidores, ni historias.

## Gasto estimado por corrida

Haiku 5.5: 0,10 USD por millón de tokens de entrada y 0,50 de salida (`precios.ts`). Una llamada por ficha: reglas y encargo ~1 000 tokens,
texto de la fuente hasta ~1 000, cinco miniaturas de 360 × 240 (≈ 115 tokens cada una, la foto de 360 × 360 ≈ 175) → **~2 500–3 000 de
entrada**; salida (lo que piensa con esfuerzo bajo y la entrega) ~300–1 500. Por ficha ≈ **0,0005–0,001 USD**; **20 fichas ≈ 0,01–0,03 USD**
por corrida y ciudad. Business Discovery no cobra (cuenta para el límite de Meta: hasta 1 + 4 lecturas por ficha, ~40–80 por corrida). El tope
de 0,50 deja margen de sobra; antes de cada llamada se reservan 0,02. Si se cambiara a Sonnet 5.5 (`MODELO_FICHAS`), unas 20 veces más (~0,2–0,6).

## Guion para el gestor: la primera corrida real

1. **Antes:** aplicar la migración `20261029250000_rutina_fichas.sql` (después de `20261029230000`, que ya está en `main`). Comprobar en
   Administración › Instagram que la conexión está hecha con `instagram_manage_insights` (OL-471) y que `META_APP_SECRET` está en Vercel.
2. **Una corrida a mano en San Luis:** panel de la ciudad › tarjeta «Fichas» › «Completar fichas», tope **0,50**, Correr (20 fichas por
   omisión). Seguirla en Corridas hasta «Terminada» (de 21 a 25 pasos encadenados, unos minutos).
3. **El informe** (Corridas › la corrida): revisadas, propuestas por campo, gasto real (esperado < 0,05) y «sin fuente». Si salen avisos
   («Sin conexión con Instagram», «ya no hay cupo», «Sin llave de la API»), parar y avisar.
4. **Qué revisar antes de aceptar** (bandeja de San Luis, fuente por fuente):
   - **Portadas y fotos:** que la miniatura sea obra o el lugar, **sin texto encima, sin niñas ni niños**, y que el recorte 3:2 no corte lo
     importante; abrir «fuente» si hay duda.
   - **Descripciones:** compararlas con la biografía o el sitio (enlace «fuente»): que no digan nada que la fuente no diga, en tercera persona,
     sin promociones. Las de confianza baja (menos de 120) no completan la ficha para Instagram.
   - **«Instagram encontrado»:** abrir la cuenta y confirmar que es esa ficha (nombre, ciudad, lo que publica). Si no, rechazar «Otro»: lo
     demás de esa cuenta también se rechaza.
   - **«Sitio de la ficha»:** la imagen del sitio puede ser un banner: mirarla entera.
5. **Aceptar:** en la bandeja o con el guion de la Mac, primero simulando:
   `node scripts/instituciones/correr.mjs aceptar-corrida <corrida> --autor <id del admin> --solo ficha --simular`, luego sin `--simular`.
   Después, en Administración › Instagram, ver que las fichas completas ya salen entre los candidatos de la semana.
6. **Encender** Administración › Rutinas › «Completar fichas» si todo salió bien: desde el día siguiente corre sola una vez por semana en cada
   ciudad abierta (como techo, 0,50 USD por ciudad y semana; lo esperado, unos centavos).

## Decisiones tomadas en la pieza (por confirmar)

1. **Haiku 5.5** para juzgar imágenes y reescribir (las otras rutinas usan Sonnet 5.5): basta para clasificar una miniatura y reescribir una
   biografía, y cuesta 20 veces menos. Que Haiku 5.5 acepte imágenes se confirma con la primera corrida real (si la API lo rechazara, el aviso
   lo dice y se cambia `MODELO_FICHAS` a `claude-sonnet-5-5`).
2. **Las imágenes se guardan al proponer** (en la carpeta de espera) y no al aceptar, porque las del CDN de Instagram caducan en horas.
   Aceptar las mueve a la carpeta de quien acepta.
3. **El interruptor semanal nace apagado** y vale para todas las ciudades abiertas a la vez.
4. **Descripción corta existente:** no se pisa; va a «sin fuente».
5. **La foto de un artista** solo sale de su foto de perfil de Instagram (un sitio suele traer logos o carteles).

## Evidencia (árbol sin `.env`; sin red: Meta, Anthropic, el sitio y el bucket falsos)

Todo esto, con `origin/main` (`5bd1ec60`, OL-488) ya unido a la rama.

- `npm run lint`: 0 errores (los 2 avisos de siempre). `npm run typecheck`: bien. `npm test`: 315 archivos, 5 085 pruebas, todas bien. Nuevas:
  `src/lib/rutinas/fichas.test.ts` (15) y una en `atender.test.ts`; `aceptar-corrida.test.ts` ajustado a «· ficha 0» en el informe.
- **La corrida completa** (`fichas.test.ts`, motor real, base en memoria, Business Discovery y Anthropic falsos, JPEG reales): 3 artistas y 2
  lugares incompletos → «Colectivo Marea» (su Instagram): foto cuadrada, portada 3:2 y descripción; «Ana Lucía Rivas» (su sitio): portada,
  descripción e Instagram del enlace de su sitio, confianza media; «Trío Huasteco Sol» (sin nada): su cuenta `trio.huasteco.sol` encontrada al
  segundo nombre probado, con Instagram, foto, portada y descripción; «Foro Lunaria»: la portada salta el cartel con texto y toma la siguiente
  publicación; «Casa del Viento»: la cuenta con su nombre es de Oaxaca → sin propuesta, «sin fuente» y en `nada`. 12 propuestas, cuatro
  llamadas a Haiku 5.5, gasto ≈ 0,002 USD. **Aceptar una de cada campo** (foto, portada y descripción de Marea; Instagram de Rivas) deja a
  Marea con foto y portada en `artistas/<admin>/…`, descripción de 120+ e Instagram: lo que pide `instagram_candidatos`; las de espera se
  borran; las propuestas quedan ligadas; lo que la ficha ya tenía no se toca, y una portada puesta mientras tanto hace que la propuesta no se
  acepte («ya tiene ese dato»). También: la semana siguiente no repite lo que espera revisión ni vuelve a buscar lo «sin fuente»; sin llave de
  la API solo propone Instagram y lo avisa; sin conexión con Instagram solo lee sitios; el tope corta antes de la llamada.
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: 126 migraciones, 2 948 comprobaciones, 0 fallaron. Nueva
  `supabase/tests/pg/rutina-fichas.test.mjs`: los tipos nuevos, el campo solo en `ficha`, una sola `fichas` en curso por ciudad, aceptar sin
  crear ficha, completar solo lo vacío y **la ficha completa entra a `instagram_candidatos`**. El Security Advisor sigue en verde (sin
  funciones nuevas).
- `npm run inventario`: sin novedades (las medidas de la miniatura salen de tokens).
- `npm run medir`: la primera pasada falló solo en tres presupuestos de nodos, por lo que la pieza añade a propósito: el panel de una ciudad
  (s35a y su hoja s35b: 74 → 81 y 98 → 105, la tarjeta «Fichas») y la portada de Administración (s45: 217 → 233, la sección «Rutinas»); sin
  desbordes, toques chicos, desplazamiento a lo ancho ni fallos con el teclado. Anotados con `npm run medir -- --aceptar`
  (`medidas.aceptadas.json`); la pasada siguiente: 62 pantallas × 4 anchos, **sin novedades**.
- Una ficha que no se pudo leer por algo del momento (sin conexión con Instagram, sin cupo, sin llave o error de la API) sale en «sin fuente»
  pero **no** entra a los 30 días: se vuelve a buscar la semana siguiente.
- **Capturas** 390 × 844 a 2× (Chrome real, app compilada contra el respaldo con `RESPALDO_COMPLETAR=1`,
  `scripts/ops/auditoria-ui/capturar-rutina-fichas.mjs`), en `docs/rediseno/capturas-521/`, todas abiertas y revisadas; ningún error de página
  ni de consola; sin desplazamiento a lo ancho:
  - `01-rutinas-encendida.png`: Administración › Rutinas: «Completar fichas» con la palanca encendida, «Cada semana en cada ciudad abierta, con
    tope de 0,50 USD por ciudad», «Esta semana: 1 corrida · 5 propuestos · menos de 0,01 USD»; debajo, Corridas con el crédito y lo de la semana.
  - `02-rutinas-apagada.png`: tras tocar la palanca (toque real): apagada, «solo corre al tocar «Completar fichas» en una ciudad».
  - `03-corridas.png`: Corridas: «Fichas · San Miguel de Allende · 7 fichas revisadas · 5 propuestos · 5 por revisar · 3 sin fuente».
  - `04-informe.png`: el informe: Revisadas 7 de 9 (1 ya buscada este mes), Propuestas 5 (1 foto · 2 portadas · 1 descripción · 1 Instagram),
    Gasto <0,01 de 0,50, Sin fuente 3, «Revisar las 5» y la lista con lo que falta y por qué.
  - `05-informe-sin-fuente.png`: la lista «Sin fuente» entera.
  - `06-propuestas.png` y `07-propuestas-abajo.png`: la bandeja: la foto cuadrada (88 × 88) y las portadas 3:2 (248 × 165) con su razón, su
    fuente y su confianza; la descripción propuesta como texto.
  - `08-panel-tarjeta-fichas.png`: el panel de San Miguel con la tarjeta «Fichas» (9 por completar) bajo «Carteles», su última corrida y el
    botón.
  - `09-hoja-completar-fichas.png`: la hoja: qué hace, las tres fuentes en orden, tope 0,50 y «menos de 0,10 USD por 20 fichas».

## Lo que no se hizo

- Ninguna corrida ni llamada real (Meta, Anthropic, Storage, producción): la primera es del gestor.
- **Limpiar la carpeta de espera** de lo rechazado (`<…>/rutina-fichas/<corrida>/`): rechazar no borra la imagen para que «Deshacer» siga
  sirviendo; unas decenas de archivos chicos por semana. Pieza aparte si hace falta (borrar las de propuestas rechazadas hace más de 30 días).
- Facebook (no se lee), historias, y la foto de un lugar (la ficha de lugar no tiene).
- Alargar descripciones cortas que ya existen (no se pisan: van a «sin fuente»).
