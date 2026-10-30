# 526 · OL-494 · Portada de Administración más simple (código de la variante C firmada)

**Fecha:** 2026-10-29. **Rama:** `admin-portada` (desde `origin/main` `3f4b51d1` + `origin/admin-simple` `d85815e3`, el prototipo de la
bitácora 525). **Quién:** operador del Gestor de cambios VII (agente en árbol aislado, sin subagentes). **Migración:**
`20261029270000_panel_comparado.sql` (solo reemplaza `panel_resumen()` con la misma firma). **Sin variables de entorno nuevas.**

## El pedido

El founder firmó el 2026-10-29 la **variante C** del prototipo OL-493 (bitácora 525) y aceptó: dos números por fila (cuatro en una fila desde
tableta); el cuarto es «Eventos esta semana»; «Avisos abiertos» pasa a la hoja «Todos los números»; «Personas nuevas» y «Eventos de la
comunidad» llevan «▲ N más» frente a la semana anterior (cambio chico en la base); Obras colectivas en Herramientas; Showcase en Difusión; el
interruptor de Rutinas se muda a Corridas; si Instagram deja de publicar, sube a «Pendiente» en rojo. Misión: al abrir, una sola pregunta
(«¿qué tengo que atender hoy?»); lo demás a un toque, con palabras de todos los días.

## Lo que se hizo

**Portada** (`src/app/admin/page.tsx`), en el orden firmado y con los textos de la bitácora 525:

1. **Pendiente**, como hoy y lo único en rojo. Nuevo: «Instagram dejó de publicar» arriba de todo cuando el último trabajo de Instagram de la
   cola (`redes_trabajos`) terminó en `fallido`, con la causa en llano y en rojo, y lleva a Administración › Instagram. Con el error `permiso`
   después de la última conexión: «La conexión caducó el mié 7 de oct: reconecta» (si se reconectó después del fallo, ya no sale). Con otro
   error: «No salió «título»: Instagram no aceptó la imagen» (los motivos de `motivoLlano`). Un evento que ya había empezado (`empezo`) no sube:
   no es que Instagram dejara de publicar (pregunta 2). Suma 1 al rótulo.
2. **Esta semana en números**: «Comparado con la semana anterior» y cuatro cuadros (`indicadoresPortada`): Personas nuevas · cuentas nuevas,
   de 80 · ▲ 2 más; Eventos de la comunidad · publicados por gente que no es de administración · ▲ 1 más; Voy y Me interesa · de 12 personas ·
   ▲ 5 más; Eventos esta semana · en 18 de 71 lugares · ▲ 2 más. Cada cuadro abre su desglose, como hoy (los dos nuevos con «… en los 7 días
   anteriores» y su lista). Dos por fila en el teléfono; desde 768 px los cuatro en una fila (`.enSemana`, con `grid-auto-flow: dense`: al abrir
   el primero, los otros tres siguen en su fila y el desglose va debajo, entero). Después, «Ver todos los números ›».
3. **Gestionar**: Personas, Lugares, Eventos y Artistas, como hoy. Artistas ya no dice las invitaciones del CAPO («los KPIs de CAPO ya no
   aplican»): esa medición vive en «Campañas pasadas».
4. **Difusión**: Instagram («@smsnstrsapp · 4 publicadas esta semana · 5 sin material»: tres datos en vez de seis; lo publicado en 7 días y
   las fichas con fecha que se quedan fuera de la semana por falta de material en la ciudad de la sesión) y Showcase («Artistas para presentar a
   foros · 16 candidatos · 2 invitados»; `GrupoShowcase` pasa a `RenglonShowcase`, solo el renglón).
5. **Herramientas**: Ciudades («4 abiertas · 3 detectadas · 1 oculta»), Rutinas («Completar fichas: apagada · 192,29 USD de crédito», lleva a
   Corridas), Grafo cultural («Mapa en 3D de lugares, artistas y público») y Obras colectivas («Pintar juntos sobre una pared proyectada»). Iconos
   convencionales: personas, pin, calendario, estrella, Instagram, destello, mira, reloj, grafo y pincel.

La portada ya no lee el embudo, las fichas, el CAPO ni los avisos al entrar, ni la lista de sugerencias de Instagram (`cargarResumenInstagram`
la pedía entera para contar): el renglón de Instagram sale de tres lecturas chicas (`src/app/admin/portada.ts`). Las líneas de estado y el
pendiente son funciones puras en `src/lib/portadaAdmin.ts`; lo que no se pudo leer no se escribe (nunca un cero inventado).

