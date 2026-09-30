# 272 · P13 Lenguaje incluyente en toda la app (OL-244)

**Fecha:** 2026-09-30 · **Rama:** `ui-lenguaje`, desde `origin/ui-retiros` (`340b26ec`) · **OL:** OL-244 · **PR:** #PR (sin unir; va montado sobre #281, `ui-retiros`, que va sobre #280, #279, #278, #277, #276, #275, #274, #273, #272, #271, #270, #269 y #268, y sobre #266, `restructura-ui`) · **Modelo:** Sonnet 5.5. Sin subagentes, council ni workflows. Pieza P13 del plan de OL-227 (doc 50, § 7 y punto 47 de § 11): cierra el plan.

## Pedido

Encargo del Gestor de cambios III con el criterio de siempre («con ultra cuidado, atención a detalle, sin código basura, sin sobreanidar, siempre simple, elimina todo lo innecesario, cuida mucho el código»): aplicar la regla del founder, **«primero neutro, la x solo si no hay otra salida»**, a la lista del punto 47 del doc 50, a lo que anotaron las bitácoras 261, 267, 269, 270 y 271, y a lo que saliera de un barrido de la interfaz. Solo textos (más el `locale` de Mapbox): sin maquetación. No se tocaron nombres propios, títulos de eventos ni textos de la base, ni «Todos» como filtro de eventos, «Listo», «Destacados», «Nuevos», ni los rótulos de P10 (`selloDeTarjeta`: «Te interesa», «Hoy», «1 va», «N van»; «Quitar {texto}»; «Solo tú lo ves»), que ya eran neutros.

**Cómo se barrió.** Además de `git grep` de cada frase, se sacaron con el compilador de TypeScript todas las cadenas y textos de JSX de `src` (8 580, sin pruebas ni comentarios) y se buscaron ahí los artículos y adjetivos masculinos sobre personas: «los que», «todos los», «usuarios», «invitados», «amigos», «seguidores», «los demás», «el/un artista», «el administrador», «su autor», «él». Ese script no se sube: es un ayudante de una sola vez.

## Lo de la lista del punto 47, antes → después

| Pantalla | Antes | Después |
|---|---|---|
| Ajustes | «Invita a tus amigos» | «Invita a tus amistades» |
| Mi perfil (enlace al pie) y ficha pública de quien se ve a sí misma (aviso) | «Así te ven los demás» | «Así te ve la gente» |
| Alta de artista: campo, su nombre accesible y su error | «Nombre del artista o grupo» · «Escribe el nombre del artista o grupo.» | «Nombre de artista o grupo» · «Escribe el nombre de artista o grupo.» |
| Publicar evento, selector Quién (etiqueta del campo) | «Nombre del artista o grupo» · «Otro artista o grupo» | «Nombre de artista o grupo» · «Otra persona o grupo» |
| Botón «+» de la barra, «Entra para…» y lista de Artistas vacía | «Registrar un artista» · «Entra para registrar un artista» | «Registrar artista» · «Entra para registrar artista» |
| Buscar (campo y su nombre accesible) | «Buscar un evento, lugar o artista» | «Buscar evento, lugar o artista» |
| Borrado de un artista | «Artista borrado» · «Ver los artistas» · «Registrar otro artista» | «Ficha de artista borrada» · «Ver artistas» · «Registrar otra ficha de artista» |
| Lista de Artistas sin fichas | «Aún no hay artistas registrados en {ciudad}. … Regístralo.» · «Todavía no hay artistas de {x} registrados.» · «Todavía no hay artistas registrados.» | «Aún no hay fichas de artista registradas en {ciudad}. … Registra la ficha.» · «Todavía no hay fichas de artista registradas en {x}.» · «Todavía no hay fichas de artista registradas.» |
| Hoja de ciudad de Artistas, sin resultado | «Registra un artista en otra ciudad y aparecerá aquí.» | «Registra una ficha de artista en otra ciudad y aparecerá aquí.» |
| Siguiendo sin sesión (Agenda con «Solo lo que sigo») | «Aquí verás lo que pasa en los lugares y con los artistas que sigues. Entra para seguir a los tuyos.» | «Aquí verás lo que pasa en lugares y con artistas que sigues. Entra para seguir a quienes te importan.» |
| Novedades sin sesión | «Aquí verás lo nuevo en los lugares y artistas que sigas, … Entra para seguir a los tuyos.» | «Aquí verás lo nuevo en lugares y artistas que sigas, … Entra para seguir a quienes te importan.» |
| Reglas | «un artista con nombre» · «un lugar, un artista o una persona que no eres» · «a petición del artista o del lugar» | «un nombre de artista» · «un lugar, una ficha de artista o una persona que no eres tú» · «a petición de quien lleva la ficha» |
| Ayuda (seguir) | «la ficha de un lugar o un artista» | «la ficha de un lugar o de artista» |
| Altas: artista, lugar y hoja «¿Dónde es?» | «Ya está registrado:» · «no está registrado.» · «Ese artista ya está registrado.» · «Ábrelo y, si es tuyo, dilo ahí.» | «Ya tiene ficha:» · «no tiene ficha.» · «Ese nombre ya tiene ficha.» · «Ábrela y, si es tuya, dilo ahí.» |
| Administración, bloque del CAPO | «Artistas invitados» · «Todos los artistas invitados ya tenían una cuenta vinculada.» | «Fichas invitadas» · «Todas las fichas invitadas ya tenían una cuenta vinculada.» |
| Hoja de enlaces (aviso de lo que no se reconoce) | «No parece un enlace, un @usuario ni un teléfono.» | «No parece un enlace, un @perfil ni un teléfono.» |
| Carril de Inicio | «Artistas destacados» | «Artistas destacadxs» |
| Mapa de Lugares y mapa de «¿Dónde es?» (nombres accesibles, medidos en el navegador) | «Map» · «Toggle attribution» · «Mapbox homepage» | «Mapa» · «Mostrar atribución» · «Página de Mapbox» |

