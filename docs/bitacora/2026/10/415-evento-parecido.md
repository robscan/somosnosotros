# 415 · «¿Es este?» antes de publicar un evento que ya está

**Pieza:** OL-384. **Rama:** `evento-parecido`, base `origin/main` (`3cf426a1`). **Fecha:** 2026-10-12. **Operador:** Claude (agente del gestor VI).
**Manda:** el founder (2026-10-12, desde la sesión de redes): «dile al gestor que haga una manera de evitar que se publiquen eventos duplicados, así como ya hacemos con lugares». El caso: en producción hay dos fichas del mismo concierto, «Gitanos mexicanos 2.ª edición: Pargazz» (sin cartel, carga del PDF de la Secretaría) y «Pargazz: Gitanos mexicanos, 2ª Edición» (con cartel), las dos el 16 de octubre a las 19:00 en el Museo Francisco Cossío. `titulos_parecidos` (OL-341) no las toma por iguales y la app no avisa al publicar.
**Estado:** hecho y probado (banco SQL en PGlite y en el Postgres de la CI, acción del servidor, componentes reales en Chrome, importador simulado). **Trae una migración que solo añade; la aplica el gestor** (`20261012120000_eventos_parecidos.sql`). Sin ella, el alta publica como hoy (la consulta falla, se anota en el registro y no se pregunta) y el importador no carga nada sin `--forzar-parecidos` (mejor parar que duplicar). Falta el iPhone del founder.

## La regla, en palabras llanas

Antes de publicar un evento, la app busca si ya hay uno publicado que sea **el mismo día**, **en el mismo sitio** y con **un nombre que se parece**. Si lo hay, pregunta «¿Es este?» antes de publicar otro.

- **El mismo día:** el día del calendario en la ciudad del evento (las 23:30 de San Luis son el mismo día aunque en UTC ya sea el siguiente). La hora puede ser otra.
- **El mismo sitio:** el mismo lugar del directorio, o el mismo nombre de sitio escrito (sin acentos ni mayúsculas). También cruza uno con otro: «Museo Francisco Cossío» del directorio encuentra un evento cuyo sitio se escribió a mano como «Museo Francisco Cossio», y al revés.
- **Un nombre que se parece**, cualquiera de tres:
  1. el mismo nombre (sin acentos, mayúsculas ni signos), aunque sea genérico: «Concierto» y «Concierto» el mismo día en el mismo sitio sí preguntan;
  2. uno dentro del otro, con el corto distintivo (la regla de OL-341: tres palabras con contenido o una palabra de festival);
  3. **al menos dos palabras con contenido en común**, en cualquier orden. No cuentan los artículos, preposiciones y conjunciones (las mismas de OL-341) ni los años («2026»); un ordinal vale por su número («2ª» y «2.ª» son «2»). Pargazz: «gitanos», «mexicanos», «2», «edicion», «pargazz»: cinco en común.
- **Qué se compara:** solo lo que cualquiera ve en la agenda (visible, sin borradores, sin lo retirado por la administración, sin pasar), y solo eventos de un día y talleres (también un acto de festival). Hasta cinco, el más cercano en hora primero.

## Qué cambió

