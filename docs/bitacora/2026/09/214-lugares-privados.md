# 214 · Lugar privado como registro real, de cualquier cuenta, y un solo botón «Agregar» (OL-179)

**Fecha:** 2026-09-24 · **Rama:** `lugares-privados`, desde `origin/lugar-evento-pantalla-app` (OL-173, PR #212,
sin unir todavía).

## Qué pidió el founder

Sobre la hoja «¿Dónde es?» de OL-173, el 2026-09-24: «De acuerdo en tu recomendación de agregar lugar en radio de
150 m como el mismo. Con tu propuesta de modal "agregar lugar" y dentro de ese modal especificar si es lugar
privado podemos hacer que en el paso anterior solo mostremos un botón de agregar. Otra cosa es que si lo marca
como privado sí se guarda, pero como privado por si el usuario vuelve a organizar algo ahí, solo lo ve él.»

Tres decisiones, ya anotadas por el gestor en `OPEN_LOOPS.md` («2026-09-24 · Lugar del evento: 150 m, un solo
botón y lugar privado como registro»):

1. Al agregar, un lugar parecido a menos de 150 m es el mismo y se reutiliza sin preguntar (ya lo hacía OL-173).
2. Sin coincidencias, la barra muestra solo «Agregar «nombre»» (el mapa siempre se puede tocar; el aviso lo dice).
3. El lugar privado se guarda como lugar real con marca `privado`, visible solo para su autor y la administración,
   fuera de todo lo público, para reutilizarlo; el evento conserva su copia reservada del sitio.

## 1. Migración `supabase/migrations/20260925120000_lugares_privados_de_todos.sql`

Reemplaza las políticas de **alta** y **edición** de `lugares` (la de lectura no cambia):

- **Alta** (`"lugares: alta con sesión"`): antes `with check (creado_por = auth.uid() and (not privado or
  public.es_admin()))`; ahora `with check (creado_por = auth.uid())` — cualquier cuenta con sesión puede marcar
  privado su propio lugar al crearlo.
- **Edición**: el nombre real de esta política, desde `20260916120000_lugares_cuentas.sql` (reclamar lugares), es
  `"lugares: edita autor, ligado o admin"` (no `"lugares: edita autor o admin"`, que había dejado de existir tras
  esa migración) — se pisó al escribir la primera versión de esta pieza y el banco lo atajó de inmediato («policy
  … does not exist»). Antes `using (public.gestiona_lugar(id)) with check (public.gestiona_lugar(id) and (not
  privado or public.es_admin()))`; ahora `with check (public.gestiona_lugar(id))` — se quita solo la condición
  extra sobre `privado`; `gestiona_lugar()` (autor, cuenta ligada o administración) sigue igual, así que quien ya
  podía editar el lugar ahora también puede marcarlo privado.
- **Lectura**: sin cambios. Vigente desde `20260917093000_lectura_al_crear.sql`: `(visible and not privado) or
  creado_por = auth.uid() or public.es_admin() or public.gestiona_lugar(id)`.

**No se aplica**: la aplica el founder o el gestor local antes de publicar.

### Auditoría de las funciones que leen `public.lugares`

20 funciones (no ~18: contadas letra por letra, buscando la ÚLTIMA definición vigente de cada una entre las 60
migraciones, por si algún `create or replace` posterior la había cambiado). Ninguna necesitó `create or replace`
en esta pieza.