**Hoja «Todos los números»** (`TodosLosNumeros.tsx` + `numerosEnHoja.tsx`): «Toca un número para ver qué cuenta y de dónde sale», Últimos 7
días con **los siete indicadores** de hoy y su línea de tendencia (Personas activas, Coincidencias, Agenda de la semana, Publica la comunidad,
Voy y Me interesa, Primera publicación y Avisos abiertos), Cómo va la comunidad, Fichas y **Campañas pasadas** (el CAPO con su medición entera,
`CapoComoVa` tal cual, y la nota «Invitaciones por correo a las fichas del catálogo del CAPO. Ya no se mandan; su medición se queda»). Se arma
en el servidor al abrirla (acción con la sesión, como la ficha en la hoja de Lugares) y se guarda mientras la portada está en pantalla. El
encargo pedía los siete; el prototipo C quitaba de la hoja los dos que ya están en la portada: van los siete (pregunta 3). Si un bloque falla,
la causa en su sitio y «Intentar de nuevo» abajo; si falla todo, «No pudimos leer los números» con su botón.

**El historial:** abrirla deja una entrada propia (marca `somosnosotrosNumeros` en `history.state`, añadida con el toque, como la capa del mapa de
una ficha); el Atrás del sistema la cierra sin salir de Administración y la ✕, el velo y Escape consumen esa entrada. Si se vuelve a ella (desde
la lista de un desglose, o al recargar) la hoja se abre. No uso `useMemoriaPantalla` para recordar que estaba abierta: con la memoria por URL,
volver a /admin desde la barra de abajo la abriría sola; la entrada del historial es exactamente «vuelvo a donde estaba».

**Base** (`20261029270000_panel_comparado.sql`): `panel_resumen()` igual que antes más la llave `comparado` — `personas_nuevas_antes` (cuentas
de hace 14 a 7 días, sin administración, con el rol de entonces) y `comunidad` / `comunidad_antes` (eventos visibles que publicó la comunidad
en 7 días y en los 7 anteriores). El cuadro «Eventos de la comunidad» usa `comparado.comunidad` y no `ahora.comunidad_nuevos`: este solo cuenta
los que aún no pasan, y comparar así castiga a la semana anterior. Sin la migración aplicada, `comparado` no llega y los dos cuadros salen sin
«▲» y con lo de siempre (el código puede ir antes que la migración). «Eventos esta semana» ya se compara con la foto diaria de hace una semana.
SECURITY DEFINER con `search_path = ''`, el candado del rol dentro y los permisos explícitos (revoke de PUBLIC y anon; authenticated y
service_role).

**Rutinas → Corridas** (`corridas/page.tsx`): arriba, rótulo «Rutinas» con el mismo `InterruptorFichas` (y su línea de la semana); debajo,
«Crédito». Desde la portada se entra con `?desde=admin`: el Atrás dice «Administración» y los filtros lo conservan; desde Ciudades, como antes.
La acción del interruptor revalida también `/admin/corridas`.

**Respaldo local:** `panel_resumen` trae `comparado` (1, 3, 2); con `RESPALDO_INSTAGRAM_FALLO=permiso|imagen` el último trabajo de Instagram
falló hace media hora. `medir` suma la pantalla `s45a-admin-numeros` (la hoja abierta, paso `admin-numeros`).

## Comprobaciones

- `npm run lint`: 0 errores (2 avisos que ya estaban, en archivos que no toqué). `npm run typecheck`: limpio.
- `npm test`: 316 archivos, 5105 pruebas, todas pasan (nuevas: `src/lib/portadaAdmin.test.ts`, 8; en `panel.test.ts`, «Esta semana en
  números» con 5 y la de Artistas sin invitaciones).
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: 128 migraciones, 3011 pruebas, 0 fallaron (nueva:
  `supabase/tests/pg/panel-comparado.test.mjs`: qué cuenta cada semana, que un evento pasado cuenta y uno oculto o de la administración no, el
  rol de entonces, que lo de antes sigue, anon y una cuenta sin administración rechazadas, DEFINER con path vacío y sin PUBLIC; la regla general
  del Advisor pasa sobre 211 funciones).
- `npm run test:componentes`: 793 pruebas, todas pasan (nueva: `TodosLosNumeros.componentes.test.mjs`, 4, con toques reales: dos por fila a 390
  y el desglose bajo su fila; cuatro en una fila a 768 con el desglose a todo lo ancho; la hoja pedida una sola vez, Atrás y la ✕; el fallo y
  «Intentar de nuevo»).
- `npm run inventario`: sin novedades.
- `npm run medir`: 63 pantallas × 4 anchos, **sin novedades**, tras anotar a mano solo lo mío en `medidas.aceptadas.json`: `s45-admin-portada`
  baja de 233/269 a **143/179** nodos (la portada sin el embudo, las fichas, el CAPO, siete cuadros ni seis rótulos); `s35-admin-corridas` sube de
  86/122 a 96/132 (el rótulo y el interruptor); `s45a-admin-numeros`, nueva, 255/291. Sin cortados, desbordes ni toques menores de 44 px.

## Recorrido con toques reales (`capturas-526/recorrido.txt`): 21 de 21, sin errores de página ni de consola