- **Base (`supabase/migrations/20261012120000_eventos_parecidos.sql`, solo añade):** `eventos_parecidos(p_titulo, p_inicio, p_zona, p_lugar_id, p_sitio_texto, p_excluir default null)` → `id, slug, titulo, inicio, zona, imagen, lugar_id, lugar_nombre, sitio_texto`. `security invoker`, `stable`, `search_path = ''`, EXECUTE para `anon`, `authenticated` y `service_role` (no para `public`). Filtra a mano lo visible, así que ni la autora de un borrador ni la llave de servicio lo ven. No llama a `titulo_distintivo` ni a `titulos_parecidos` (internas, sin EXECUTE para las cuentas, y no se tocan): repite su regla, comentada en el SQL.
- **Acción del servidor (`src/app/eventos/acciones.ts`, `crearEvento`):** antes de guardar un evento puntual o un taller, si no viene `confirmado = 1`, consulta `eventos_parecidos`; con alguno, no publica y devuelve `{ ok: false, errores: {}, parecidos }`. Primero mira si esta misma operación ya guardó (una respuesta perdida): entonces no pregunta, para que el reintento no se encuentre a sí mismo. Sin clave de operación no consulta (no se guardaría). Si la consulta falla, publica como siempre: preguntar es una ayuda, no un candado.
- **«Revisa» del alta (`src/app/nuevo/evento/Revisa.tsx` y `AltaEvento.tsx`):** el bloque de abajo, encima del pie: «**¿Es este?** Ya hay uno parecido ese día en el mismo sitio:», el renglón del evento (el de la agenda: cartel o símbolo SN, título, día y hora en su zona, sitio; un toque abre su ficha reemplazando el alta, como el lugar) y «**No, es otro: publicar de todos modos**», que publica en seguida con la misma clave de operación. Lo preguntado y lo confirmado van atados a la firma de lo que se publicaba (nombre, día y hora, sitio): si se cambia algo de eso, el aviso se va y al publicar se vuelve a preguntar.
- **Componente compartido (`src/components/ui/Parecidos.tsx` y `.module.css`):** la caja «¿Es este?» con su botón, que ahora usan el lugar y el evento (los estilos `.parecidos` salieron de `AltaLugar.module.css`), y `RenglonParecido`, el renglón del evento (las clases de `ui/Renglon`). El alta de lugar se ve igual que antes (captura 03).
- **`src/lib/eventosParecidos.ts`:** el tipo de la fila, cuándo se pregunta (puntual y taller), el renglón y la firma.
- **Importador (`scripts/instituciones/importar-eventos.ts`):** además del salto por «mismo título a la misma hora», consulta `eventos_parecidos` por cada evento; si hay uno, no lo carga y lo anota en «Parecidos a uno ya publicado» como «parecido a «X» (id, slug)». Con `--forzar-parecidos` los carga igual y el informe lo dice. Con `--simular` solo informa. Sin la función en la base, cada evento va a «Fallaron» con el motivo, salvo con `--forzar-parecidos`.
- **No se tocó:** editar un evento (ahí no aplica), el programa de un festival (`publicarPrograma`, otra acción), la sugerencia de «Publicado» de OL-341, los archivos de OL-382 y OL-383.

## Decisiones (por confirmar)

1. **Exposiciones y festivales fuera.** Ocupan un periodo: compararlos por «el mismo día» los tomaría por iguales a cualquier evento del sitio en esas semanas. Ni se preguntan al publicarlos ni son candidatos. Si el founder quiere, una regla propia: periodos que se traslapan y título parecido.
2. **El mismo nombre genérico sí pregunta** («Concierto» y «Concierto» el mismo día y sitio). El encargo sugería decidirlo con `titulo_distintivo` (que diría que no); aquí ya se compara el sitio y el día, así que el mismo nombre es una señal fuerte y preguntar cuesta un toque. «Concierto de jazz» contra «Concierto» no pregunta (el corto no es distintivo y es una sola palabra en común).
3. **Umbral de dos palabras con contenido.** Atrapa el caso Pargazz con margen (cinco) y deja fuera «Música mexicana» contra «Danza mexicana». Una palabra genérica como «edición» cuenta: «2ª edición» de dos cosas distintas el mismo día y sitio preguntaría.
4. **«No, es otro» publica en seguida** (el lugar solo esconde la caja y espera a «Publicar lugar»): el botón ya dice «publicar de todos modos».
5. **Con la sugerencia de OL-341:** quien confirma «No, es otro» puede ver después, en «Publicado», «Ya hay un evento igual · ¿Es el mismo?» (unir como festival) si los títulos son de los que OL-341 junta. Son preguntas distintas (no duplicar / es mi participación); se deja así hasta ver si confunde.
6. **El importador para si no está la función** (sin `--forzar-parecidos`): mejor un informe con «Fallaron» que una carga con duplicados.

## Pruebas

