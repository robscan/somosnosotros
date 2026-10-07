# 346 · Alta de artista por pasos

**Pieza:** OL-316. **Rama:** `artista-por-pasos` (sobre `origin/main` `ed27fc51`). **Fecha:** 2026-10-06. **Operador:** Claude Opus 5.5 (agente del gestor IV).
**Estado:** hecho y probado con los componentes reales (Chrome), con la app compilada contra el respaldo local y en el simulador de iPhone (Safari, teclado en pantalla); falta el iPhone real. Sin migraciones.

## Qué se encargó

Construir el alta de artista del prototipo firmado `docs/rediseno/prototipos/lugar-artista-por-pasos.html` (casos 5 a 7; acta en la bitácora 342, decisiones 1, 5 y 6) con el patrón del alta de lugar (OL-315, bitácora 343): ruta `/nuevo/artista`, el 308 desde `/nuevo?tipo=artista`, `/nuevo` deja de ser una pantalla, `FormularioArtista` solo edita y nada de lo que la gente tenía en el alta se pierde.

## Qué hay

- **Ruta `/nuevo/artista`** (`src/app/nuevo/artista/`: `page.tsx`, `AltaArtista.tsx`, `pasos.ts`, `PasosArtista.tsx`, `Revisa.tsx`, `Publicado.tsx`, `useArtistasConNombre.ts`, su CSS). Pide sesión y vuelve a la misma dirección; acepta `?ciudad=` (la de Artistas: la del artista de entrada y la de los enlaces de la tira) y `?nombre=` (lo que se buscó en Buscar). `page.tsx` trae de una vez las subcategorías ya usadas de cada disciplina (`subcategorias_de`, una consulta por disciplina, juntas). El armazón es `PorPasos` y el camino un reductor puro (`pasos.ts`, con pruebas), como el lugar.
  1. **¿Cómo se llama?** Campo con lupa, ✕ y contador; con 3 letras, una lista flotante con los artistas del directorio cuyo nombre lo contiene (`artistas_con_nombre`, como el formulario de siempre): «Ya tiene ficha · Ir a su ficha», o «Ya tiene ficha en Querétaro · Ir a su ficha» si es de otra ciudad (allí el mismo nombre es otro artista). Al pie, bajo «Siguiente» / «Falta el nombre», la tira EVENTO · LUGAR · ARTISTA con «Artista» marcado. Del nombre se deducen la disciplina y si es grupo (`deducirDisciplina`, `deducirTipoArtista`, los de siempre) y, nuevo, la subcategoría cuando el nombre la dice entera (`deducirSubcategoria`: «Compañía de Teatro La Rendija» → «Compañía de teatro»).
  2. **¿Qué hace?** solo si el nombre no lo dijo: las ocho disciplinas como `ui/Opcion` compacta con el icono de etiqueta; elegir avanza.
  3. **¿Qué tipo de teatro?** solo tras elegir la disciplina (decisión 5): la línea «Teatro · así se verá en el directorio y en sus filtros.», chips con las subcategorías ya usadas, las más usadas primero (a lo más ocho), «Otra…» (campo con ✕ y el tope de 40; si ya hay una parecida, «Ya hay N artistas con «…». Usar esa») y «Seguir sin especificar» quieto al pie. Un chip avanza a «Revisa»; lo escrito, con «Siguiente» o Intro. En «Otro» (y en una disciplina sin subcategorías conocidas) el campo ya está abierto y la pregunta es «¿Qué hace, en pocas palabras?».
  4. **Revisa:** el nombre de título y renglones sin etiqueta (`Dato`): qué hace · subcategoría (etiqueta; «Cambiar» vuelve a «¿Qué hace?» y de ahí a su tipo), solista, grupo o colectivo (persona o personas; si el nombre no lo dijo, el renglón está punteado «Falta si es solista o grupo» y el botón lo dice; «Poner» abre una hoja con las tres opciones, un toque elige y cierra), la ciudad (bandera, «Cambiar» abre `HojaCiudad`), la casilla `ui/Casilla` «Soy yo» / «Es mi grupo» («Soy yo / es mi grupo» mientras no se sepa) con «Podrás editar la ficha y publicar sus fechas», y «Foto, portada, redes o descripción» punteado. «Publicar artista» o lo que falta. Si ya hay una ficha con ese nombre en esa ciudad (la lista o el servidor), un aviso con su enlace y el botón dice «Ese nombre ya tiene ficha»; cambiar la ciudad lo quita.
  5. **Publicado:** sello, «Artista publicado», la tarjeta de las listas (`RenglonArtista`), una sugerencia en punteado y, en el pie, «Compartir» (el texto de la ficha, ahora `compartirArtista` en `lib/artistas.ts`) y «Publicar otro». Sin foto, «Agrega una foto · Las fichas sin foto no salen en destacados» con «Agregar foto», que abre la cámara o el carrete: la foto se sube y se guarda en la ficha recién publicada sin salir (con `actualizarArtista`, la acción de editar, con todos los datos tal cual) y la sugerencia pasa a «¿Tiene una fecha próxima? · Publicar una fecha» (→ `/nuevo/evento?artista=<id>`), que es la que sale de entrada si ya tenía foto.