**Lo que el encargo daba por hecho y ya no está.** «Nadie lo sigue todavía · 1 persona lo sigue · N personas lo siguen»: no existe en la app. P6 lo cambió por el número de la tarjeta «Siguen» de la ficha (ya neutra y la del prototipo firmado); solo lo citaban dos comentarios (`lugares/acciones.ts` y su prueba), que ahora dicen «número de «Siguen»». Por eso las capturas de las fichas de artista y de lugar no cambian. «Seguidores», «Interesadxs», «Solo los que sigo» y «Ficha reclamada por el artista» tampoco estaban ya (P5 y P6 pusieron «Siguen», «Interesan» y «Solo lo que sigo»), y Artistas no tiene «Solo a quienes sigo». «Buscar un artista» (el campo de la lista) lo reemplazó Buscar único: el campo que queda es el de arriba. **La elección de «Otra persona o grupo»:** es la etiqueta del campo de texto del selector Quién; el encargo pedía «Otra persona o grupo» para el selector y «Otro nombre de artista o grupo» para un campo suelto. Como es el selector, va la primera.

## Lo que salió del barrido y cambié (masculino genérico)

| Dónde | Antes | Después |
|---|---|---|
| Ayuda, Reglas (título), aviso de «Reportar» (2), «Solicitud enviada» (ficha de artista con correo ligado), «te escribe» tras «Soy yo / es mi grupo» y tras «¿Llevas tú…?», ayuda del campo de imagen por dirección | «el administrador» / «El administrador» / «al administrador» | «la administración» / «La administración» / «a la administración» (la Privacidad ya decía «la administración») |
| Fichas ocultas de artista, lugar y evento | «solo la ven su autor, su cuenta ligada y el administrador» (evento: «solo lo ven su autor y el administrador») | artista: «solo la ven quien la publicó, su cuenta ligada y la administración»; lugar: «solo lo ven quien lo publicó, su cuenta ligada y la administración»; evento: «solo lo ven quien lo publicó y la administración» |
| Ficha de lugar que no se puede borrar | «avisa al administrador» | «avisa a la administración» |
| Ayuda (publicar un evento) | «la fecha, el lugar y los artistas por ti» | «la fecha, el lugar y quién se presenta por ti» |
| Privacidad | «Parte de los artistas y lugares se trajeron del Catálogo…» | «Parte de las fichas de artistas y lugares se trajeron del Catálogo…» |
| Siguiendo con sesión y ficha pública de otra persona | «Todavía no sigues ningún lugar ni artista» · «Todavía no sigue ningún lugar ni artista» | «Todavía no sigues lugares ni artistas» · «Todavía no sigue lugares ni artistas» |
| Novedades sin sesión, Novedades con sesión pero sin seguir nada, y descripción de Inicio | «lo nuevo en los lugares y artistas» · «un lugar o artista» · «y los lugares y artistas de tu ciudad» | «lo nuevo en lugares y artistas» · «un lugar o de artista» · «y lugares y artistas de tu ciudad» |
| Alta de artista, nombre repetido (aviso bajo el campo, nombre accesible del panel, errores del servidor) | «Ya hay uno con este nombre:» · «Nombre ya registrado» · «Ya hay un artista con ese nombre.» · «Ya hay otro artista con ese nombre en {ciudad}.» | «Ya tiene ficha:» · «Nombre que ya tiene ficha» · «Ya hay una ficha con ese nombre.» · «Ya hay otra ficha con ese nombre en {ciudad}.» |
| Selector Quién (lista de resultados y nota) | «Artistas encontrados» · «Escribe dos letras y te sugerimos los que ya están registrados. Si no está, lo creamos con el nombre.» | «Fichas de artista encontradas» · «Escribe dos letras y te sugerimos las fichas que ya existen. Si no hay, la creamos con el nombre.» |
| Administración, bloque del CAPO (resto) | «Sin cuenta vinculada al invitarlos» · «De esos {n}» · «Un artista cuenta una vez… Invitado significa…» | «…al invitarlas» · «De esas {n}» · «Cada ficha cuenta una vez… Invitada significa…» |
| Administración, filtros de Artistas sin resultado | «Ningún artista destacado ahora.» · «Todos los artistas tienen foto.» · «Ningún artista oculto.» | «Ninguna ficha de artista destacada ahora.» · «Todas las fichas de artista tienen foto.» · «Ninguna ficha de artista oculta.» |
| Administración, lo que dice el reclamo de una ficha | «Dice que es él o su grupo y quiere llevar la ficha» · «…y pide que se quite» | «Dice que es esa persona o su grupo y quiere llevar la ficha» · «…y pide que se quite» |
| Administración aviso al teléfono | «Se publicó un artista nuevo» | «Se publicó una ficha de artista nueva» |
| Administración, error al pasar una ficha | «no cambió de autor» | «no cambió de autoría» |
| App de iPhone (`Info.plist`, permiso de la cámara; se ve en la próxima compilación) | «…para tu perfil, un lugar, un artista o un evento.» | «…para tu perfil, un lugar, una ficha de artista o un evento.» |
| Comentarios y notas que citaban lo viejo | «Ya está registrado», «no está registrado», «Artistas destacados», «N personas lo siguen», `@usuario` (en «un @usuario») | «Ya tiene ficha», «no tiene ficha», «Artistas destacadxs», «número de «Siguen»», `@perfil`: `FormularioCanon.module.css`, `buscarLugares.ts`, `Inicio`, `CarrilEntidadCliente`, `cargarArtistasDestacados` (y su prueba), `enlaces.ts`, `SelectorEnlaces`, `HojaDonde`, `FormularioLugar`, `formulario.ts` |
| Informe del importador de agendas (`scripts/instituciones/importar-eventos.ts`, solo lo lee quien lo corre) | ««…» no está registrado (o se parece a varios)» | ««…» no tiene ficha (o se parece a varios)» |

