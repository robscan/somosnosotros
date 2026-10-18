# 445 · Administración › Personas: las fotos más grandes y «Lo que publicó» con cada ficha (OL-414)

**Fecha:** 2026-10-18. **Rama:** `admin-persona-publicado`, base `main` (`82433c72`). **Operador:** agente de la pieza, sin otros agentes.
**Sin migración** y sin variables de entorno nuevas. **Estado:** lista para la revisión del gestor y el «publica» del founder.

## El pedido (founder, 18 de octubre)

«ayúdame a hacer que desde el panel de admin pueda ver las fotos de usuarios más grandes, también quisiera saber qué publicaron. Ahora solo dice:
publicó 2 pero no puedo ver que».

Hoy: la lista de Personas pintaba la foto a 44 px y la ficha de administración de una persona a 64; el renglón «Publicó» de Actividad decía solo
el número («2 eventos») sin decir cuáles.

## Lo que se ve ahora

- **Lista de Personas:** la foto a 56 px, la del renglón de las listas de la app (`--foto-renglon`), en la misma rejilla (foto | nombre y detalle
  | chevron). Tocarla sigue llevando a la ficha. Sin foto, la inicial.
- **Ficha de una persona:** la foto a **144 px**, arriba y al centro, con el nombre y su detalle debajo (como la ficha de un contacto del teléfono).
  Al tocarla se abre **entera y acercable en el visor de los carteles** (`VisorImagen`: pellizco, doble toque, ✕ y Escape). Sin foto, la inicial
  grande.
- **«Lo que publicó»:** una sección nueva entre Actividad y Rol, con un rótulo por tipo y su cuenta («Eventos 9», «Lugares 2», «Artistas 2») y
  cada cosa con el renglón de lista de la app (`ui/Renglon`): foto, nombre y una meta corta. Un evento: su día (o sus días, con su clase delante
  si es festival, exposición o taller) y su lugar; un acto de festival, «jue 29 de oct · acto de Festival de Cine de Invierno». Un lugar: su tipo.
  Un artista: su disciplina y su subcategoría. Lo que el público no ve lleva su etiqueta: **«Borrador»** (un acto sin publicar), **«Oculto»**,
  **«Cancelado»** o **«Privado»** (un lugar del mapeo personal). Del más reciente al más antiguo; el festival antes de sus actos y los actos en el
  orden de su programa.
- **El renglón «Publicó»** baja a la sección (`ui/Salto`: no apila historial, no cambia la URL; un caret hacia abajo lo dice). Sin nada
  publicado dice «Nada aún», no enlaza y la sección no sale.
- **20 de cada tipo** y «Ver más (7 más)», que suma 20 de ese tipo en la misma pantalla sin moverla ni apilar historial (`replace`,
  `scroll={false}`, como el «Ver más» de las listas del panel), conservando lo que ya se abrió de los otros tipos (`?eventos=40`).

## Decisiones (y por qué)

1. **144 px en la ficha.** El canon de la app tiene el avatar de la cabecera de una persona a 72 (`--avatar-perfil`, Mi perfil y su ficha
   pública) y el de los carriles de Inicio a 88; el pedido era «mucho más grande», 120–160. 144 es el doble de `--avatar-perfil`
   (`calc(var(--avatar-perfil) * 2)`, sin medida nueva en duro): se lee el doble de grande que donde la persona se ve a sí misma, y a 390 deja al
   nombre todo el ancho debajo. Con la foto al lado (como estaba), el nombre se quedaba con 200 px. La foto se pide del tamaño que se ve (`sizes`
   de 144 → la variante de 384 en un teléfono a 2×) y el visor abre el original.
2. **56 en la lista**, el lado de la foto de `ui/Renglon`: un solo tamaño de foto de renglón en la app.
3. **La foto de la lista y de la ficha pasa por `ui/Imagen`.** Antes `Avatar` bajaba el original de cada foto para pintarla a 44; ahora pide la
   variante del tamaño que se ve (menos tráfico del Storage, que ya se agotó una vez).
4. **Cada renglón abre la ficha pública** (`/eventos/<slug>`, `/lugares/<slug>`, `/artistas/<slug>`). Administración no tiene una ficha propia de
   un evento, un lugar o un artista, y las listas del panel (decisión 10 del doc 19) también abren la pública; ahí quien administra ve lo oculto y
   los borradores, con su menú (Editar, Ocultar o Volver a mostrar).