| Función | Para qué sirve | ¿Filtra `privado`? | Por qué |
|---|---|---|---|
| `avisos_evento_publico` | Payload público de un aviso push | Sí (`l.visible and not l.privado`) | Público |
| `cuenta_seguidores` | Cuántos siguen un lugar (ficha pública) | Sí, con excepción de quien lo gestiona | Público, con dueño exento |
| `tira_destacados` | Carril de destacados (`grant … to anon, authenticated`) | Sí (`l.visible and not l.privado`) | Público de verdad |
| `lugares_con_nombre` | Buscador del alta de lugar (deduplicar por nombre) | Sí | Público |
| `lugares_parecidos` | Deduplicar a 150 m al crear un lugar | Sí | Público; por eso `crearLugarDesdeEvento` con privado solo deduplica contra lugares públicos |
| `indicadores_ahora` | Números del panel de administración | Sí (`lugares_visibles`) | Admin, pero ya filtraba |
| `eventos_zona_del_lugar` | Trigger: zona del evento = zona de su lugar (por id) | No aplica | Lectura de una sola fila por id, sin listado |
| `lugares_zona_a_sus_eventos` | Trigger: al cambiar la zona de un lugar, ajusta sus eventos | No aplica | Ídem |
| `obras_colectivas_zona_del_lugar` | Trigger de Pincel, zona por id | No aplica | Ídem |
| `gestiona_lugar` | ¿Puedo editar este lugar? (autor/ligado/admin) | No aplica | Permiso por id, no lista nada |
| `lugares_generar_slug` | Mantenimiento: genera el slug de cada lugar | No aplica | Trabajo interno, `service_role` |
| `panel_lugares` | Panel de administración: gestión de lugares (**muestra** la columna `privado`) | No aplica (intencional) | `where public.es_admin()`, `grant … to authenticated` (nunca `anon`): es la propia administración viendo qué es privado, para gestionarlo |
| `panel_eventos` | Panel de administración: gestión de eventos | No aplica (intencional) | Ídem, solo el nombre del lugar |
| `panel_fichas_conteos` | Conteos del panel («todos», «privados», …) | No aplica (intencional) | Ídem; cuenta `lugares_privados` a propósito |
| `panel_destacados` | Panel de administración: elegir destacados | No aplica (indirecto) | Ídem; usa `tira_destacados` por dentro, que ya filtra |
| `panel_pendientes` | Panel de administración: reportes sin atender | No aplica (intencional) | Ídem; un reporte sobre un lugar privado lo ve la administración |
| `panel_persona` | Panel de administración: ficha de una persona | No aplica (intencional) | Ídem; cuenta cuántos lugares publicó, incluidos privados |
| `panel_personas` | Panel de administración: listado de personas | No aplica (intencional) | Ídem |
| `panel_resumen` | Panel de administración: indicadores + «gestionar» | No aplica (intencional) | Ídem; desglosa `lugares_privados` a propósito |
| `panel_comunidad` | Panel de administración: embudo de nuevas cuentas | No aplica (intencional) | Ídem; solo cuenta actividad, no expone la ficha |

Las nueve `panel_*` están todas `grant … to authenticated` (nunca `anon`) y comprueban `public.es_admin()` por
dentro (excepción o `null`): no hay fuga a un tercero, es la propia administración gestionando lo que le
corresponde ver — mostrarle ahí los privados es el propósito, no un descuido.

### La fuga real (código de aplicación, no SQL)

`src/app/lugares/page.tsx` (`cargar()`, el mapa y la lista **públicos** de `/lugares`) seleccionaba
`.eq("visible", true)` pero nunca `.eq("privado", false)`: confiaba solo en la política de lectura, que a
propósito deja pasar los lugares privados de QUIEN MIRA (`creado_por = auth.uid()`). Antes de esta pieza eso era
un caso raro (solo la administración marcaba privado); con OL-179, cualquier cuenta con sesión que marque un
lugar privado se lo hubiera encontrado a sí misma en su propio mapa y lista públicos — justo lo que el founder
pidió que nunca pasara («los lugares privados NUNCA aparecen en listados públicos aunque la persona sea su
autora»). Corregido con `.eq("privado", false)` explícito, mismo patrón que ya usaban `lib/ciudades.ts`,
`accionesBuscar.ts` (el buscador único) y `lib/sitemap.ts` — ninguno de esos tres dependía de la RLS.

`src/app/lugares/[id]/page.tsx` (la ficha de un lugar) ya traía, de antes de esta pieza, el letrero «Lugar
privado: solo lo ves tú. No sale en el mapa ni en la lista para nadie más.» y el JSON-LD ya se apagaba con
`lugar.visible && !lugar.privado`; el acceso a la ficha (una sola fila por slug/id) ya lo resolvía bien la RLS
-ahí SÍ es el mecanismo correcto: solo el autor, una cuenta ligada o la administración reciben la fila-. Se le
sumó `robots: { index: false, follow: false }` en `generateMetadata` cuando `lugar.privado` (defensa extra; en la
práctica ya es inalcanzable sin sesión).

