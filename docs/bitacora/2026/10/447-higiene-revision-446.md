# 447 · Higiene tras la revisión de la semana: guarda de `.env`, asistentes inventados en el grafo, `npm audit`, fuera «Pronto» y letreros sin «ficha» (OL-415)

**Fecha:** 2026-10-19. **Rama:** `higiene-revision-446`, base `main` (`0a857d1f`). **Operador:** agente de la pieza (Claude Opus 5.5), sin otros
agentes. **Sin migración** y sin variables de entorno nuevas. **Estado:** lista para la revisión del gestor y el «publica» del founder.

## El pedido

El founder dio «Adelante» (2026-10-19) a la pieza de higiene que el gestor le propuso tras la revisión de la semana (bitácora
[446](446-revision-semana-12-18-oct.md), «Propuesta de cola», punto 1): «guarda de .env en dos scripts de captura, datos inventados en el
prototipo del grafo, actualización de dependencias, quitar el "Pronto" y los letreros con "ficha"». Antecedente suyo del 14 de octubre sobre la
palabra ficha: «no se entiende ficha puede decir: Ver más información».

## 1. La guarda de `.env` en dos scripts de captura

`scripts/ops/auditoria-ui/capturar-cartel-leido.mjs` (bitácora 444) y `capturar-persona-publicado.mjs` (bitácora 445) compilan la app con
`next build` en la raíz que reciben; con un `.env` ahí, cargarían llaves reales en un servidor local y pisarían `.next`. Ahora, en cuanto saben la
raíz y antes de importar, compilar o arrancar nada, se niegan con la misma línea que `maqueta-pantalla.mjs:26` (mismo mensaje,
`process.exit(1)`), y su cabecera dice «Correrlo en un árbol SIN `.env`: con él, `next build` carga llaves reales (si lo encuentra, se niega a
correr)». Comprobado con una carpeta del espacio temporal que solo tiene un `.env` vacío: los dos salen con 1 y el mensaje, sin crear la carpeta
de salida. Nunca se copió ni se enlazó un `.env` al árbol.

## 2. Asistentes inventados en el prototipo `grafo-3d.html`

El `DATOS` del prototipo (línea 162) se leyó de producción el 13 de octubre. Lugares, artistas, eventos y sus líneas públicas (artista→lugar,
«tocan juntos», «mismo festival») son públicos y **se quedan idénticos**. Todo lo que viene de personas **ahora es inventado**, con un generador
determinista (mulberry32, semilla fija 4150450):

- **Eventos posibles:** los que se reconstruyen de lo público (cada lugar y día de `lugares[].d`, con los artistas de las líneas artista→lugar de
  ese día; los de sitio libre, por los días de «tocan juntos»), dentro de 4 km del centro, **quitando todo evento al que alguien dijo Voy o Me
  interesa en los datos reales** (cualquier lugar y día, o artista y día, de las líneas de personas de antes).
- **Asistentes:** 14 (antes 13); a cada uno, un número de asistencias con la forma de una escena real (uno muy activo, tres medianos, el resto con
  una a tres) y unos seguimientos al azar; cada asistencia elige un evento posible con una popularidad inventada de cola larga (así hay
  coincidencias entre asistentes). El tramo de actividad sale con la misma regla que la app (`tramoDe` de `src/lib/grafo.ts`); la posición, como
  en la app: el promedio de sus eventos más un desvío al azar, debajo de los lugares.
- **Líneas de personas** (`pl`, `pa`, `pp`) con su peso y los días de cada evento, armadas como `src/lib/grafo.ts`; los contadores
  `asistentes` de cada lugar y artista son la suma de esas líneas.
- **Seguimientos por nodo** (`seguidores`): el total de cada grupo (lugares; artistas con lugar, solo en sitio libre y sin conexión) se movió
  entre −15 % y +15 % y se repartió al azar entre sus miembros.
- **El resumen:** `personas` 13 → 14, `personasQueSiguen` 40 → 42, `asistencias` 67 → 63, `seguimientos` 262 → 271, `aristas` 419 → 390 (las
  de personas: 36 → 42 hacia lugares, 84 → 49 hacia artistas, 15 → 15 entre asistentes). Lo demás (69 lugares, 663 artistas, 336 eventos, 10
  festivales…) no cambia.
