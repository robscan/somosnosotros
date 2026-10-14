# 438 · El banner para compartir: compartir no lo quita y la × solo hasta volver a abrir la app (OL-407)

**Fecha:** 2026-10-14. **Rama:** `banner-siempre`, desde `origin/main` (`aa2909cf`). **Operador:** agente del Gestor de cambios VI (Claude). **Sin migración.**

## El encargo

El founder, el 14 de octubre (textual): **«Que el banner de compartir no se oculte al compartir una vez. Si se cierra se vuelve a abrir al siguiente inicio de sesión. Que diga esto: ¿Te gusta Somos Nosotrxs? Comparte con tus amigxs. Somos Nosotrxs»**.

Hasta hoy (OL-387 y OL-397, bitácoras 417 y 428): tras compartir, el banner no volvía nunca; la × lo escondía 30 días.

## Lo que cambió

- **`src/lib/visitasInicio.ts`:**
  - **Compartir ya no cuenta.** Se quita `compartido` del estado y de la regla: el banner sale aunque la persona ya haya compartido. `compartido` no servía para nada más (lo que se mide va aparte, por `medirCliente`, y no cambia).
  - **La ×, solo en esta sesión de uso.** Se quitan `cerradoHasta`, `DESCANSO_DIAS` (30 días), `cerrarBanner`, `marcarCompartido`, `cambiarGuardado` y `sumarDias`. La × deja una marca en `sessionStorage` (`somosnosotros:inicio-compartir-cerrado` = "1"); mientras esa marca exista no sale; la siguiente vez que se abre la app ya no está y el banner vuelve. Funciones nuevas: `cerradoEnEstaSesion`, `cerrarEnEstaSesion`, `reabrirEnEstaSesion` («Deshacer»). `tocaBanner(estado, cerradoEnEstaSesion)`.
  - **Lo que ya tienen los teléfonos.** En `localStorage` queda solo `{ dias }` (el conteo de días, para volver al criterio de 3 días cambiando `DIAS_PARA_BANNER`). `leerEstado` lee lo de antes y descarta `cerradoHasta` y `compartido`: quien lo había cerrado por 30 días o ya había compartido lo vuelve a ver desde hoy, como pide el founder.
  - Sin almacenamiento (local o de la sesión bloqueado) sigue sin salir: si no se puede recordar la ×, no se insiste.
- **`src/components/inicio/BannerCompartir.tsx`:**
  - Texto bajo el título: **«Comparte con tus amigxs.»** (antes «Compártela con tus amigxs.»). El título «¿Te gusta Somos Nosotrxs?» no cambia.
  - Lo que se comparte (`DATOS_COMPARTIR`): título «Somos Nosotrxs», texto «¿Te gusta Somos Nosotrxs? Comparte con tus amigxs.» y el enlace somosnosotros.org.
  - Compartir (hoja del teléfono o enlace copiado) solo da las gracias («Gracias por compartir» / «Enlace copiado»); el banner se queda.
  - La × lo quita y avisa **«Cerrado hasta que vuelvas a abrir la app»** con «Deshacer» (antes «Cerrado: no vuelve a salir en 30 días»).
- **`src/components/Inicio.tsx`:** solo comentarios.
- **`scripts/ops/auditoria-ui/medir-pantallas.mjs`:** el paso `banner-compartir` guarda la forma nueva (`{ dias }`); con la vieja también salía.

## «Siguiente inicio de sesión»: cómo lo leí y por qué `sessionStorage`

Lo leí como **la siguiente vez que se abre la app** (una sesión de uso nueva), no como volver a entrar con la cuenta: el banner sale con y sin cuenta desde OL-397, y casi nadie cierra sesión en el teléfono, así que atarlo al login lo dejaría escondido para siempre.

La app ya usa `sessionStorage` para «lo de esta visita»: lo ya visto de la fila Ahora (`FilaAhora`, «por sesión del navegador»), la memoria de pantalla (`lib/memoriaPantalla`), las decisiones de la visita (`lib/decisionesVisita`) y la ubicación negada (`Ciudad`). Seguí ese patrón:

- **App instalada en el iPhone (web en el inicio) y app de tienda:** la marca vive mientras la app esté abierta, también en segundo plano. Al cerrarla (deslizarla fuera) o cuando iOS la descarga de memoria, se pierde y el banner vuelve en la siguiente apertura.
- **Safari:** vive mientras exista la pestaña. Recargar o volver a Inicio no lo trae; una pestaña nueva, sí.