Auditados también y sin cambios: `src/lib/inicio.ts` (no consulta `lugares` directamente, solo ordena eventos ya
traídos), `src/components/BuscadorUnificado`/`accionesBuscar.ts` (ya filtraba), `src/lib/sitemap.ts` (ya
filtraba, además la consulta corre sin sesión de verdad). `VistaLugares.tsx`/`Mapa.tsx` conservan una rama
`lugar.privado ? "Solo tú lo ves" : …` que ya no puede dispararse (la consulta que los alimenta ahora excluye
`privado` de raíz): código muerto pero inofensivo, se deja tal cual porque `Mapa.tsx` lo lleva OL-174 en paralelo
(instrucción del gestor de no tocarlo).

## 2. Servidor (`src/app/lugares/acciones.ts`)

- `privadoPermitido`: dejó de consultar `perfiles.rol` (ya no depende de `supabase`/`usuarioId`, firma síncrona);
  ahora basta con lo que pidió la persona, porque la política de la base ya exige que el lugar sea suyo o que sea
  administración.
- `crearLugarDesdeEvento` acepta `privado: boolean` (se manda en el `FormData` a `crearLugar`, que ya sabía leer
  ese campo desde `lib/lugares.ts`). Con privado, `lugares_parecidos` sigue sin ver privados -de nadie, tampoco
  los propios ya guardados-, así que solo deduplica contra un lugar **público** a 150 m: si lo encuentra,
  `reutilizado: true` significa «es público de verdad» y quien llama debe avisarlo («ya existe como lugar
  público») en vez de tratarlo como privado.

## 3. `HojaDondeEs.tsx` — sugerencias, panel y «Listo»

- **Sugerencias**: `elegirLugarLista` guarda si el lugar elegido es privado (`draft.privado`); en la lista, un
  lugar privado propio lleva una marca chica «Privado» (texto, sin candado: no existe ese icono en `ui/Iconos`)
  junto al nombre.
- **Elegir un lugar privado de las sugerencias**: en vez de `onLugar(id)` (que lo trataría como un lugar público
  de verdad, con `lugar_id`), «Listo» llama a `onOtro` con `reservado: true` -mismo mecanismo que «Es en otro
  sitio → reservado» de siempre-, nunca referenciando el `lugar_id`.
- **Panel «Agregar lugar»**: `guardarAgregar` ahora SIEMPRE llama a `crearLugarDesdeEvento` (antes, con privado,
  no llamaba a ningún servidor y el sitio quedaba «otro», con la dirección visible -decisión que esta pieza
  sustituye, ver «Qué cambia respecto a la decisión de OL-173» abajo). Si el resultado es privado y NO reutilizado
  (lugar nuevo de verdad), el borrador queda `manual` con `reservado: true` -el `lugar_id` recién creado no se usa
  para nada en este evento, solo queda en `lugares` para reutilizarlo otro día. Si es privado pero SÍ reutilizado
  (existía un lugar público parecido), se trata como un lugar normal y se avisa: «"nombre" ya existe como lugar
  público.» (nuevo estado `avisoPublico`, mostrado junto al resumen del pin).
- **`listo()`**: separa en dos ramas -`draft.origen === "lugar"` con `draft.privado` → `onOtro` reservado;
  `draft.origen === "manual"` con `draft.reservado` → los mismos campos reservados; sin ninguna de las dos
  marcas, el camino de siempre (`onLugar` o `onOtro` con `reservado: false`).
- **Un solo botón** (`barraAcciones`): se quitó `.accionMapa` («Buscar en el mapa sin agregar») del JSX y del CSS;
  el aviso «no está registrado» pasó a decir «"nombre" no está registrado. Agrégalo, o toca el mapa para
  ubicarlo.» Tocar el mapa YA cierra la lista/barra: `ui/ListaFlotante` cierra con cualquier `mousedown` fuera de
  su propia lista y del campo (`ancla`), y el mapa no es ninguno de los dos -comprobado, no hizo falta tocar nada
  ahí.

### Hallazgo durante las capturas: el propio botón «Agregar» puede no responder a un toque simulado

Reproducido con Chromium real (Playwright, `.click()` con mousedown/mouseup/click reales y separados, no
sintéticos): tocar «Agregar «nombre»» a veces no abre el panel. Causa, medida: el botón vive DENTRO de
`.barraAcciones`, que NO está contenida ni en la lista flotante (`listaRef`) ni en el campo (`ancla`) de
`ui/ListaFlotante` -así que, para su propio "tocar fuera", el botón "Agregar" cuenta como "fuera"-; el
`mousedown` sobre el botón dispara primero el cierre de la lista/barra (React re-renderiza y el botón desaparece
del DOM) y para cuando llega el evento `click` (después de `mouseup`, por el modelo de eventos del navegador) ya
no hay nada que lo reciba, así que `abrirAgregar` nunca se ejecuta. Con un solo `click` sintético
(`dispatchEvent("click")`, sin `mousedown`/`mouseup` reales de por medio) el panel sí abre siempre.