- **Lo opcional** (`mas`, «¿Quieres agregar algo?»): la foto redonda y la portada 3:2 en miniatura del mismo alto, cada una con «Poner…» / «Cambiar…» y su ✕; la descripción con su tope; enlaces y redes; y, para la administración, la dirección de la foto y de la portada. «Listo» vuelve a «Revisa», que dice lo que se agregó («Foto, portada, descripción y 1 red»).
- **Acción** (`src/app/artistas/acciones.ts`): `crearArtista` lee `quedarse` y devuelve `{ id, slug, volver }` en vez de ir a la ficha (sin él, como siempre); «Soy yo» sigue ligando la cuenta.
- **`/nuevo` ya no es una pantalla:** se retiran `src/app/nuevo/page.tsx`, `Alta.tsx` y `Alta.module.css`. `redireccionDeNuevo` siempre da una dirección y el proxy responde 308 siempre: `tipo=artista` → `/nuevo/artista` con ciudad y nombre (comprobado con `curl -sI` sobre `next start`: `308`, `location: /nuevo/artista?ciudad=queretaro&nombre=Los+Vecinos`), `tipo=lugar` → `/nuevo/lugar`, lo demás → `/nuevo/evento`. `enlaceAltaArtista` nuevo; `enlaceDeAlta("artista")` (el «+» de Artistas, Buscar, borrar una ficha) y `enlaceAltaDeTipo("artista")` (la tira del evento y la del lugar) van a `/nuevo/artista`. Entrar: `/nuevo/artista` dice «Entra para registrar artista» y vuelve a Artistas.
- **`TiraTipos`** queda solo con enlaces entre las tres altas por pasos (sola en el evento; dentro del pie en el lugar y el artista); solo cambian sus comentarios.
- **`FormularioArtista` solo edita** (como `FormularioLugar`): el artista es obligatorio; salen `nombreInicial`, `autoFocus`, `oculta`, la palanca «Soy yo / es mi grupo» (es del alta) y la deducción desde el nombre (al editar se cambia a mano); el nombre lleva un lápiz. Una ficha por completar se guarda como está.
- **CSS compartido, no copiado:** la sugerencia punteada de «Publicado» pasa de `AltaLugar.module.css` a `evento/Publicado.module.css` (la usan el lugar y el artista) y el nombre en color de acción de «Ya tiene ficha» a `ui/Sugerencia` (`conFicha`). El lugar se ve igual.
- **Respaldo local** (`scripts/ops/auditoria-ui/respaldo-local/fixture.mjs`): `artistas_con_nombre` devuelve la ciudad (como la base) y `subcategorias_de` se calcula con los artistas del respaldo.

## Lo que la gente ya tenía en el alta de siempre, y dónde sigue