- `npm run lint`: 0 errores (el aviso de siempre en `VisorImagen.componentes.test.mjs`). `npm run typecheck`: verde. `npm test`: **199 archivos, 3611 pruebas, en verde** (con `main` traído, `f09af29e`); nueva `src/app/eventos/parecidos.acciones.test.ts` (7: con parecido no publica y devuelve, confirmado publica sin consultar, sin parecidos publica, el reintento de una operación ya guardada no pregunta, sin la migración publica, el taller pregunta y la exposición no, con lugar manda su id). `npm run build`: verde.
- **Banco PGlite** `PGLITE=<carpeta> node supabase/tests/eventos_parecidos.mjs`: **97 migraciones, 36 comprobaciones en verde** (y `FORZAR_FALLO=1` sale en rojo). Casos: Pargazz (sí, también a otra hora del día, con «Gitanos mexicanos» y a las 23:30), `p_excluir`, otro día, otro lugar, el mismo título genérico (sí) y con más palabras (no), mayúsculas y signos, el escrito a mano contra el del directorio y al revés, otro sitio y sin sitio (nada), oculto, borrador y retirado (nada, tampoco para su autora ni con la llave de servicio), pasado, exposición y festival fuera, taller dentro, una palabra en común (no), el año no cuenta, solo palabras vacías (nada), 00:30 del día siguiente (no), tope de cinco y el más cercano primero, `anon` y `service_role` la llaman, invoker y stable, sin EXECUTE para `public`, las internas de OL-341 siguen cerradas.
- **`npm run test:db`** (PostgreSQL 17 local, como la CI): **97 migraciones, 2012 pruebas, 0 fallos**; nueva `supabase/tests/pg/eventos-parecidos.test.mjs` con lo esencial.
- **Componentes** (Playwright, Chrome de la Mac): dos pruebas nuevas en `AltaEvento.componentes.test.mjs` (el aviso con su texto, el renglón con su enlace, cartel, «vie 9 de oct · 18:30» y sitio, nada publicado y la guardia puesta, sin desbordes; «No, es otro» publica con `confirmado = 1` y la misma operación; sin cartel, el símbolo SN; cambiar el sitio quita el aviso y al publicar vuelve a preguntar sin la confirmación de antes). Pasan también `EditarEvento` (21 de 21; su doble de `./Imagen`, que «Revisa» ahora necesita), `AltaLugar`, `ClasesEvento` y `Sugerencias`.
- **Importador simulado** contra una API falsa en el scratchpad (sin producción): con «Gitanos mexicanos 2.ª edición: Pargazz» y «Recital de guitarra» en el Cossío, «entrarían 1 · parecidos 1» y la línea «parecido a «Pargazz: Gitanos mexicanos, 2ª Edición» (id, slug)»; con `--forzar-parecidos`, «entrarían 2 · parecidos 1 (cargados igual)». La API recibió `p_lugar_id` del Cossío, `p_zona` y el inicio en UTC.

## Capturas (`docs/rediseno/capturas-415/`), abiertas y descritas

De los componentes reales (alta por pasos, «Revisa», `ui/Parecidos`) en Chrome a 390×844 (2×), con la letra de la app y una acción simulada que contesta como `crearEvento` con un parecido inventado. No se armó la app entera contra la API local sobre PGlite: el camino del servidor lo cubren la prueba de la acción y los dos bancos SQL.

- `01-revisa-es-este-390.png`: «Revisa» de «Lectura en voz alta» (Evento · vie 9 de oct · 19:00–21:00 · Teatro de la Paz · Gratis · Parte de un festival) y, encima del pie, la caja gris «**¿Es este?** Ya hay uno parecido ese día en el mismo sitio:» con el renglón del cartel «Ecos de papel», «Lectura de poesía en voz alta», «vie 9 de oct · 18:30» (con el calendario, en el color de acción, como en la agenda) y «Teatro de la Paz» (con el pin), y «No, es otro: publicar de todos modos». El pie sigue diciendo «Publicar».
- `02-publicado-tras-no-es-otro-390.png`: tras «No, es otro»: «Evento publicado», la tarjeta «Lectura en voz alta · vie 9 de oct · 19:00 · Teatro de la Paz», «Crea su cartel», «Ver el evento» y «Compartir».
- `03-lugar-es-este-390.png`: el alta de lugar con el mismo bloque compartido, para comparar: la misma caja, el mismo texto en negritas y el mismo botón; el lugar sigue con su lista de enlaces con viñeta («Teatro de la Paz · Foro · Villerías 205»).

## Qué probar en el iPhone (con la migración aplicada)

1. Publicar por pasos un evento el mismo día y en el mismo lugar que uno ya publicado, con las palabras del nombre en otro orden: sale «¿Es este?»; tocar el renglón abre su ficha.
2. Repetir y tocar «No, es otro: publicar de todos modos»: publica.
3. Cambiar el sitio o el día después del aviso: el aviso se va.