- Junto a `extraido`, la clave `"personasInventadas": true`; al principio del archivo, un comentario HTML que dice que desde esta pieza los
  asistentes son inventados y qué sigue siendo real. Los textos del prototipo lo dicen también: la leyenda («Asistente · inventado, de
  ejemplo»), la tarjeta del asistente («Asistente inventado · de ejemplo»), el filtro «Asistentes» («inventados; en la app, quienes dijeron Voy o
  Me interesa»), la nota de Ajustes («Lugares, artistas y 336 eventos reales…; asistentes, 271 seguimientos y 63 asistencias inventados») y el
  comentario del estilo.

**Comprobado** (un script de comparación sobre la versión anterior y la nueva): lugares y artistas iguales salvo `seguidores` y `asistentes`;
líneas públicas iguales; **0** líneas de personas iguales a una de antes; **0** pares (lugar, día) o (artista, día) de asistencia que coincidan con
los reales; **0** posiciones de asistente repetidas; la única cadena nueva en `DATOS` es la clave `personasInventadas`. **Nombres:** la versión
anterior nunca llevó nombres de personas (cada asistente era solo `x`, `y`, `z`, `tramo` e `inventada`; la app los llama «Asistente anónimo N»);
los únicos nombres del archivo son los de lugares y artistas, públicos, y siguen siendo los mismos. El generador y el comparador viven en el
espacio temporal del operador y no van al repositorio: necesitan la versión anterior como entrada.