Pruebas que cambiaron con su texto: `armazon`, `entrar`, `formulario`, `avisos` y `reportes` (una a tres líneas cada una), el título de la de `cargarArtistasDestacados` y un comentario de `acciones.seguir`. Ninguna prueba nueva.

## No lo toqué

- **El prompt que lee los carteles** (`lib/cartel.ts`: «Nombres de los artistas, grupos o compañías…»): lo lee un modelo, no una persona.
- **La plantilla de invitación del CAPO** (`scripts/capo/invitacion.md`): ya es neutra («tu ficha», «hacerla tuya»). Ningún correo ya enviado ni la base.
- **El generador del prototipo** (`scripts/ops/auditoria-ui/prototipo/generar.py`): sigue diciendo «Buscar un evento, lugar o artista» porque es la fuente del prototipo firmado. Es la única línea que queda con esa frase (ver dudas).
- **«1 artista», «N artistas»** (número y sustantivo, sin artículo), **«Mis artistas»**, **«Ver lugares»**, **«Ver los lugares»** de Borrado (un lugar no es una persona), **«Seleccionados para ti»** y **«Destacados»** (hablan de eventos), **«Nadie con «…»»**.
- **Los controles de Mapbox que la app no pone** (zoom, brújula, pantalla completa, ubicación, gestos): no traen texto que traducir. `locale` es un parche sobre la tabla de Mapbox: `TEXTOS_MAPBOX` (`lib/mapa.ts`, lo comparten los dos mapas) trae las tres cadenas que sí se ven, y está tipado (`satisfies MapOptions["locale"]`): una clave mal escrita no compila (comprobado a propósito).

