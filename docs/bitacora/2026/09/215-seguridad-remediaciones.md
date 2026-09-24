# 215 · Remediaciones de seguridad S-01 a S-06 (OL-180)

**Fecha:** 2026-09-24 · **Rama:** `seguridad-remediaciones`, desde `origin/main` · **Pedido del founder:**
«adelante para remediaciones de seguridad», sobre `docs/rediseno/46-revision-seguridad.md` (revisión OL-178,
bitácora [213](213-revision-seguridad.md)). Solo S-01 a S-06 (alta, media y baja); S-07 a S-11 son notas y no
se tocaron. Cambios mínimos, sin rediseñar; ninguna migración; ningún cambio visible salvo rechazar lo
inválido con ayuda bajo el campo.

## Tabla S-01…S-06

| Id | Antes | Después | Prueba que lo demuestra |
|---|---|---|---|
| S-01 | `validarArtista`/`validarLugar`/`validarEvento` aceptaban la foto/portada/imagen con `/^https:\/\/[^\s]+$/`: cualquier `https://` de cualquier dominio, sin comprobar quién manda el formulario. «Solo administración» era un `{esAdmin && …}` en la pantalla (`FormularioArtista.tsx:411`, `FormularioLugar.tsx:436`, `FormularioEvento.tsx:742`), nunca del servidor. | Función compartida `imagenPermitida(url, { esAdmin, actual })` en `src/lib/imagenes.ts`: vacía pasa; una URL del Storage propio (prefijo exacto `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fotos/` — único bucket público al que suben personas, medido en `lib/subirFoto.ts` y en las migraciones de Storage; `obras` es privado, de Pincel, no aplica) pasa para cualquiera; cualquier otra `https://` solo pasa si `esAdmin` es `true`; igual a lo ya guardado (`actual`) pasa siempre, para no romper una edición que reenvía sin tocar la foto de una ficha del CAPO con foto de otro dominio. `esAdmin` se calcula en la ACCIÓN de servidor con `esAdminDeSesion(supabase, user.id)` (nuevo, `src/lib/supabase/servidor.ts`: consulta `perfiles.rol` con el id real de la sesión), nunca de un campo del formulario; en edición, `actual` sale de una lectura previa de la fila (`foto`/`portada`/`imagen`). Tocados: `src/lib/artistas.ts`, `src/lib/lugares.ts`, `src/lib/eventos.ts` (las tres `validar*` reciben `{ esAdmin, actual }` opcional), `src/app/artistas/acciones.ts`, `src/app/lugares/acciones.ts` (solo `crearLugar`/`actualizarLugar`, no `crearLugarDesdeEvento` ni `privadoPermitido`), `src/app/eventos/acciones.ts`. Mensaje bajo el campo, sin cambiar: «La foto no se subió bien. Intenta de nuevo.» / «La imagen no se subió bien. Intenta de nuevo.» | `src/lib/imagenes.test.ts` (9 pruebas): Storage propio pasa con y sin admin; `https://evil.example/…` falla sin admin y pasa con admin; `http://` falla; vacía pasa; un dominio que solo *empieza como* el propio (`xyz.supabase.co.evil.com`) no cuela; igual a `actual` pasa aunque sea de otro dominio y no haya admin; sin `NEXT_PUBLIC_SUPABASE_URL` configurado, ninguna URL cuenta como propia. Más 3 pruebas por archivo en `artistas.test.ts`/`lugares.test.ts`/`eventos.test.ts` con el mismo criterio a través de `validarArtista`/`validarLugar`/`validarEvento`. |
| S-02 | `reconocerEnlace` (`src/lib/enlaces.ts`) aceptaba un homógrafo IDN como "sitio" sin aviso: `reconocerEnlace("аpple.com")` (а cirílica) → `{ red: "sitio", url: "https://xn--pple-43d.com/" }`. | Tras calcular `red`, si es `"sitio"` (ninguna red reconocida es punycode) y alguna etiqueta del hostname empieza por `xn--`, se rechaza igual que un enlace inválido (`null`). `new URL()` ya convierte cualquier alfabeto mezclado (cirílico, griego…) a su forma punycode, así que un solo chequeo cubre homógrafos y punycode explícito. Decisión explícita de esta pieza (el doc 46 lo dejaba abierto): se rechazan también los IDN legítimos (acentos latinos, p. ej. "ñ") por ahora — más simple y más seguro; el founder puede abrirlos después si hace falta. | `src/lib/enlaces.test.ts`, describe «S-02»: `"аpple.com"` y `"https://аpple.com/"` → `null`; `"https://xn--pple-43d.com/"` → `null`; `"https://peña.mx"` (IDN legítimo) → `null` (decisión anotada); `"casa1100.mx"` (ASCII normal) sigue aceptándose como sitio. |
| S-03 | `api/avisos-pendientes/route.ts` y `api/recordatorios/route.ts` comparaban el secreto del cron con `!==` en texto plano. | Función compartida `autorizadoPorSecreto(cabeceras, secreto)` en `src/lib/autorizacionCron.ts`, mismo criterio en tiempo constante que ya usan `api/resend/route.ts` y `lib/entrarCon.ts`: `Buffer.from(...)` de longitud igual + `timingSafeEqual`; sin secreto configurado, rechaza sin comparar nada. Usada en los dos endpoints. | `src/lib/autorizacionCron.test.ts` (5 pruebas): secreto correcto autoriza; incorrecto no; sin `CRON_SECRET` configurado no autoriza (ni con cabecera vacía); sin cabecera Authorization no autoriza; un secreto que es prefijo del correcto (longitud distinta) no autoriza. |
| S-04 | `validarEvento` (`src/lib/eventos.ts`) solo anteponía `https://` al enlace de boletos si faltaba el esquema, sin comprobar que el resultado fuera una URL de verdad (aceptaba espacios, hosts sin punto, `http://`…). | Nueva `enlaceBienFormado(v)`: sin espacios, `new URL(v)` no lanza, protocolo exactamente `https:`, hostname con al menos un punto. Error bajo el campo: «Ese enlace no se ve bien. Revisa que empiece con https://». | `src/lib/eventos.test.ts`, describe «S-04»: con espacio, rechaza; `http://` (no https), rechaza; hostname sin punto (`https://localhost/jazz`), rechaza; `javascript:alert(1)` con el `https://` antepuesto no forma una URL válida (antes quedaba "inerte" pero guardado; ahora se rechaza con aviso); `"boletos.mx/jazz"` → `"https://boletos.mx/jazz"` sigue sin error (prueba existente, sin tocar). |
| S-05 | `reconocerEnlace` aceptaba usuario/contraseña incrustados: `"https://ejemplo.com@evil.com"` navegaría a `evil.com`, no a `ejemplo.com`. | Tras parsear la URL, si `url.username` o `url.password` no están vacíos, se rechaza (`null`) igual que un enlace inválido. | `src/lib/enlaces.test.ts`, describe «S-05»: `"https://ejemplo.com@evil.com"` → `null`; con contraseña (`"https://usuario:clave@evil.com"`) → `null`; una URL normal sin arroba sigue funcionando. |
| S-06 | `limpiarTituloEnlace` (`src/lib/enlaces.ts`) solo recortaba a 30 y colapsaba saltos de línea; no quitaba caracteres de control/formato Unicode invisibles (U+200B–U+200F, U+202A–U+202E, U+2066–U+2069, U+FEFF…). | Se quitan los caracteres de categoría Unicode Cc/Cf (`/[\p{Cc}\p{Cf}]/gu`) **después** de colapsar espacios (quitar antes uniría palabras separadas por un salto de línea, que sí es Cc) y antes de recortar a 30. | `src/lib/enlaces.test.ts`, describe «S-06»: `"Mi‮titulo"` (RTL override) → `"Mititulo"`; `"Mi​canal"` (espacio de ancho cero) → `"Micanal"`; un título hecho solo de invisibles → `undefined`, no una cadena "vacía visible". Las pruebas existentes de recorte/espacios/saltos de línea siguen en verde sin tocarlas. |