No usé una marca en `localStorage` con hora y ventana corta: tendría que inventar un número (¿30 min?, ¿2 h?) que no dijo el founder, y la app ya confía en `sessionStorage` para lo mismo en otras cuatro piezas.

## Pruebas

- `src/lib/visitasInicio.test.ts` (10): sale desde el primer día; la × lo esconde en la misma sesión, también al día siguiente si la app sigue abierta, y en una sesión nueva vuelve; «Deshacer» quita la marca; lo que guardaban los teléfonos (`compartido: true`, `cerradoHasta` a 30 días) ya no lo esconde y se reescribe con la forma nueva; sin almacén (local o de sesión, nulo o que lanza) no sale.
- `src/components/inicio/BannerCompartir.componentes.test.mjs` (6): medidas firmadas y el texto nuevo; cerrado en esta sesión, sin `localStorage` o sin `sessionStorage`: no sale; ya compartido o cerrado 30 días con la forma vieja: sale; la × → aviso nuevo, «Deshacer», otra vez la ×, recargar (misma sesión) no lo trae y una pestaña nueva del mismo navegador (sesión nueva, mismo `localStorage`) sí; compartir sin hoja copia, avisa, mide y el banner se queda (y sale en la siguiente apertura); con hoja comparte el texto nuevo, avisa, mide y se queda; cancelar la hoja: se queda sin aviso ni medida.
- `src/components/inicio/Inicio.componentes.test.mjs` (10): el banner con «Comparte con tus amigxs.» tras el carril estelar; sale en la segunda visita, sin sesión y también si el teléfono decía que ya compartió.

## Verificación

- lint: 0 errores, 1 aviso que ya estaba en `main` (`VisorImagen.componentes.test.mjs`, `page` sin usar).
- typecheck: limpio.
- test: 220 archivos, **3 907 pruebas** en verde.
- test:componentes del banner e Inicio: 6 de 6 y 10 de 10.
- inventario: sin novedades (342 medidas en duro aceptadas).
- medir: **40 pantallas × 4 anchos en 139 s, sin novedades.** Inicio no se mueve: 01-inicio 372/374, s01-inicio-sesion 377/379, s28-inicio-banner-compartir 377/379 (el banner ya salía; el texto más corto no cambia nodos). `medidas.aceptadas.json` sin tocar.

## Capturas (`docs/rediseno/capturas-438/`, 390×844)

Contra el respaldo local de datos inventados, como `medir`: respaldo + `next build` + `next start` con el reloj fijo (mié 7 oct, 10:00), sin `.env` en el árbol, Chrome de la Mac con cuenta de prueba del respaldo. La hoja de compartir del teléfono se simuló como «compartida».

- `01-banner-texto-nuevo`: Inicio con sesión, el banner tras Destacados y antes de «Tus planes»: «¿Te gusta Somos Nosotrxs?» y debajo «Comparte con tus amigxs.», con el símbolo SN, la × y «Compartir».
- `02-tras-compartir-sigue`: tras tocar «Compartir» (la hoja recibió «Somos Nosotrxs» / «¿Te gusta Somos Nosotrxs? Comparte con tus amigxs.» / somosnosotros.org): aviso «Gracias por compartir» abajo y el banner sigue en su sitio.
- `03-cerrado-con-la-x`: tras la ×, el banner se fue («Tus planes» sube bajo Destacados) y el aviso dice «Cerrado hasta que vuelvas a abrir la app» con «Deshacer».
- `04-misma-sesion-recargada-sin-banner`: la misma pestaña recargada (misma sesión de uso): no hay banner entre Destacados y «Tus planes».
- `05-app-abierta-otra-vez-vuelve`: Inicio en una pestaña nueva del mismo navegador (como volver a abrir la app: mismo `localStorage`, `sessionStorage` nuevo): el banner volvió.

## Para que el founder confirme

- **«Siguiente inicio de sesión» = la siguiente vez que abres la app.** Si la app se queda abierta en segundo plano días enteros y iOS no la cierra, el banner sigue escondido hasta que la cierres. Si prefieres que también vuelva al día siguiente aunque la app siga abierta, es una línea.
- Quien ya lo había cerrado (30 días) o ya había compartido lo vuelve a ver desde que esto llegue a producción.
- El aviso de la × ahora dice «Cerrado hasta que vuelvas a abrir la app». Si quieres otras palabras, dímelas.