| Salida del `FormularioArtista` de alta | En el alta por pasos |
| --- | --- |
| Nombre con ✕ y contador | «¿Cómo se llama?» |
| «Ya tiene ficha» al escribir (aviso flotante y la línea «Ya tiene ficha: … Ver») | Lista bajo el nombre («Ir a su ficha») |
| No publicar un nombre repetido en la misma ciudad («Ese nombre ya tiene ficha.») | «Revisa» (aviso con enlace y botón) |
| «Ábrela y, si es tuya, dilo ahí» | El aviso de «Revisa» |
| Qué hace deducido del nombre | Igual; si no, «¿Qué hace?» |
| Chips de disciplina y su ✕ (dos pasos) | «¿Qué hace?» y Atrás / «Cambiar» |
| Subcategorías ya usadas (`subcategorias_de`), «Otra…», «Usar esa» y el tope de 40 | «¿Qué tipo de …?» |
| Es: solista, grupo o colectivo deducido o con chips | Igual; si no, la hoja de «Revisa» (ya no «Solista» por omisión) |
| Ciudad (la de Artistas) y su hoja | «Revisa» y `HojaCiudad` |
| Foto con la cámara y su ✕ | «Foto, portada, redes o descripción» |
| Portada con la cámara y su ✕ | Ídem |
| «Soy yo / es mi grupo» (palanca) | Casilla en «Revisa» con su consecuencia |
| Más: redes y descripción (tope 600) | «Foto, portada, redes o descripción» |
| Administración: dirección de la foto y de la portada | Mismo paso, solo para la administración |
| Errores del servidor junto a su dato y el general; «Ya hay una ficha con ese nombre» | «Revisa» |
| `?nombre=` (Buscar) y `?ciudad=` | Arranque del alta |
| Guardia «¿Salir sin publicar?» y aviso al recargar | `PorPasos` |
| Tira Evento · Lugar · Artista y la ✕ a Artistas (en su ciudad) | Pie del primer paso y barra |
| Tras publicar: la ficha con «Publicado · Compartir / Completar» | «Publicado» con «Compartir» y la sugerencia; la ficha sigue igual para quien la edita |

El letrero «Tu correo está enlazado a…» (OL-177) vive en Artistas, no en el alta: no se toca.

## Decisiones del operador (dentro de lo encargado, dichas explícitamente)

1. **Con pista en el nombre no se pregunta la subcategoría.** El prototipo firmado, en el caso 5, enseña «¿Qué tipo de teatro?» tras «Compañía de Teatro La Rendija»; el acta (decisión 5: «Con pista en el nombre no se pregunta nada») y el encargo dicen lo contrario. Seguí el acta y el encargo. Para no perder la subcategoría en ese caso, el nombre la deduce cuando la dice entera (`deducirSubcategoria`); si no, «Revisa» la deja sin ella y «Cambiar» la pregunta.
2. **A lo más ocho subcategorías a la vista** (`SUBCATEGORIAS_A_LA_VISTA`), las más usadas: caben a 320 sin empujar el pie; las otras (hasta 40) siguen sirviendo para «Usar esa» en «Otra…». Se piden en el servidor (`page.tsx`), ocho consultas juntas, para que el paso las tenga al llegar.
3. **«Otro» y una disciplina sin subcategorías conocidas** abren el campo directo, como el formulario de siempre; en «Otro» la pregunta es «¿Qué hace, en pocas palabras?» («¿Qué tipo de otro?» no se lee).
4. **La ciudad:** la de `?ciudad=`; sin ella, San Luis Potosí, como hoy. El perfil no guarda ciudad (no hay «la del perfil»); el renglón está siempre a la vista en «Revisa», así que nada sale sin leerse. Icono de bandera, el de la ciudad en el alta de lugar (el prototipo dibuja un edificio que la app no tiene).
5. **La casilla:** «Soy yo» si es solista, «Es mi grupo» si es grupo o colectivo, «Soy yo / es mi grupo» mientras no se sepa.
6. **Repetido:** igual que el formulario de siempre (mismo nombre, misma ciudad, no se publica), pero el aviso va en «Revisa» y no en el nombre, porque la ciudad se cambia ahí. La lista del nombre enseña lo que contiene lo escrito (a partir de 3 letras), como el prototipo.
7. **«Agregar foto» en «Publicado» abre directamente la cámara o el carrete** (la hoja del sistema): una hoja propia sería un toque más. Se guarda con `actualizarArtista` (la de editar, con todos los datos tal cual); no hace falta una acción nueva. Si falla, «No se pudo guardar la foto. Intenta de nuevo.».
8. **Portada en miniatura 3:2 del alto de la foto,** no a todo el ancho: vacía, un recuadro gris de 3:2 a todo lo ancho llenaba media pantalla para nada.
9. **`/nuevo` sin tipo sigue yendo al alta de evento** (como hoy: el encargo menciona «`/nuevo` sin tipo que hoy caen en el artista», pero hoy caen en el evento). `src/app/nuevo/page.tsx` se retira: el 308 lo da solo el proxy, que corre antes de cualquier ruta.
10. **La hoja de solista, grupo o colectivo no lleva «Listo»:** un toque elige y cierra (como «¿Qué tipo de lugar es?»).
11. **«Publicado» lleva de título «Registrar artista»,** como el lugar («Registrar un lugar»); el prototipo deja la barra sin título.