## Los seis valores de entrada del doc 46, corridos contra el código de esta pieza

Ejecutado con `npx tsx` importando los módulos reales tal como quedaron (con `NEXT_PUBLIC_SUPABASE_URL` puesto
a mano para poder probar el prefijo del Storage propio, ya que este árbol no tiene `.env.local`):

```
S-01 URL Storage propio (no admin): true
S-01 evil.example no admin: false
S-01 evil.example admin: true
S-01 http:// falla: false
S-01 vacío pasa: true
S-02 аpple.com (cirílica): null
S-02 xn--: null
S-03 secreto correcto: true
S-03 secreto incorrecto: false
S-03 sin secreto configurado: false
S-04 enlace con espacio: "Ese enlace no se ve bien. Revisa que empiece con https://"
S-04 enlace bien formado: undefined (sin error)
S-05 userinfo: null
S-06 U+202E: "Mititulo"
```

Los seis hallazgos, corregidos.

## Qué no se tocó (frontera con OL-179, rama `lugares-privados`)

`src/app/eventos/HojaDondeEs*`, `MapaDondeEs*`, `dondeEsPantalla.ts`, `src/lib/buscarLugares.ts`, y dentro de
`src/app/lugares/acciones.ts` las funciones `crearLugarDesdeEvento` y `privadoPermitido`: ninguno de esos
archivos ni esas dos funciones se editó. `crearLugarDesdeEvento` sigue llamando a `crearLugar` tal cual (que sí
se tocó): como su `FormData` nunca trae `portada`, la validación de imagen no cambia su comportamiento (una
portada vacía siempre pasa, con o sin admin).