`scripts/ops/auditoria-ui/capturar-admin-portada.mjs` (Chrome real, `tap`): abrir Administración → tocar «Voy y Me interesa» (abre su desglose)
→ otra vez (se cierra) → «Ver todos los números ›» (la hoja: 9 cuadros, 5 líneas de tendencia) → Atrás del navegador (se cierra, sigue en
/admin) → abrirla y cerrar con la ✕ → abrirla y tocar el velo → abrirla, abrir «Personas activas», «Ver las personas ›», Atrás (vuelve con la
hoja abierta), Atrás (se cierra en /admin) → «Rutinas» (Corridas con el interruptor arriba y «Atrás (Administración)») → 320, 430 y 768 sin
desplazamiento a lo ancho ni toques chicos; a 768 los cuatro en una fila también con un desglose abierto → con el último trabajo caído,
«Instagram dejó de publicar · La conexión caducó el mié 7 de oct: reconecta» en rojo (`rgb(179, 38, 30)`) y el toque lleva a Instagram.
Medidas (`capturas-526/medidas.json`): 5 rótulos; a 390, **2,0 pantallas de alto** (antes 3,7), 2,2 a 320, 1,9 a 430, 1,4 a 768.

## Capturas (`docs/rediseno/capturas-526/`, 390 × 844 a 2× salvo donde se dice; cada una abierta)

- `01-portada`: Pendiente 25 (las cuatro bandejas de siempre), «Esta semana en números · Comparado con la semana anterior», los cuatro cuadros
  dos por fila con su «▲», y «Ver todos los números ›».
- `01b-portada-medio`, `01c-portada-fin`: Gestionar (Artistas «19 llevados por su gente · 4 ocultos»), Difusión (Instagram y Showcase) y
  Herramientas (Ciudades, Rutinas «Completar fichas: apagada · 192,29 USD de crédito», Grafo cultural, Obras colectivas). `01d-portada-entera`: la
  página entera de una vez.
- `02-portada-desglose`: «Voy y Me interesa» con su borde violeta y el desglose bajo su fila («11 Voy · 7 Me interesa · 13 en los 7 días
  anteriores», «Ver las personas ›»).
- `03-hoja-numeros`: la hoja: la nota, «Últimos 7 días» con los siete (cuatro con tendencia, Avisos abiertos solo en la última fila).
  `03b-hoja-comunidad-fichas`: el embudo y Fichas (27 vinculadas, 214 con foto). `03c-hoja-campanas-pasadas`: «Campañas pasadas» con su nota,
  120 invitadas, 116 sin cuenta, 5 vinculadas (4.3 %) y «Cómo se cuenta».
- `04-corridas-desde-rutinas`: Corridas: «Rutinas» con «Completar fichas» y su palanca arriba, «Crédito» con 192,29 y 7,71, y las corridas.
- `05-portada-320`: los cuatro cuadros enteros (la frase de la comunidad en tres renglones, «Eventos esta semana» en dos); nada se sale.
- `06-portada-430`: holgado; la frase de la comunidad en dos renglones.
- `07-portada-768` (768 × 1024): los cuatro en una sola fila. `07b-portada-768-desglose`: «Personas nuevas» abierto, los otros tres en su fila y
  el desglose debajo, a todo lo ancho. `07c-hoja-768`: la hoja con los siete, dos por fila.
- `08-pendiente-instagram`: Pendiente 26: «Instagram dejó de publicar» arriba, «La conexión caducó el mié 7 de oct: reconecta» en rojo, y después
  las bandejas. `09-pendiente-instagram-imagen`: con otro error, «No salió «Master Class - 9° Festival de Cine UASLP»: Instagram no aceptó la
  imagen».

## Lo que no toqué

`src/app/admin/instagram/**`, `src/components/instagram/**` y `src/lib/instagram/**` (OL-495): solo importo `zonaDeCiudad`, `lunesDeLaSemana` y
`CUENTA_INSTAGRAM`. Las fichas públicas y la edición de ficha (OL-491). `cargarResumenInstagram` y `resumenDeLaPortada` quedan sin uso en la
portada; no los borro porque viven en la carpeta de Instagram.

## Para publicar

Aplicar la migración `20261029270000_panel_comparado.sql` (solo reemplaza una función). El código funciona antes y después: sin ella, los dos
cuadros nuevos salen sin comparación.

## Preguntas al founder (frases llanas)

1. «Eventos de la comunidad» cuenta lo que la gente publicó en los últimos 7 días, ya haya pasado o no, para compararlo parejo con la semana
   anterior. Antes el número solo contaba lo que aún no pasa. ¿Te late así?
2. Si una publicación de Instagram no sale porque el evento ya había empezado, no la subo a Pendiente como «Instagram dejó de publicar»
   (Instagram sí funciona). Las demás causas (conexión caducada, imagen rechazada, el tope de 100 al día, texto largo, Instagram sin responder)
   sí suben. ¿De acuerdo?
3. En «Todos los números» puse los siete números de siempre, también los dos que ya están en la portada (Voy y Me interesa, y la agenda), para
   que la hoja tenga todo junto. ¿Los dejamos o quitamos los repetidos, como en el prototipo?
4. En Artistas quité «N invitaciones» (eran del CAPO, que ya no aplica); esa medición sigue en «Campañas pasadas». ¿Bien?