**Esto es anterior a esta pieza**: `ui/ListaFlotante` y la posición de `.barraAcciones` (fuera de `listaRef`/
`ancla`) no se tocaron aquí, y el mismo problema aplicaría igual de antes a los DOS botones de la barra de
OL-173. No se corrige en esta pieza (tocar `ui/ListaFlotante` es un componente canon compartido, fuera del
alcance del encargo) pero **es más grave ahora que antes**: con un solo botón, si de verdad falla en el iPhone
del founder, no hay ninguna otra salida para registrar un lugar nuevo desde esta hoja. El founder debe probarlo
con un toque real (no un clic de mouse) al validar esta pieza; si falla, es una pieza aparte sobre
`ui/ListaFlotante.tsx` (contener la barra dentro de su "ancla" efectiva, o que la barra no cuente como "fuera").

## 4. Sugerencias y consultas de lugares (`eventos/nuevo/page.tsx`, `eventos/[id]/editar/page.tsx`)

Ambas consultas de `lugares` para la hoja «¿Dónde es?» pasan a seleccionar también `privado` (antes no lo
pedían): la política de lectura ya deja pasar los privados de la propia cuenta, así que la consulta -corre con la
sesión de quien publica- ya los trae; solo faltaba pedir la columna para que `LugarResumen.privado` llegara al
cliente y la marca «Privado» pudiera pintarse.

## Qué cambia respecto a la decisión de OL-173 (bitácora 208)

Esa pieza había decidido, a falta de que el founder lo confirmara, que «privado» NO reutilizaba «reservado»: el
sitio quedaba «otro» (dirección visible), sin ficha pública. El founder, al pedir esta pieza, deja claro que el
lugar SÍ se guarda («se guarda, pero como privado») y que solo lo ve su autor -eso implica, para el EVENTO que lo
usa, que su dirección tampoco debe quedar visible a cualquiera: por eso pasa a «reservado» (nombre visible,
dirección oculta hasta la hora que toque, como cualquier sitio reservado de hoy). El encargo lo pide
explícitamente («el evento se guarda EXACTAMENTE como hoy "reservado"»literal).

## Verificación

```
npm run lint && npm run typecheck && npm test && npm run build
```

Los cuatro en verde: lint sin errores (1 warning preexistente y sin relación,
`docs/diseno/logotipo/iconos-sn.mjs`); typecheck limpio; **1096 pruebas, 91 archivos** (7 nuevas en
`acciones.desde-evento.test.ts` -las 5 que ya había más 2 nuevas para privado-, sobre las 1094 que ya traía la
base de OL-173, ninguna rota); build completo, sin la ruta del arnés (ver abajo) en el árbol de rutas final.

### Banco Postgres (`npm run test:db`)

Servidor Postgres 16 local de este entorno (`127.0.0.1`, rol `postgres` con contraseña puesta para esta sesión;
base de control `sn_control`, ajena a cualquier `sn_test_*`). `supabase/tests/pg/lugares-privados-de-todos.test.mjs`
(nuevo), sobre las 60 migraciones (con la nueva `20260925120000` incluida, aunque no se aplique a producción: el
banco siempre corre TODAS las migraciones del directorio):

1. Una cuenta normal (rol `usuario`, no administración) crea un lugar privado (`insert … privado = true`) y lo
   lee de vuelta.
2. Otra cuenta normal no lo lee por id, no lo encuentra con `lugares_con_nombre`, no lo ve con `lugares_parecidos`.
3. Anónimo no lo lee ni lo encuentra con `lugares_con_nombre`.
4. La administración sí lo lee.
5. La propia autora también puede marcar privado un lugar público YA EXISTENTE por `UPDATE` (no solo al crear).
6. Otra cuenta NO puede marcar privado un lugar ajeno (la política de edición sigue exigiendo ser su autor, una
   cuenta ligada o administración).
7. La administración sí puede marcar privado cualquier lugar.
8. Anónimo sigue sin poder crear lugares (con o sin privado).

```
ok 60 migraciones aplicadas en sn_test_…
ok 865 pruebas: 0 fallaron
```