**El historial de git conserva la versión anterior** (los commits de OL-393 y OL-405, PR #503 y siguientes, desde `0607c361`). Sustituir el
archivo no la borra; **si se reescribe el historial lo decide el founder** (por confirmar; bitácora 446, «Decisiones que necesita el founder»).

El prototipo sigue abriendo y pintando (Chrome real con playwright-core, sin errores en consola): antes «745 nodos · 419 conexiones · 69 lugares
· 663 artistas · 13 asistentes», después «746 nodos · 390 conexiones · 69 lugares · 663 artistas · 14 asistentes»; igual de poblado.

## 3. `npm audit fix`

- **Antes** (`npm audit --omit=dev`): 3 vulnerabilidades (2 moderadas, 1 alta): `source-map-js` 1.2.1 (alta, solo al compilar) y `fflate`
  0.7.3 que trae `satori` (moderada, cuenta dos: `fflate` y `satori`).
- **`npm audit fix` sin `--force`** solo tocó `package-lock.json` (`package.json` igual): `source-map-js` 1.2.1 → 1.2.2; `brace-expansion`
  5.0.9 → 5.0.12 y 1.1.18 → 1.1.21 (desarrollo); `eslint-config-next` y `@next/eslint-plugin-next` 16.3.8 → 16.4.2 (desarrollo); y
  `satori` 0.35.1 → 0.35.2.
- **`satori` 0.35.2 rompía los carteles:** su ESM usa `__dirname` y **512 pruebas** de `carteles/` (cartel, «Tu año», el PDF) fallaban con
  `ReferenceError: __dirname is not defined`; en producción serían las rutas que dibujan imágenes. **La devolví a 0.35.1** a mano en
  `package-lock.json` (versión, `resolved` e `integrity` de antes) y `npm ci`; con eso, las 4 021 pruebas en verde. No sube nada que
  `satori` 0.35.1 no tuviera.
- **Después** (`npm audit --omit=dev`):

  ```
  fflate  0.7.0 - 0.7.4
  Severity: moderate
  fflate unzipSync can enter an infinite loop when parsing malformed ZIP64 archives - https://github.com/advisories/GHSA-px8p-9vwx-vf98
  fix available via `npm audit fix --force`
  Will install satori@0.32.0, which is a breaking change
  node_modules/fflate
    satori  >=0.33.0
    Depends on vulnerable versions of fflate
    node_modules/satori

  2 moderate severity vulnerabilities
  ```

  Queda solo `fflate` vía `satori`: la app no abre ZIP (es `unzipSync`), y arreglarlo pide bajar `satori` a 0.32.0, un cambio que rompe.
- **Con las de desarrollo** (`npm audit`): de 12 (3 moderadas, 7 altas, 2 críticas) a 10 (3 moderadas, 5 altas, 2 críticas). Las que quedan son
  de herramientas que no llegan a producción: `tinypool` y `@vitest/mocker` (piden `vitest` 5, que rompe), `braces` vía `fast-glob` en
  `eslint-config-next` (`--force` lo bajaría a la 14) y `fflate`. No las toqué (por confirmar si se abre una pieza para `vitest` 5).

## 4. Fuera el «Pronto» de la hoja de Presentación

`src/components/DocumentoPdf.tsx`: la hoja de «Presentación» (artista) ya no trae el renglón apagado «Preparar una reseña · Pronto», que prometía
algo que no existe. Fuera también sus estilos `.renglon` y `.pronto` de `DocumentoPdf.module.css` (no los usaba nadie más) y su mención en los
comentarios de los dos archivos; el de cabecera del componente dice que se quitó y que la reseña con IA sigue siendo una pieza futura (no se
implementó). El resto de la hoja queda igual: la ayuda, «Periodo» en el informe del lugar, «Carta / A4» y «Descargar PDF» (que comparte en el
teléfono). `FormularioNovedad.tsx` («Pronto avisaremos…») no se tocó.

## 5. Letreros sin la palabra «ficha»

| Dónde | Antes | Ahora (por confirmar) |
| --- | --- | --- |
| `src/components/HojaDonde.tsx:690` (la hoja del punto de un lugar, al tocar uno registrado) | «X» ya existe cerca de aquí. **Ver ficha** | … **Ver más información** |
| `src/app/obra/[id]/mando/Mando.tsx:740` (el pincel, lejos del lugar) | **Ver ficha** | **Ver más información** |
| `src/app/lugares/FichaHoja.tsx:75` (la ficha de la hoja de Lugares que no se pudo traer) | No se pudo abrir la ficha aquí. **Abrir la ficha completa** | … **Ver más información** |
| `src/app/nuevo/lugar/PasosLugar.tsx:122` (el nombre, en el alta de lugar) | **Ya tiene ficha · Ir a su ficha** / **Ya lo tienes guardado · Ir a su ficha** | **Ya está publicado · Verlo** / **Ya lo tienes guardado · Verlo** |
| `src/app/nuevo/lugar/PasosLugar.tsx:322` («¿Es este?» en el mapa) | A 40 m hay un lugar con ficha: X. **Ir a su ficha** | … **Verlo** |
| `src/app/nuevo/artista/PasosArtista.tsx:87` (el nombre, en el alta de artista) | **Ya tiene ficha · Ir a su ficha** / **Ya tiene ficha en Querétaro · Ir a su ficha** | **Ya está publicado · Verlo** / **Ya está publicado en Querétaro · Verlo** |

Se actualizaron los comentarios que citaban esos letreros (`PasosLugar`, `PasosArtista`, `AltaLugar.tsx`, `AltaArtista.tsx`, sus `.module.css`,
`nuevo/lugar/page.tsx`, `sitios/acciones.ts`, `useArtistasConNombre.ts`) y las pruebas (ver Evidencia). Dos frases de al lado conservan la
palabra porque el encargo no las incluía: «No se pudo abrir la ficha aquí.» y «A 40 m hay un lugar con ficha: X.» (por confirmar; están en la
lista de abajo).

### Los demás textos con «ficha» (sin cambiar, para que decida el founder)

`grep -rn 'ficha' src --include='*.tsx'` da 729 renglones, casi todos comentarios, clases (`ficha.cuerpo`) y nombres. Para quedarme solo con lo
que se ve, leí las cadenas, plantillas y textos JSX de cada `.tsx` con el analizador de TypeScript y quité clases, selectores, claves y avisos de
consola: **76 textos en 35 archivos**, por archivo y línea:

- `src/app/admin/CapoComoVa.tsx`: 12 «Fichas invitadas»; 23 «Todas las fichas invitadas ya tenían una cuenta vinculada. No hay fichas nuevas…»; 26 «Cada ficha cuenta una vez…»; 28 «Una cuenta se vincula a una ficha por varios caminos…»; 29 «… fichas recibieron una solicitud a mano…»; 30 «Solo se cuentan fichas y vínculos que siguen registrados, incluidas las fichas ocultas…».
- `src/app/admin/Pendientes.tsx`: 105 «La ficha ya no existe».
- `src/app/admin/[seccion]/MenuFicha.tsx`: 59 «Ver la ficha».
- `src/app/admin/page.tsx`: 60 «No pudimos leer las fichas vinculadas.».
- `src/app/admin/personas/[id]/RolPersona.tsx`: 70 «Atender reportes y reclamos, y pasar fichas a otras cuentas».
- `src/app/admin/personas/[id]/page.tsx`: 123 «Ninguna ficha»; 158 «Ver su ficha pública».
- `src/app/ajustes/bloqueados/page.tsx`: 23 «No has bloqueado a nadie. Desde la ficha de una persona, el menú «···» tiene la opción Bloquear.».
- `src/app/ajustes/page.tsx`: 51 «Tu ficha»; 107 «Pendientes, indicadores, personas y fichas».
- `src/app/artistas/FormularioArtista.tsx`: 210 «Ya tiene ficha:»; 219 (etiqueta) «Nombre que ya tiene ficha»; 224 «Ya tiene ficha:».
- `src/app/artistas/LetreroCorreoLigado.tsx`: 48 «Listo: ya gestionas la ficha de «…»»; 61 «Puedes reclamar su ficha aquí mismo y empezar a gestionarla.»; 63 «Reclamar ficha».
- `src/app/artistas/[id]/EsMiNombre.tsx`: 89 «Esta ficha se tomó del … y está por confirmar…» y «Esta ficha la registró otra persona…»; 92 «Sí, quiero llevar yo la ficha».
- `src/app/artistas/[id]/editar/page.tsx`: 36 «Volver a la ficha».
- `src/app/artistas/[id]/novedades/[novedadId]/editar/page.tsx`: 50 «Volver a la ficha»; 59 (aviso) «Se quita de tu ficha.».
- `src/app/artistas/[id]/novedades/nueva/page.tsx`: 38 «Volver a la ficha».
- `src/app/artistas/[id]/page.tsx`: 286 «Se borra la ficha; sus fechas próximas, si tiene, se quedan sin artista.»; 334 (que) «la ficha»; 369 «Esta ficha se creó con solo el nombre.»; 374 «No se pudo borrar. ¿Sigues con sesión y es tu ficha?»; 379 «Esta ficha está oculta: solo la ven…»; 393 «Compartir la ficha de …».
- `src/app/ayuda/page.tsx`: 35 «¿Cómo reclamo mi ficha de artista?»; 36 «Si ya existe una ficha con tu nombre…»; 39 «En la ficha de un lugar o de artista, toca «Seguir»…»; 45 «En la ficha del lugar, evento, artista o perfil…».
- `src/app/borrado/page.tsx`: 16 «Ficha de artista borrada» y «Registrar otra ficha de artista».
- `src/app/eventos/SelectorQuien.tsx`: 129 (aria-label) «Fichas de artista encontradas»; 157 «Escribe dos letras y te sugerimos las fichas que ya existen…».
- `src/app/eventos/[id]/cartel/CreadorCartel.tsx`: 290 «Se verá en la agenda y en la ficha, y reemplaza la imagen que tenga.».
- `src/app/lugares/FichaHoja.tsx`: 49 (aria-label) «Ficha de …»; 51 (aria-label) «Subir o bajar la ficha»; 52 (aria-label) «Cerrar la ficha»; 55 (aria-label) «Bajar la ficha»; 75 «No se pudo abrir la ficha aquí.».
- `src/app/lugares/[id]/EsMiEspacio.tsx`: 61 «Esta ficha se tomó del … y está por confirmar…»; 62 «Esta ficha la registró otra persona…»; 65 «Sí, quiero llevar yo la ficha».
- `src/app/novedades/page.tsx`: 41 «Todavía no sigues nada. En la ficha de un lugar o de artista toca Seguir…».
- `src/app/nuevo/artista/Publicado.tsx`: 61 «Las fichas sin foto no salen en destacados.».
- `src/app/nuevo/artista/Revisa.tsx`: 64 «Ya tiene ficha en …:»; 85 (detalle) «Podrás editar la ficha y publicar sus fechas».
- `src/app/nuevo/evento/PasosDonde.tsx`: 290 «Tendrá su ficha y servirá para otros eventos».
- `src/app/nuevo/evento/Publicado.tsx`: 90 «¿Sus presentaciones tienen ficha propia?»; 91 «Puedes agregar actividades después; la ficha dice cuántas lleva.».
- `src/app/nuevo/lugar/PasosLugar.tsx`: 320 «A … m hay un lugar con ficha: …».
- `src/app/perfil/MisArtistas.tsx`: 48 «Compartir la ficha de …».
- `src/app/perfil/ReservaPerfil.tsx`: 42 «Tu ficha y tu nombre en “quién va” se ven»; 55 «Tu ficha muestra solo nombre, foto y colonia…».
- `src/app/privacidad/page.tsx`: 44 «… contactarte si reclamas una ficha…»; 47 «Fichas tomadas de catálogos públicos»; 49 «Parte de las fichas de artistas y lugares se trajeron del Catálogo…».
- `src/app/reglas/page.tsx`: 31 «Hacerte pasar por un lugar, una ficha de artista o una persona que no eres tú.»; 36 «Puede editar, ocultar o borrar cualquier ficha o evento…»; 37 «… responde a quien reclama una ficha.»; 38 «Las fichas tomadas del Catálogo de Artistas Potosinos se retiran a petición de quien lleva la ficha…».
- `src/components/AgendaInicio.tsx`: 218 «Todavía no sigues lugares ni artistas. En su ficha, toca Seguir…».
- `src/components/HojaDonde.tsx`: 732 ««…» no tiene ficha.».
- `src/components/ListaArtistas.tsx`: 189 «Aún no hay fichas de artista registradas en … ¿Eres artista o grupo, o conoces a alguien? Registra la ficha.»; 203 «Todavía no hay fichas de artista registradas (en …).».
- `src/components/ui/CompartirFicha.tsx`: 79 «Cualquiera con el enlace ve esta ficha.».

Los `.ts` (por ejemplo los textos de error de las acciones) no entran en esta lista: el encargo pedía los `.tsx`.

## Evidencia

- `npm run lint` (0 errores; 1 aviso que ya estaba en `main`: `VisorImagen.componentes.test.mjs:173`, comprobado con el `eslint` del checkout
  principal), `npm run typecheck`, `npm test` (228 archivos, 4 021 pruebas), `npm run inventario` (sin novedades: medidas en duro 334, lo
  quitado del CSS solo usaba tokens) y `npm run medir` (41 pantallas × 4 anchos, sin novedades; la hoja del PDF no está en `medir`, así que ningún presupuesto cambió) en el árbol, **sin `.env`**. El `next build` completo corre dentro de
  `medir` y del guion de capturas, contra el respaldo local.
- **Pruebas de componentes** (`npm run test:componentes`, Chrome real), las que tocan esta pieza:
  - `src/components/DocumentoPdf.componentes.test.mjs` (**nueva**, 2): en la hoja del artista y en la del lugar no hay «Pronto» ni «Preparar una
    reseña» ni nada apagado; están la ayuda, «Carta / A4», «Periodo» (solo el lugar: «Octubre · 2026 · Todo») y «Descargar PDF». Corrida contra
    el componente de antes, la del artista falla con el renglón «Preparar una reseña… Pronto»: la prueba no es vacía.
  - `src/components/HojaDonde.componentes.test.mjs` (10, **1 nueva**): en la hoja de un lugar, tocar «Teatro de la Paz» en la lista avisa
    «ya existe cerca de aquí» con «Ver más información» hacia `/lugares/…`, y ya no «Ver ficha».
  - `src/app/lugares/HojaLugares.componentes.test.mjs` (17, **1 nueva**, con `?fallo` en su banco): la ficha que no se pudo traer lo dice con
    «Ver más información» hacia `/lugares/l1`, y ya no «Abrir la ficha completa».
  - `src/app/nuevo/lugar/AltaLugar.componentes.test.mjs` y `src/app/nuevo/artista/AltaArtista.componentes.test.mjs` (38): los letreros nuevos
    («Ya está publicado · Verlo», «Ya está publicado en Querétaro · Verlo», el enlace «Verlo» de «¿Es este?» con su `href` y el ligado desde un
    sitio).
  - `src/lib/pincel.test.ts`: solo el título de la prueba de los textos del pincel («Ver más información»).
- **Capturas** en `docs/rediseno/capturas-447/`, PNG sin comprimir, Chrome real con playwright-core. Cada una abierta y mirada:
  - `grafo-antes-390.png` y `grafo-antes-1280.png`: el prototipo con los datos de antes. A 390, la nube en «Mapa» con lugares violeta, artistas
    blancos y 13 asistentes naranja debajo del centro; la leyenda «Asistente · anónimo, posición inventada». A 1280, las tres columnas: lentes y
    filtros a la izquierda, la nube al centro y el diagnóstico con la lista «Todo · 227» a la derecha («Asistente anónimo 11 · actividad alta»…).
  - `grafo-despues-390.png` y `grafo-despues-1280.png`: los datos inventados. Igual de poblado: la misma nube de lugares y artistas, 14 puntos
    naranja repartidos bajo el centro con sus líneas, la leyenda «Asistente · inventado, de ejemplo», la cabecera «746 nodos · 390 conexiones ·
    … · 14 asistentes»; a 1280 el diagnóstico es el mismo (es de lugares y artistas) y la lista «Todo · 228» cambia de orden por los seguidores y
    asistentes nuevos. Sin errores en la consola en ninguna.
  - Las cuatro de la app son de la app compilada contra el respaldo local (datos inventados), con el reloj fijo del miércoles 7 de octubre de 2026
    a las 10:00, a 390×844 a 2× (guion en el espacio temporal del operador, con la misma guarda de `.env`):
  - `hoja-presentacion-390.png`: la ficha de Feleal como la cuenta de administración del respaldo, con «Trayectoria» abierta y la hoja
    «Presentación» encima: la ayuda («Tus fechas en Somos Nosotrxs, tu reseña y tus redes, listas para enviar: 1 página.»), «Carta | A4» y
    «Descargar PDF» abajo. **Sin el renglón «Preparar una reseña · Pronto».**
  - `hoja-informe-390.png`: la ficha de ACHE Galería con la hoja «Informe de actividad»: la ayuda, «Periodo» con «Octubre | 2026 | Todo»,
    «Carta | A4» y «Descargar PDF». Igual que antes (el informe nunca tuvo el renglón).
  - `alta-lugar-ya-publicado-390.png`: «Registrar un lugar» › «¿Cómo se llama?» con «Teatro de la» escrito y, bajo el campo, el renglón «Teatro
    de la Paz / **Ya está publicado · Verlo**» (enlace a `/lugares/teatro-de-la-paz`); «Siguiente» y la tira Evento · Lugar · Artista abajo.
  - `alta-artista-ya-publicado-390.png`: «Registrar artista» › «¿Cómo se llama?» con «Fele» y el renglón «Feleal / **Ya está publicado ·
    Verlo**» (enlace a `/artistas/feleal`).

## Por confirmar (founder)

1. **Los letreros nuevos:** «Ver más información» (tres sitios), «Ya está publicado · Verlo», «Ya lo tienes guardado · Verlo», «Ya está
   publicado en {ciudad} · Verlo» y «Verlo» en «¿Es este?». «Ya está publicado» para un artista dice «publicado» en masculino (como «el
   artista»); si se prefiere otra forma, es un cambio de una línea.
2. **Las dos frases de al lado que conservan «ficha»** («No se pudo abrir la ficha aquí.», «A 40 m hay un lugar con ficha: X.») y **los 76
   textos de la lista**: cuáles cambian y por qué palabra.
3. **El historial de git del prototipo del grafo:** la versión con los datos de antes sigue en los commits de OL-393 y OL-405; reescribirlo o
   aceptar el riesgo bajo lo decide el founder.
4. **Las vulnerabilidades de desarrollo** que piden cambios que rompen (`vitest` 5, `eslint-config-next`): ¿una pieza aparte?

## Para el gestor

- La línea de coautoría de los commits es la del modelo que de verdad hizo la pieza (`Claude Opus 5.5`), no la de Fable 5.1 que pedía el
  encargo: lo dice la instrucción de atribución de esta sesión.
- `satori` se quedó en 0.35.1 a propósito (ver § 3); un `npm audit fix` futuro volverá a subirlo a 0.35.2 mientras esa versión siga rota.