5. **Un acto de festival es su propio renglón**, con «acto de …» en la meta. Así el número que dice «Publicó» es exactamente lo que se lista (y
   el mismo que «publicó 13» en la lista de Personas, que cuenta igual en `panel_personas`). Juntar los actos bajo su festival haría que la ficha
   dijera un número y la lista otro, o pediría cambiar `panel_personas` con una migración.
6. **El número de «Publicó» sale de la misma lectura que la lista.** `panel_persona` ya contaba lo mismo (todo lo que tiene `creado_por` = esa
   persona, oculto y borradores incluidos); ahora la ficha toma el `count` de las consultas de «Lo que publicó» (`totalesPublicado`), así no
   pueden diferir. Si esa lectura falla, el renglón vuelve al número de `panel_persona` y la sección dice «No pudimos leer lo que publicó» con
   «Intentar de nuevo».
7. **Sin migración.** Lee como las listas del panel: con la sesión de quien administra, cuyas reglas de lectura (`eventos: lectura`,
   `gestiona_lugar`, `gestiona_artista`) ya le dejan ver todo. Tres consultas en paralelo (`creado_por` = la persona, `count: exact`, `limit`)
   y, solo si hay actos de festival, una cuarta por el título de sus festivales.
8. **Las etiquetas con el rótulo de estado de la app** (`Chip variante="estado"`, como «Solo tú lo ves» en el renglón de lugar), dentro de la
   meta de `ui/Renglon`; las listas del panel usan una píldora gris propia que `ui/Renglon` no admite en su título.
9. **La sección va en el tono del contenido, no en tarjeta:** el resaltado al tocar un renglón de `ui/Renglon` es blanco y en una tarjeta blanca
   no se vería.

## Qué cambió, por archivo

- `src/lib/panelPublicado.ts` (nuevo, puro): los tipos de lo que se lee; `estadoEvento`, `estadoLugar`, `estadoArtista` (una etiqueta, en orden:
  Borrador, Oculto, Cancelado; Oculto, Privado); `cuandoPublicado` (el día o los días, la clase, «acto de …»), `dondePublicado`,
  `disciplinaArtista`, `tipoLugar`, `fotoEventoPublicado`; `totalesPublicado` y `totalPublicado` (el número de «Publicó»); `faltanPublicado`;
  `leerPaginasPublicado` y `hrefVerMasPublicado` (de 20 en 20, tope 600 como las listas del panel).
- `src/app/admin/consultas.ts`: `cargarPublicado(perfilId, paginas)`: eventos, lugares y artistas con `creado_por` = la persona, del más reciente
  al más antiguo (`creado_en desc`; en eventos, después `evento_padre_id` con lo vacío primero e `inicio`, así el festival va antes que sus actos,
  que se dan de alta con la misma hora), con `count: exact`; el título de los festivales de sus actos en una lectura aparte; null si algo falla
  (nunca una lista a medias).
- `src/app/admin/personas/[id]/page.tsx`: lee la ficha y «Lo que publicó» en paralelo; «Publicó» con el número de esa lectura y, si hay algo,
  como `ui/Salto` a la sección; la cabecera con `FotoPersona`; la sección o su error antes de Rol.
- `src/app/admin/personas/[id]/FotoPersona.tsx` (nuevo, cliente): la foto de 144 como botón que abre `VisorImagen` por portal en el body (lo de
  `Cartel`); sin foto, la inicial.
- `src/app/admin/personas/[id]/LoPublicado.tsx` (nuevo): la sección, hijos directos de `main` (maquetación plana): rótulo, un `h3` por tipo con su
  cuenta, la lista de `ui/Renglon` y «Ver más».
- `src/app/admin/Avatar.tsx`: con `ui/Imagen` y el lado que se ve (`lado`, 56 por omisión); `inicial()` compartida con `FotoPersona`.
- `src/app/admin/admin.module.css`: `.persona` con `--foto-renglon`; `.avatar` sin lado propio (lo pone su sitio) y como botón; la cabecera
  apilada y centrada con la foto a `calc(var(--avatar-perfil) * 2)` y la inicial a `--letra-cifra`; `.ancla` (`scroll-margin-top` bajo la barra),
  `.tipoPublicado` y `.publicado`; y `.fila > .pildora` (el «Hacer administrador» de Rol) parte su texto en dos renglones cuando no cabe junto al
  texto, en vez de salirse de la tarjeta (ver Evidencia). Bajan las medidas en duro del inventario (342 → 334, anotado con `--aceptar`).