## Pruebas

- `npm run lint`: 0 errores (el aviso de siempre en `VisorImagen.componentes.test.mjs`). `npm run typecheck`: verde.
- `npm test`: **157 archivos, 2328 pruebas, en verde**. Nuevas: `nuevo/artista/pasos.test.ts` (10: casos 5 y 6, «Otra…» y «Seguir sin especificar», la subcategoría del nombre, lo elegido a mano, el nombre de entrada, «Cambiar» desde «Revisa», lo que falta y el repetido, lo opcional y «Publicado», el avance), `deducirSubcategoria` y `compartirArtista` en `lib/artistas.test.ts`, `crearArtista` con `quedarse` y «Soy yo» (`acciones.alta.test.ts`), `/nuevo/artista` en `nuevo/page.test.ts` (sin sesión, arranque y ciudad, subcategorías), el 308 del artista en `proxy.test.ts`, `enlaceAltaArtista`, `redireccionDeNuevo` y la tira en `lib/armazon.test.ts`, Entrar en `lib/entrar.test.ts`.
- Componentes (Playwright, Chrome de la Mac): **`AltaArtista.componentes.test.mjs` nuevo, 14 pruebas**: primer paso con la tira y la ✕ del campo; caso 5 hasta «Publicado» con lo que recibe la acción y «Compartir»; caso 6 con las ocho disciplinas, «¿Qué tipo de teatro?», el renglón por completar, el botón apagado y la hoja; ocho chips, «Otra…» con ✕, tope y «Usar esa»; «Otro»; caso 7 («Ya tiene ficha», y en otra ciudad); repetido y cambiar de ciudad; foto, portada, descripción y red; lo de la administración; «Agregar foto» en «Publicado»; errores del servidor y la guardia; nombre y ciudad de entrada; la guardia; todo a 320. `FormularioArtista.componentes.test.mjs` pasa a probar editar (3). `TiraTipos`, `AltaLugar` y `AltaEvento` con los enlaces nuevos. `npm run test:componentes` completo: **473 de 473 en verde**.
- `npm run inventario`: sin novedades.
- `npm run medir`: **29 pantallas × 4 anchos, sin novedades** tras anotar: `s11-alta-artista` es ahora `/nuevo/artista` (18/18/52/52 nodos, profundidad 6; antes 60 y 9) y nueva `s20-alta-artista-revisa` (sin pista, Teatro, sin especificar: 36/36/70/70, 7). Teclado de s11 en los dos modos: el campo y «Falta el nombre» enteros sobre el teclado.
- App compilada (`next build && next start -p 3104` contra el respaldo local): 308 con `curl -sI` (`/nuevo?tipo=artista…` → `/nuevo/artista?ciudad=queretaro&nombre=Los+Vecinos`; `/nuevo` → `/nuevo/evento`; `/nuevo?tipo=lugar` → `/nuevo/lugar`) y el recorrido entero en Chrome a 320 y 390 y en el simulador.

## Capturas (`docs/rediseno/capturas-346/`)

Del simulador iPhone 15 Pro (iOS 26.3, Safari, 393×852 a 3×, teclado en pantalla tecleado con toques), con la app compilada contra el respaldo local:

- `01-primer-paso-con-tira.png`: «Registrar artista» con la ✕, «¿Cómo se llama?», el campo vacío con su lupa; abajo «Falta el nombre» apagado y, en el mismo pie, EVENTO · LUGAR · ARTISTA con ARTISTA marcado.
- `02-nombre-con-teclado-ya-tiene-ficha.png`: «Pim» escrito con el teclado abierto: el campo con su ✕ a la vista, «Siguiente» y la tira sobre la barra del teclado, y la lista «Pimpolina · Ya tiene ficha · Ir a su ficha» abierta hacia arriba (abajo no cabe).
- `03-que-hace.png`: «¿Qué hace?» con Atrás y el avance en un cuarto; las ocho disciplinas con la etiqueta morada y su chevron.
- `04-que-tipo-de-teatro.png`: «¿Qué tipo de teatro?», «Teatro · así se verá en el directorio y en sus filtros.», los chips «Clown» (la única del respaldo) y «Otra…», y «Seguir sin especificar» quieto al pie.
- `05-otra-con-teclado.png`: tras «Otra…» (marcado), el campo «Ej. son huasteco, jazz» con el foco y el teclado abierto: el campo y «Seguir sin especificar» quedan a la vista sobre el teclado.
- `06-revisa-falta-solista-o-grupo.png`: «Revisa» con «Pim»: «Teatro · Cambiar», el renglón punteado «Falta si es solista o grupo · Poner», «San Luis Potosí · Cambiar», la casilla «Soy yo / es mi grupo · Podrás editar la ficha y publicar sus fechas», «Foto, portada, redes o descripción · Agregar» punteado claro y el botón apagado «Falta si es solista o grupo».
- `07-hoja-solista-grupo-colectivo.png`: la hoja «¿Es solista, grupo o colectivo?» con las tres opciones (persona, personas, personas) sobre «Revisa» oscurecida.
- `08-revisa-es-mi-grupo.png`: tras «Grupo»: el renglón «Grupo · Cambiar», la casilla marcada «Es mi grupo» en el tono del color de acción y «Publicar artista» encendido.
- `09-publicado.png`: el sello verde, «Artista publicado», la tarjeta «Pim · Teatro · Grupo» con el símbolo SN, «Agrega una foto · Las fichas sin foto no salen en destacados.» con «Agregar foto» (cámara) en punteado, «Compartir» y «Publicar otro».

Del Chrome de la Mac (2×, con la letra de la app), con la misma app compilada:

- `10-foto-portada-redes-390-chrome.png`: «¿Quieres agregar algo?»: la foto redonda vacía con «Poner una foto», la portada 3:2 en miniatura con «Poner una portada», «Descripción», redes y «Listo» abajo.
- `11-primer-paso-320-chrome.png`: el primer paso a 320, la tira entera bajo el botón.
- `12-que-hace-320-chrome.png`: las ocho disciplinas a 320, sin desbordes.
- `13-otra-320-chrome.png`: «¿Qué tipo de teatro?» a 320 con «Títeres de sombra» escrito en «Otra…» y su ✕; «Siguiente» y «Seguir sin especificar» en el pie.
- `14-revisa-320-chrome.png`: «Revisa» a 320: los renglones largos («Teatro · Títeres de sombra», «Falta si es solista o grupo») en dos líneas sin empujar «Cambiar» / «Poner».
- `15-hoja-solista-grupo-320-chrome.png`: la hoja de las tres opciones a 320.
- `16-publicado-320-chrome.png`: «Publicado» a 320 con «Títeres de sombra · Solista» en la tarjeta.

## Qué probar en el iPhone

Con Safari, la web instalada y TestFlight:

1. Artistas → «+»: «¿Cómo se llama?» con la tira abajo; al escribir, el teclado no tapa el campo, «Siguiente» ni la tira; la lista «Ya tiene ficha» con un nombre que exista.
2. Un nombre con pista («Ballet…», «Compañía de Teatro…»): «Siguiente» va directo a «Revisa» con todo puesto.
3. Un nombre sin pista: «¿Qué hace?» → «¿Qué tipo de …?» con las subcategorías de producción; «Otra…» con el teclado; «Seguir sin especificar».
4. «Revisa»: «Falta si es solista o grupo» y su hoja; la casilla; cambiar la ciudad; «Foto, portada, redes o descripción» con la cámara y el carrete.
5. Publicar: «Compartir»; «Agregar foto» desde «Publicado» (cámara o carrete) y que la ficha quede con la foto; después «Publicar una fecha» abre el evento con el artista puesto.
6. Desde Buscar sin resultados en Artistas («Registrar …»): el alta abre con el nombre.
7. Editar un artista: el formulario de siempre, sin «Soy yo».

## Para el gestor

- Sin migraciones ni variables de entorno.
- Vista previa de Vercel: la de la rama `artista-por-pasos` cuando el PR esté abierto.
- Hallazgo fuera de la pieza (ya anotado en la 343): la descripción (`ui/CampoLargo`) no tiene ✕ para limpiar en ninguna de las tres altas.