`docs/rediseno/09-enlaces-flujo-y-estados.md` no necesitó cambios: las decisiones de flujo (un campo,
reconocimiento automático, "Otro enlace"…) siguen igual; S-02/S-05/S-06 endurecen la validación sin tocar ese
flujo ni sus estados.

## Fichas del CAPO con foto de otro dominio: cómo se conservan

`origen = "capo"` no cambia el criterio de S-01 por sí solo: lo que protege esas fichas es el `actual` de
`imagenPermitida`. Al editar (`actualizarArtista`/`actualizarLugar`/`actualizarEvento`), la acción de servidor
lee primero la fila actual (`foto`/`portada`/`imagen`) y la pasa como `actual`; si el formulario reenvía esa
misma URL sin tocarla (el campo de pegar URL ni siquiera se ve para quien no es admin, así que normalmente
llega intacta), pasa aunque no sea del Storage propio ni la mande un admin. Si alguien SÍ cambia la foto a otra
URL de otro dominio sin ser admin, esa sí se rechaza — correcto: es exactamente el hallazgo que se cierra. Al
crear (`crearArtista`/`crearLugar`/`crearEvento`) no hay `actual` (no hay fila previa), así que una foto nueva
de otro dominio siempre exige admin, sin excepción — coherente con que el alta del CAPO corre con la llave de
servicio (`scripts/capo/`), fuera de esta vía web.

## Captura

Ninguna: en las tres pantallas (`FormularioArtista.tsx:411`, `FormularioLugar.tsx:436`,
`FormularioEvento.tsx:742`) el campo de pegar una URL de foto/portada/imagen solo se pinta con
`{esAdmin && <CampoImagenUrl .../>}` — para una cuenta que no es administración ese campo no existe en
pantalla, así que no hay nada que capturar; la prueba unitaria (`imagenPermitida` rechazando un dominio ajeno
sin `esAdmin`, y las de `validarArtista`/`validarLugar`/`validarEvento` con el mismo caso) es la evidencia.

## Verificación

```
npm run lint && npm run typecheck && npm test && npm run build
```

Verdes: lint con el único warning preexistente y ajeno (`docs/diseno/logotipo/iconos-sn.mjs:57`, variable `k`
sin usar); typecheck limpio; **1161 pruebas, 95 archivos**, todas en verde (incluye las nuevas: 9 en
`imagenes.test.ts`, 5 en `autorizacionCron.test.ts`, más las añadidas a `enlaces.test.ts`, `artistas.test.ts`,
`lugares.test.ts` y `eventos.test.ts`; dos archivos de prueba que mockeaban `@/lib/supabase/servidor` sin la
nueva `esAdminDeSesion` —`src/app/eventos/guardado.test.ts` y `src/app/eventos/direccion.acciones.test.ts`— se
actualizaron para exportarla también, mockeada a `false`: no cambia lo que ya probaban, sus formularios no
tocan el campo de imagen); `npm run build` completo, sin errores.

No se corrió `npm run test:db` (banco PostgreSQL local): esta pieza no toca ninguna tabla, política ni función
de la base — es validación de formulario en `src/lib/` y comparación de cabeceras en las rutas del cron, sin
ninguna migración.

## Cierre

Commit local en `seguridad-remediaciones` con `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`;
push a `origin/seguridad-remediaciones`, sin PR (lo abre el founder o el gestor). `git status --short` en la
carpeta principal (`/home/user/somosnosotros`), vacío: comprobado antes de cerrar.