- `scripts/ops/auditoria-ui/respaldo-local/fixture.mjs`: los contratos de `panel_personas`, `panel_personas_conteos` y `panel_persona` sobre las
  personas del respaldo (antes Administración › Personas salía vacía contra el respaldo) y, solo con `RESPALDO_PERSONAS=1`, fotos para Ana y
  Marcos, tres cuentas más en la lista (Lucía y Valeria con foto, Diego sin foto ni nada publicado) y lo que Ana dio de alta además de sus nueve
  eventos: un lugar a la vista y uno oculto, un artista a la vista y uno oculto; su festival y sus actos con la misma hora de alta. Todo inventado.
- `scripts/ops/auditoria-ui/respaldo-local/server.mjs`: el orden respeta `nullsfirst` explícito (sin él, lo de siempre).
- `scripts/ops/auditoria-ui/capturar-persona-publicado.mjs` (nuevo): las capturas de esta bitácora (compila contra el respaldo con
  `RESPALDO_PERSONAS=1`, entra como la cuenta de administración del respaldo y dibuja las fotos inventadas con sharp).
- `scripts/ops/auditoria-ui/pantallas-sesion.json` y `medidas.aceptadas.json`: la ficha de administración de Ana (`s31-admin-persona`, como
  admin) entra a `npm run medir`, con su presupuesto anotado. `README.md` de la carpeta, al día.
- Pruebas: `src/lib/panelPublicado.test.ts` (12: las etiquetas, la meta de cada tipo, que el número de «Publicó» es el de la lista, «Ver más» y
  su URL) y `src/app/admin/consultas.publicado.test.ts` (4: las tres tablas por `creado_por` con `count: exact`, orden y límite; el festival antes
  de sus actos; el título de los festivales sin repetir; sin actos no hay cuarta lectura; un fallo o un id que no es de una cuenta dan null).

## Evidencia