## Dudas para el founder

1. **El puesto en el panel de administración** (`RolPersona.tsx`, `lib/panel.ts` y sus pruebas en `panel.test.ts`): «Administrador» y «Usuario» como etiquetas del rol, «Hacer administrador», «Ya es administrador», «Es el único administrador», «sin administradores», «podrás hacerlo administrador». Lo dejé: nombra el puesto que se da (y «Usuario» no tiene un neutro claro; «Administración» ya es el nombre de la sección). Si lo quiere, propuesta: «Administración» y «Cuenta» como etiquetas, «Dar la administración» / «Quitar la administración» como acciones. Es una pieza chica aparte.
2. **«El administrador» → «la administración»** en lo que ve toda la gente (Ayuda, Reglas, Reportar, fichas ocultas). No estaba en la lista; salió del barrido. Si prefiere otra forma, son 14 líneas.
3. **«Buscar evento, lugar o artista»**: el prototipo firmado dice «Buscar un evento, lugar o artista». El «un» también marca a «artista», así que apliqué la regla. Si prefiere el del prototipo, es una línea (`BuscarPantalla.tsx`).
4. **Otras frases del panel de administración con concordancia masculina sobre fichas**, que no toqué: «Nadie nuevo en 7 días.», «Ninguno llevado por su gente», «Llevados por su gente» (filtro), «Destacados» / «Ocultos» de Artistas.
5. **A 320 px el número de «Interesan» del KPI de Perfil se corta** (la etiqueta mide 55 px en 46; es de P5, no de esta pieza). Anotado, sin tocar.

## Verificación

- **Conteo de `git grep -c -F` sobre `src`, `public`, `apps`, `scripts` y `supabase`** (antes = `HEAD` de la base, `340b26ec`; después = esta rama). Cada frase vieja queda en 0, salvo dos casos explicados abajo (el generador del prototipo y los comentarios de código con «administrador» y «autor»):