(865 = las que ya traía el banco -incluida `rls.test.mjs`, que prueba el resto de la tabla `lugares`, sin
tocar- más las de este archivo nuevo.)

## Capturas reales (`docs/rediseno/capturas-214/`), 390×844 (320×844 la 06)

`next build && next start` (puerto 4214; sin procesos viejos propios que matar), Chromium real de
`/opt/pw-browsers/chromium` vía `playwright-core` (instalado en el scratchpad de la sesión, nunca en el repo). Sin
`--ignore-certificate-errors`. `document.fonts` con al menos una variante de "Bricolage Grotesque" en
`status: "loaded"` antes de cada captura, comprobado (no hizo falta inyectar el `.woff2` a mano: al ser
`next start` local, la fuente la sirve el propio servidor por `http://127.0.0.1`, sin pasar por el proxy de la
sesión -la nota de la memoria del gestor sobre certificados aplica a prototipos que piden Google Fonts en vivo,
no a esta app, que la autohospeda con `next/font`).

Arnés temporal `src/app/arnes214-temporal/` (tres rutas: `donde-es` con lugares inventados -uno de ellos
`privado: true`, "Cochera de Lupe", con nombre y dirección al tope de largo-, `donde-reservado` con
`FormularioEvento` recibiendo un `evento`/`privado` ya resueltos como reservado -sin Supabase en este entorno,
`crearLugarDesdeEvento` no puede completar la vuelta de red de verdad, así que el estado FINAL se arma con las
props que el propio componente ya sabe leer-, y `ficha-privada`, reconstrucción de la ficha de un lugar privado
con las clases reales de `Ficha.module.css`/`FichaLista.module.css` y el letrero que ya trae
`lugares/[id]/page.tsx`) — **se borró entero antes de comitear**, `git status --short` limpio (comprobado, ver
«Cierre»).

En cada captura: sin `scrollWidth` mayor que el ancho de la ventana y ningún elemento con el borde derecho más
allá de ese ancho (medido con un script propio antes de cada `screenshot`; las seis salieron limpias).

- **`01-sin-coincidencias-boton-unico.png`:** «El Teatrito de la esquina» sin coincidencias, aviso «"El Teatrito
  de la esquina" no está registrado. Agrégalo, o toca el mapa para ubicarlo.», un solo botón «Agregar "El
  Teatrito de la esquina" como lugar», teclado simulado (300 px, recortando `visualViewport` y disparando su
  propio evento `resize`, no el de `window` -la hoja escucha en el objeto, no en la ventana).
- **`02-sugerencias-lugar-privado.png`:** «Cochera» escrito, «Cochera de Lupe» en la lista con la marca «PRIVADO»
  junto al nombre, dirección debajo.
- **`03-panel-privado-encendido.png`:** panel «Agregar lugar» con «Es un lugar privado» / «Solo tú lo ves; podrás
  volver a usarlo en otros eventos», interruptor encendido (violeta).
- **`04-donde-lugar-privado-reservado.png`:** el renglón «Dónde» del formulario de evento con «El Teatrito de la
  esquina · reservado» (nombre visible, sin dirección: el mismo dibujo que cualquier sitio reservado de hoy).
- **`05-ficha-lugar-privado.png`:** ficha de «Cochera de Lupe» con el letrero «Lugar privado: solo lo ves tú. No
  sale en el mapa ni en la lista para nadie más.» arriba de la portada.
- **`06-320px-peor-caso.png`:** lo mismo que 02 a 320 px: la marca «PRIVADO» y la dirección larga (dos líneas)
  caben sin desbordar; el botón «Agregar "Cochera" como lugar» con el texto recortado a lo que cabe.

## Correos en el diff

`git diff origin/lugar-evento-pantalla-app..HEAD | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+'` no encontró
ninguna dirección real (las de `supabase/tests/pg/lugares-privados-de-todos.test.mjs`, `*-179@local.test`, son
inventadas para el banco, mismo patrón que `rls.test.mjs` con `@local.test`).

## Cierre

`git status --short` de `/home/user/somosnosotros` (la carpeta principal, NUNCA tocada por esta pieza) vacío,
comprobado. `git status --short` del árbol propio limpio de artefactos de build (`.next/` en `.gitignore`) y sin
el arnés. Commit local en `lugares-privados`, `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Sin
nombres de modelos de IA en ningún archivo del repo. Sin PR (lo da el gestor); sí `git push -u origin
lugares-privados` al terminar.