- `npm run lint` (0 errores; el aviso de siempre en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (228 archivos, 4 021
  pruebas, con las 16 nuevas), `npm run inventario` (sin novedades; medidas en duro 342 → 334, anotado) y `npm run medir` (41 pantallas × 4
  anchos, sin novedades) en verde, en un árbol sin `.env`. Sin base que tocar: no hace falta `npm run test:db`.
- **`npm run medir` con la ficha nueva:** `s31-admin-persona` (la ficha de administración de Ana, como admin: sus nueve eventos con el festival,
  sus actos ocultos y el borrador) pasa a 320, 390, 820 y 1280 sin hijos fuera de su caja, sin desplazamiento a lo ancho y con todos los toques de
  44 o más; su presupuesto (178/178/212/212 nodos, profundidad 9) lo anoté con `--aceptar` y en el diff de `medidas.aceptadas.json` solo entra esa
  línea. **La CI la encontró a 320 con un fallo de antes:** con la letra de Linux, el botón «Hacer administrador» del renglón Rol salía 5 px de su
  renglón (en la Mac cabía justo, metido 4 px en el relleno de la tarjeta). Ahora ese botón parte su texto en dos renglones («Hacer /
  administrador») cuando no cabe junto al texto, y en un solo renglón donde cabe (390 y más); comprobado a 280, 300, 320 y 390, y `medir` de
  `s31` en verde con el Chrome de la Mac y con el Chromium de la CI (`chrome-headless-shell`). **Hallazgo aparte, no de esta pieza:** probé también la lista de Personas (`/admin/personas`) y falla por el buscador del panel
  (`ui/Buscador`): su campo se toca de 220×24 (lo mismo en las listas de Lugares, Eventos y Artistas del panel, que `medir` tampoco mide). No la
  dejé en la prueba; queda para otra pieza.
- Capturas en `docs/rediseno/capturas-445/` (Chrome real con playwright-core, `channel: 'chrome'`, 390×844 a 2×, **sin comprimir**), con
  `scripts/ops/auditoria-ui/capturar-persona-publicado.mjs`: la app compilada contra el respaldo local con `RESPALDO_PERSONAS=1`, el reloj fijo el
  domingo 18 de octubre a las 10:00 y la sesión de la cuenta de administración del respaldo. Las fotos de las personas son siluetas inventadas
  (dibujadas con sharp); los carteles, los públicos del respaldo. Cada una abierta y mirada:
  - `01-lista-personas.png`: Personas con «Todas 6»; cada renglón con la foto a 56 (medido: 56 px) en la misma rejilla: «Tú · Administración»
    con la inicial A, Ana Rentería con su foto y «Abrió la app hoy · 2 voy · publicó 13», Lucía, Marcos («publicó 27 · lleva Feleal y 1 más», en
    dos líneas), Diego con la inicial D y Valeria («Perfil reservado»). Sin desplazamiento a lo ancho (390).
  - `02-ficha-foto-grande.png`: la ficha de Ana con su foto a 144 (medido) arriba y al centro, «Ana Rentería» y «Barrio de San Miguelito · perfil
    público» debajo; Cuenta igual que antes; en Actividad, «Publicó · 9 eventos · 2 lugares · 2 artistas» con el caret hacia abajo.
  - `03-visor-foto.png`: tras tocar la foto, el visor de los carteles: la foto entera (vertical, 4:5) a todo lo ancho sobre el negro, con la ✕
    arriba a la derecha; detrás, la ficha oscurecida.
  - `04-lo-que-publico-eventos.png`: tras cerrar el visor y tocar «Publicó», la pantalla bajó a «LO QUE PUBLICÓ» justo bajo la barra (la URL no
    cambió y el historial siguió en 2: no apila). «Eventos 9»: «Festival de Cine de Invierno» (Festival · Del 27 al 30 de oct · Centro Cultural
    Universitario Bicentenario) y debajo sus actos en orden: «Inauguración: «La luz que queda»» (Oculto · mar 27 de oct · acto de Festival de
    Cine de I…), «Charla con la directora» (Oculto), «Función: cortometrajes potosinos» (Oculto, Teatro de la Paz), «Función de clausura»
    (**Borrador**); luego «Taller de grabado en el barrio» (Oculto) y «Festival de las Linternas».
  - `05-lo-que-publico-lugares-artistas.png`: el final de Eventos («Inauguración: Ecos de papel» y «Ecos de papel», Exposición · Del 15 de oct al
    7 de nov, los dos Ocultos); «Lugares 2»: «Taller Barro y Fuego (demo)» (Colectivo) y «Patio de la Vecindad (demo)» (Oculto · Otro · Patio de
    vecindad); «Artistas 2»: «Mariana Ruvalcaba (demo)» con foto redonda (Artes visuales · Grabado) y «Colectivo Tinta Roja (demo)» (Oculto ·
    Artes visuales · Gráfica); después, Rol y «Ver su ficha pública».
  - `06-ver-mas.png`: la ficha de Marcos (27 eventos): los últimos de los 20 a la vista (eventos de hoy, exposiciones con sus días, pasados como
    «lun 28 de sep») y «Ver más (7 más)» antes de Rol.
  - `07-tras-ver-mas.png`: tras tocar «Ver más», la URL pasó a `?eventos=40`, la lista tiene los 27 y la pantalla se quedó donde estaba (scroll
    2 413 antes y después; historial 2 antes y después): debajo de «Rocío Lozano» siguen «Feleal: acordeón en ACHE» (**Cancelado**) y «Festival
    Otoño Sonoro»; el botón ya no está.
  - `08-ficha-sin-foto.png`: Diego, sin foto ni nada publicado: la inicial D grande en el círculo gris de 144, «Publicó · Nada aún» sin caret ni
    enlace y, más abajo, sin la sección.

## Dudas para el founder

1. **¿Los actos de un festival como renglones propios?** Hoy cada acto es un renglón («… · acto de Festival X»), así el número de «Publicó» es
   lo que se lista y coincide con «publicó N» de la lista de Personas. Si prefieres el festival en un solo renglón con «y 4 actos», se puede,
   pero entonces la lista de Personas contaría distinto que la ficha hasta cambiar su consulta en la base (una migración).
2. **El orden es por fecha de alta** (lo último que publicó, arriba), no por la fecha del evento; la meta dice cuándo es o fue. ¿Te sirve así?
3. **Abrir la ficha pública** en vez de una ficha de Administración (que no existe para eventos, lugares ni artistas). Desde ahí ves lo oculto y
   tienes Editar y Ocultar en su menú.
4. **Las etiquetas** «Oculto», «Borrador», «Cancelado» y «Privado» van con el rótulo de estado de la app (lila), no con la píldora gris de las
   listas del panel. Si las quieres grises como allá, es un ajuste de estilo.