| Frase vieja | Antes | Después |
|---|---|---|
| «Invita a tus amigos» | 1 | 0 |
| «Así te ven los demás» | 3 | 0 |
| «Nombre del artista o grupo» | 3 | 0 |
| «Otro artista o grupo» | 1 | 0 |
| «Registrar un artista» | 3 | 0 |
| «Buscar un artista» | 0 | 0 |
| «Ver los artistas» | 1 | 0 |
| «Registra un artista» | 1 | 0 |
| «artistas registrados» | 2 | 0 |
| «Nadie lo sigue todavía» | 0 | 0 |
| «persona lo sigue» | 0 | 0 |
| «personas lo siguen» (dos comentarios) | 2 | 0 |
| «Entra para seguir a los tuyos» | 1 | 0 |
| «seguir a los tuyos» | 2 | 0 |
| «un artista con nombre» | 1 | 0 |
| «un lugar, un artista o una persona que no eres» | 1 | 0 |
| «a petición del artista o del lugar» | 1 | 0 |
| «la ficha de un lugar o un artista» | 1 | 0 |
| «Artista borrado» | 1 | 0 |
| «Ya está registrado» | 5 | 0 |
| «no está registrado» | 4 | 0 |
| «Ese artista ya está registrado» | 2 | 0 |
| «Artistas invitados» | 1 | 0 |
| «Todos los artistas invitados» | 1 | 0 |
| «un @usuario» | 3 | 0 |
| «Artistas destacados» | 7 | 0 |
| «Buscar un evento, lugar o artista» | 2 | **1** (el generador del prototipo, ver «No lo toqué») |
| «Registrar otro artista» | 1 | 0 |
| «Ya hay uno con este nombre» · «Ya hay un artista» · «Ya hay otro artista» | 1 · 1 · 1 | 0 · 0 · 0 |
| «Se publicó un artista» | 2 | 0 |
| «Dice que es él» | 5 | 0 |
| «Escribe el nombre del artista» | 1 | 0 |
| «Artistas encontrados» | 1 | 0 |
| «los que ya están registrados» | 1 | 0 |
| «Parte de los artistas» | 1 | 0 |
| «Nombre ya registrado» | 1 | 0 |
| «Todos los artistas tienen» · «Ningún artista» · «Un artista cuenta» | 1 · 2 · 1 | 0 · 0 · 0 |
| «los artistas que sigues» · «ningún lugar ni artista» · «Regístralo» · «un artista nuevo» | 1 · 2 · 1 · 2 | 0 · 0 · 0 · 0 |
| «el administrador» · «El administrador» · «al administrador» · «su autor» | 64 · 9 · 12 · 27 | 57 · 4 · 10 · 24 (**solo comentarios de código**: ver abajo) |

  Las cuatro últimas: `git grep -n -F -e 'el administrador' -e 'El administrador' -e 'al administrador' -e 'su autor' -- src scripts public apps | grep -v -E ':[0-9]+:\s*(//|\*|/\*|\{/\*|#)'` da 3 líneas (el título de una prueba, un comentario de CSS y uno de JSX), ninguna de la interfaz. Los textos del panel de administración con «administrador» (duda 1) no llevan «el administrador» pegado, por eso no cuentan aquí. «Toggle attribution» y «Mapbox homepage» no están en el repo: los pone la librería; se midieron en el navegador (abajo).
- **Verde:** `npm run lint` (0 avisos), `npm run typecheck`, `npm test` (119 archivos, 1 585 pruebas), `npm run build`, `npm run test:componentes` (111 de 111, con `CHROME_EXECUTABLE` el Chrome de la Mac), `npm run inventario` («sin novedades»: 2 bloques y 344 medidas, sin cambios) y `npm run medir` (23 pantallas × 4 anchos, 56 s, «sin novedades»).
- **Lo que `medir` no recorre** (Reglas, Ayuda, Privacidad, Novedades sin sesión, Siguiendo sin sesión, Borrado, Artistas sin danza, ficha pública propia, alta de artista con el aviso de repetido, hoja de ciudad y las altas de evento y de lugar; Perfil, Ajustes, Inicio y las altas ya estaban en `medir`) se midió con el mismo `medir.js` a 320, 390, 820 y 1280 px: 0 hijos fuera de la caja, 0 desplazamiento horizontal, 0 márgenes negativos y ningún texto nuevo cortado. Lo que aparece es de siempre y no cambia con esta pieza (no toca ningún control ni estilo, así que no se comparó con la base): «Atrás» a 320 px (bitácora 271), nombres de lugares recortados con puntos suspensivos, el panel de nombre repetido que tapa «Qué hace» a propósito, la hoja de ciudad que tapa la página, los controles de toque chico de siempre (el campo de archivo invisible del alta de artista, una excepción ya aceptada de `medir`; el enlace «Ver» de la línea de nombre repetido, de 20×21; y tres en la hoja de ciudad), y el «Interesan» de la duda 5.
- **Mapbox** (medido en Chrome con el respaldo inventado, los dos mapas): antes de esta pieza, lienzo «Map», ⓘ «Toggle attribution» (aria-label y title) y logotipo «Mapbox homepage»; ahora «Mapa», «Mostrar atribución» y «Página de Mapbox», y no hay ningún otro nombre dentro del mapa.
- **Píxeles, 390×844 a 2×, reloj fijo, respaldo inventado** (base = la compilación de `340b26ec`; después = esta rama): la ficha de artista sale **idéntica**; la de lugar difiere 143 píxeles (0,01 %: el borde del botón «···» y el icono de Instagram, ruido de dibujo, ningún texto). Las demás difieren solo en las cajas del texto que cambió (Perfil: 1 914 píxeles en el enlace del pie, y = 1341 a 1368; Ajustes: 1 263 en «Invita a tus amistades»; carril: 412 en la «x» de «destacadxs»; alta de artista: 2 863 en el campo; selector Quién: 11 960 en la etiqueta y la nota, y 3 126 en la etiqueta con un artista ya elegido). **Lo único que mueve algo:** Novedades sin sesión pasa de 2 a 3 líneas («importan.» solo en la última); el resto conserva su número de líneas (Reglas mide lo mismo, 780×2404).

## Capturas

`docs/rediseno/capturas-272/`, 28 PNG de paleta a 390×844 (2×; Reglas y Ayuda, página entera), reloj fijo y respaldo inventado (`scripts/ops/auditoria-ui/respaldo-local`; ningún `.env` ni producción). Las abrí una por una:

1. **`272-01-perfil-antes.png`:** Mi perfil de Ana Rentería, desplazado al final: «Voy 2 · Interesan 1 · Sigo 2», dos días de eventos y, al pie, el enlace morado «Así te ven los demás».
2. **`272-02-perfil-despues.png`:** igual, con el enlace «Así te ve la gente» (más corto; nada más se mueve).
3. **`272-03-ajustes-antes.png`:** Ajustes, sección «Somos Nosotros»: «Instalar la app», «Invita a tus amigos», «Avisar al salir del sitio», «Ayuda», «Aviso de privacidad», «Reglas de uso».
4. **`272-04-ajustes-despues.png`:** el segundo renglón dice «Invita a tus amistades»; cabe en una línea.
5. **`272-05-ficha-artista-igual-antes-y-despues.png`:** ficha de Aaron Cadena: tarjetas «Fechas Ninguna · Siguen 0 · Lugares 0»; idéntica antes y después (el «N personas lo siguen» ya no existe, ver arriba).
6. **`272-06-ficha-lugar-igual-antes-y-despues.png`:** ficha del Teatro de la Paz con «Distancia · Eventos 2 próximos · Siguen 1» y sus dos eventos; igual a la vista (143 píxeles de ruido).
7. **`272-07-alta-artista-antes.png`:** «Registrar artista», el campo con el marcador «Nombre del artista o grupo», «Qué hace», «Es», «Ciudad», «Foto», «Soy yo / es mi grupo», «Más», el botón «Publicar artista» apagado y «Falta el nombre.»
8. **`272-08-alta-artista-despues.png`:** el marcador dice «Nombre de artista o grupo»; el resto igual.
9. **`272-09-alta-artista-repetido-antes.png`:** con «Aaron Cadena» escrito, el panel flotante dice «Ya está registrado: Aaron Cadena · Fotografía · Solista. Ábrelo y, si es tuyo, dilo ahí.» y bajo el botón, «Ese artista ya está registrado.» (la consulta del respaldo se completó en el navegador con la ciudad, que el respaldo no manda).
10. **`272-10-alta-artista-repetido-despues.png`:** «Ya tiene ficha: Aaron Cadena · Fotografía · Solista. Ábrela y, si es tuya, dilo ahí.» y «Ese nombre ya tiene ficha.»; el panel sigue en dos líneas y del mismo alto.
11. **`272-11-reglas-antes.png`:** Reglas de uso entera: «un artista con nombre», «Hacerte pasar por un lugar, un artista o una persona que no eres.», «Qué hace el administrador» y «a petición del artista o del lugar».
12. **`272-12-reglas-despues.png`:** «un nombre de artista», «una ficha de artista o una persona que no eres tú», «Qué hace la administración» y «a petición de quien lleva la ficha»; el mismo número de líneas y la misma altura.
13. **`272-13-inicio-carril-antes.png`:** Inicio desplazado: «Lugares con eventos» con tres círculos y «Artistas destacados · Ver artistas ›» con las tarjetas grandes de la Orquesta Sinfónica y de Pimpolina.
14. **`272-14-inicio-carril-despues.png`:** «Artistas destacadxs · Ver artistas ›»; cabe en la misma línea, sin cortarse.
15. **`272-15-novedades-sin-sesion-antes.png`:** Novedades sin cuenta: «Aquí verás lo nuevo en los lugares y artistas que sigas, y los cambios en lo que vas. Entra para seguir a los tuyos.» en dos líneas.
16. **`272-16-novedades-sin-sesion-despues.png`:** «… lugares y artistas que sigas … Entra para seguir a quienes te importan.», ahora en tres líneas.
17. **`272-17-siguiendo-sin-sesion-antes.png`:** Agenda con «Solo lo que sigo» y sin cuenta: «Siguiendo · Aquí verás lo que pasa en los lugares y con los artistas que sigues. Entra para seguir a los tuyos.» y el botón «Entrar».
18. **`272-18-siguiendo-sin-sesion-despues.png`:** «Aquí verás lo que pasa en lugares y con artistas que sigues. Entra para seguir a quienes te importan.», en dos líneas, y «Entrar».
19. **`272-19-borrado-artista-antes.png`:** «Artista borrado», «Ya no aparece en Artistas ni en los eventos donde se presentaba.», el botón «Ver los artistas» y el enlace «Registrar otro artista».
20. **`272-20-borrado-artista-despues.png`:** «Ficha de artista borrada», el mismo texto, «Ver artistas» y «Registrar otra ficha de artista» (cabe en una línea).
21. **`272-21-ficha-propia-despues.png`:** la ficha pública de Ana Rentería vista por ella: el aviso dice «Así te ve la gente.» (antes, «Así te ven los demás.»), «Va a 2 · Sigue 2».
22. **`272-22-ayuda-despues.png`:** Ayuda entera con «lo publican la administración y quienes se registran», «quién se presenta por ti», «La administración la revisa…», «la ficha de un lugar o de artista» y «La administración lo revisa».
23. **`272-23-artistas-sin-danza-despues.png`:** Artistas con el filtro «Danza» y sin fichas: «Todavía no hay fichas de artista registradas en danza.» (antes, «Todavía no hay artistas de danza registrados.»).
24. **`272-24-ciudad-otra-de-artistas-despues.png`:** la hoja «Dónde estás» de Artistas con «Otra ciudad» y «Zzz» escrito: «Nada con «Zzz». Registra una ficha de artista en otra ciudad y aparecerá aquí.» (antes, «Registra un artista en otra ciudad…»).
25. **`272-25-alta-evento-quien-antes.png`:** Publicar un evento con «Quién» abierto: la etiqueta «Nombre del artista o grupo», el campo con «Ej. Trío Xochitl» y la nota «Escribe dos letras y te sugerimos los que ya están registrados. Si no está, lo creamos con el nombre.» (dos líneas).
26. **`272-26-alta-evento-quien-despues.png`:** la etiqueta «Nombre de artista o grupo» y la nota «Escribe dos letras y te sugerimos las fichas que ya existen. Si no hay, la creamos con el nombre.» (también dos líneas); el resto no se mueve.
27. **`272-27-alta-evento-quien-elegido-antes.png`:** con «Pimpolina» ya elegida (el chip «Pimpolina · nuevo» y «Quién: Pimpolina»), la etiqueta del campo dice «Otro artista o grupo».
28. **`272-28-alta-evento-quien-elegido-despues.png`:** la etiqueta dice «Otra persona o grupo»; igual de larga en una línea y nada más cambia.

## Archivos

Sin migraciones ni variables de entorno. **Nuevos:** esta bitácora y `docs/rediseno/capturas-272/` (28 PNG, 1,0 MB). **Modificados (texto, más `lib/mapa.ts` y las dos líneas de `Mapa` y `MapaDondeEs`):** 54 archivos de `src`, `apps/ios/ios/App/App/Info.plist` y `scripts/instituciones/importar-eventos.ts`, más `docs/ops/OPEN_LOOPS.md`. **Sin tocar:** el doc 50, la base de datos, los correos ya enviados.
