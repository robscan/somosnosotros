# 422 · «Se canceló»: anunciado vs. realizado (OL-391, pieza 2 de 5 del historial)

**Fecha:** 2026-10-12. **Rama:** `evento-cancelado`, base `origin/main` (`939badc1`, ya con OL-390). **Operador:** Claude (agente del gestor VI).
**Con migración:** `supabase/migrations/20261012190000_eventos_cancelado.sql`, que **solo añade** una columna. **La aplica el gestor antes de unir** (la ficha del evento, el programa del festival, lo ligado y el historial leen `cancelado`; sin la columna, esas consultas fallan).
**Estado:** lista para la revisión del gestor y su PR. Falta el «publica» del founder.

## El encargo

La regla del founder, firmada con el prototipo OL-389 (bitácora 420, ejercicio C1 de `docs/rediseno/prototipos/historial-propuestas.html`) y confirmada el 12 de octubre con «sigue con piezas faltantes»: **un evento que ya pasó cuenta como realizado y entra al historial de su artista y de su lugar, salvo que quien gestiona el evento (o la administración) lo marque «se canceló», de un toque, desde su ficha en pasado. Marcado, se queda en la lista pero se ve cancelado y no cuenta.** Nadie tiene que confirmar nada para que lo normal (que sí ocurrió) aparezca. Cómo se ve en el historial lo fijó C1 (captura 15 de la bitácora 420): el renglón en su mes, el título tachado en gris, la etiqueta roja «SE CANCELÓ» delante de la fecha y la cabecera «2 fechas · 1 cancelado · 2 lugares».

## Lo que se ve

- **Ficha de un evento visible que ya pasó, para su autora o la administración** (que la ven «viva», con el aviso «Este evento ya pasó…»): en el menú «···», tras «Crear cartel», el renglón **«Se canceló»** con un calendario con ✕ y debajo «No ocurrió: se queda tachado y no cuenta». Un toque, sin diálogo: el menú se cierra, la ficha se vuelve a pintar ya cancelada y abajo sale el aviso **«Marcado: se canceló. Ya no cuenta en el historial.» con «Deshacer»** (el `Hecho` de las listas: tinta, 7 s, sobre la pastilla). Marcado, el renglón del menú dice **«No se canceló»** (calendario con palomita, «Sí ocurrió: vuelve a contar en el historial») y lo devuelve a `false`, con su aviso «Marcado: sí ocurrió. Cuenta en el historial.» y su Deshacer. Si no se pudo guardar: «No se pudo guardar. Revisa tu conexión.» con «Reintentar». Lo que no ha pasado, un borrador o algo oculto no tienen el renglón.
- **La ficha cancelada en pasado** (lo que ve cualquiera): el chip de la cabecera dice **«Se canceló»** en vez de «Ya pasó» (mismo sitio y tamaño, en `--error` sobre `--error-suave`; en la cabecera oscura, «EXPOSICIÓN · SE CANCELÓ» igual en rojo); la pestaña, «… · Se canceló · Somos Nosotros» y la descripción «Se canceló: era el …»; el número del cuándo, **«Era · 20:00»** (no «Fue»); **sin «Fueron N» ni «Quién fue»** aunque alguien hubiera dicho «Voy». Lo demás como la ficha en pasado de OL-383/OL-388: solo «Compartir», «Dónde», «Artistas», el pie. Sigue visible y se comparte. Quien la gestiona ve además el aviso «Marcado «Se canceló»: los demás lo ven así y no cuenta en el historial de sus artistas ni de su lugar.» y el chip rojo.
- **Trayectoria e Historial** (`Historial.tsx`): el renglón se queda en su mes, con el título tachado (en gris), la miniatura más apagada, **«SE CANCELÓ · dom 27 · 20:00»** en la línea de cuándo y, a la derecha, el chevrón (nunca «2 fueron»). La cabecera **«3 fechas · 1 cancelado · 2 lugares»** / «2 eventos · 1 cancelado · 4 artistas» («2 cancelados» en plural; sin cancelados, la de siempre; si todo se canceló, solo «1 cancelado»). Lo cancelado no cuenta en las fechas, ni en «Se ha presentado en» / «Han pasado por aquí», ni en el número «Lugares» de la ficha del artista (ni lleva a la trayectoria si es lo único pasado).
- **«Ya pasó» del festival:** el acto cancelado con la misma etiqueta delante de la hora («SE CANCELÓ · 20:00», sin «· ya pasó») y el título tachado.
- **Lo ligado que ya pasó** (`renglonLigado`): si se canceló, **«Se canceló»** en vez de «Fue el …» (la inauguración), «Exposición · Se canceló», «Festival · Se canceló», con el título tachado bajo «YA PASÓ».
- Inicio, la agenda y las listas de lo próximo de las fichas no enseñan lo pasado: no cambian.

## Código, archivo por archivo

- **`supabase/migrations/20261012190000_eventos_cancelado.sql`** (nueva): `alter table public.eventos add column cancelado boolean not null default false` y su comentario con la regla. Sin políticas nuevas: «eventos: edita autor o admin» (migración base) ya deja cambiarla solo a la autora y a la administración. Ningún disparador la mira: `avisos_evento_trigger` solo encola avisos por cambios de cuándo y dónde; `eventos_retirado_por_admin` y `proteger_autor_y_visible` solo miran sus columnas. Ninguna función de la base lista lo pasado (el historial y el programa leen la tabla), así que `eventos_parecidos`, `van_por_evento` y las demás no cambian.
- **`supabase/tests/pg/eventos-cancelado.test.mjs`** (nueva, 10 comprobaciones): nace en false y no admite null; la autora marca y desmarca; otra cuenta no (0 filas); un visitante no; la administración marca uno ajeno y lo deshace; marcar no toca `visible`, `borrador` ni `retirado_por_admin`; un visitante ve la marca.
- **`src/app/eventos/acciones.ts`**: `marcarCancelado(id, cancelado)` → `{ ok: true, cancelado }` o `{ ok: false, error: "sin_permiso" | "no_paso" | "no_visible" | "fallo" }`. Lee el evento, comprueba autora o administración (`esAdminDeSesion`), visible y no borrador, y `eventoPaso` (la misma regla que la ficha en pasado); escribe con `.select("id").maybeSingle()` para saber que la base lo guardó; revalida la ficha (id y slug), Inicio, Artistas, su lugar, sus artistas y su festival. Prueba nueva `cancelado.acciones.test.ts` (8).
- **`src/app/eventos/[id]/MarcarCancelado.tsx`** (nuevo, cliente): `RenglonCancelado` (la fila del menú) y `AvisoCancelado` (el aviso, en la ficha). La hoja del menú se desmonta al cerrarse, así que el aviso no puede ser suyo: se hablan por un estado de módulo con `useSyncExternalStore`. Mide `cancelar`.
- **`src/components/ui/MenuAcciones.tsx`**: contexto `CerrarMenu` para que una fila cierre el menú (fuera de un menú no hace nada).
- **`src/app/eventos/[id]/page.tsx`**: `cancelado = paso && e.cancelado`; `ofrecerCancelar = puedeEditar && paso && visible && !borrador` (la autora y la administración ven la ficha «viva» aun en pasado, así que el equivalente de `vista === "pasado"` para ellas es `paso`); el renglón en el menú y el aviso; el chip y el título de la pestaña; «Era · hora»; `KpiVan` y `QuienVaDiferido` devuelven nada si se canceló (y sin esqueleto mientras llegan); el aviso del gestor; `cancelado` en las columnas de lo ligado y de los actos del festival; `RenglonLigado` con `cancelado` (tachado) y `RenglonEvento` del «Ya pasó» con `cancelado`. Pruebas nuevas en `page.test.ts` (9): el menú solo en pasado y con permiso (autora, administración; no a otra cuenta, sin sesión, en lo que no ha pasado, en un borrador u oculto); el aviso solo para quien gestiona; el chip, «Era», sin «Fueron» ni «Quién fue» aunque haya dos «Voy»; sin la marca, la ficha en pasado de siempre; una marca en algo que no ha pasado no cuenta; el título de la pestaña; el acto cancelado del festival; lo ligado cancelado.
- **`src/app/eventos/[id]/ficha.module.css`**: `.ligadoCancelado > b` tachado.
- **`src/components/ui/Heroe.tsx`** + **`Ficha.module.css`**: prop `cancelado` que pone el chip en `--error` sobre `--error-suave` (también en la cabecera oscura de la columna ancha).
- **`src/components/ui/SeCancelo.tsx`** + **`.module.css`** (nuevos): la etiqueta «Se canceló» (rojo de error, mayúsculas, píldora, letra 2xs) y la regla que, en el renglón que la lleva (`li:has(.seCancelo) > a[href]`), tacha el título y apaga la miniatura a 0,45. Así no se toca `ui/Renglon` ni cada lista.
- **`src/components/ui/Iconos.tsx`**: `IconoCalendarioCancelado` (calendario con ✕, la convención de `calendar-x`) e `IconoCalendarioOk` (con palomita).
- **`src/components/Historial.tsx`**: la cabecera con «· N cancelado(s)», la etiqueta delante de cuándo y sin «fueron» si se canceló.
- **`src/components/RenglonEvento.tsx`**: prop `cancelado` (la etiqueta delante de la hora, sin la `nota`).
- **`src/lib/historialFichas.ts`**: `EventoPasado.cancelado`; `realizados()`; `cabeceraTrayectoria` / `cabeceraHistorial` con `cancelados`; `lugaresDeTrayectoria` y `artistasDelHistorial` solo con lo realizado. Pruebas nuevas (5) con el caso de C1 (Leo Traeger).
- **`src/lib/cargarHistorial.ts`**: `cancelado` en las columnas.
- **`src/app/artistas/[id]/page.tsx`**: «Lugares» (K1) y su salto solo con lo realizado.
- **`src/lib/ligado.ts`**: «Se canceló» en vez de «Fue el …» / «Cerró el …» / «Terminó el …» (solo si ya pasó). Pruebas nuevas (2).
- **`src/lib/eventos.ts`**: `Evento.cancelado?`.
- **`src/lib/medir.ts`**: `cancelar: { que: ["marcar", "deshacer"] }`. Había patrón claro: `medirCliente` ya mide acciones de quien gestiona el evento desde el menú de su ficha (`cartel_abierto` con `desde: "menu"`) y nunca mide a la administración (`sinMedirEnPantalla`). «marcar» al poner la marca; «deshacer» al quitarla (desde el aviso o con «No se canceló»). El aviso de privacidad no cambia (ya dice «acciones sin nombre»).
- **Respaldo local** (solo datos inventados): `fixture.mjs` con `cancelado` en cada evento; «Feleal: acordeón en ACHE» y «Cierre de Otoño Sonoro» cancelados; una exposición que ya cerró en la Casa del Poeta («Cartografías del agua», `bbbb0003-…09`) con su inauguración cancelada (`…10`). `server.mjs` aplica en memoria un PATCH de `eventos` que solo trae `cancelado` (otro arranque empieza limpio), para ver la ficha cancelada tras el toque. Ninguna pantalla medida los enseña.

## Decisiones que tomé

1. **Sin políticas ni disparadores nuevos.** La marca es una etiqueta del propio evento, como su descripción: quien puede editarlo puede escribirla. «Solo lo que ya pasó» y «no en borradores ni ocultos» los cuida la acción; por la API directa, la autora podría marcar uno suyo que no ha pasado, y la app no lo enseña (la ficha y `renglonLigado` solo miran la marca en pasado; el historial solo lee lo que ya terminó). Si el gestor prefiere que la base lo impida, es un `check` o un disparador de diez líneas.
2. **«Cuenta ligada» no aplica:** en `eventos` no existe (la política es «autor o admin»; las cuentas ligadas son de lugares y artistas). `puedeEditar` ya era autora o administración.
3. **El aviso con Deshacer fuera del menú** (el `Hecho` de las listas), no escrito en la fila como «Destacar»: el menú se cierra al tocar para que se vea la ficha ya cancelada; un estado de módulo une la fila y el aviso.
4. **«Era · 20:00»** en vez de «Fue · 20:00» en la ficha cancelada: «fue» dice que ocurrió.
5. **Quien gestiona también ve el chip rojo** y deja de ver «Van N» y «Quién va» en un evento cancelado (en su vista «viva»), y su aviso dice que está marcado.
6. **Si todo lo pasado se canceló, la cabecera dice solo «1 cancelado»** (sin «0 fechas»). Con el tope de 200 lleno: «198+ fechas · 2 cancelados».
7. **En lo ligado, «YA PASÓ» se queda encima** y abajo «Se canceló» en vez de «Fue el …», con el título tachado.
8. **Iconos nuevos** de calendario con ✕ y con palomita (no había uno de cancelar).

## Lo que el founder debe confirmar

- «Era · 20:00» en la ficha cancelada (decisión 4).
- El aviso flotante con Deshacer tras cerrar el menú (decisión 3) y los textos: «Se canceló / No ocurrió: se queda tachado y no cuenta», «No se canceló / Sí ocurrió: vuelve a contar en el historial», «Marcado: se canceló. Ya no cuenta en el historial.».
- Que quien gestiona deje de ver «Van» y «Quién va» en lo cancelado (decisión 5).
- Si la base debe rechazar marcar lo que no ha pasado (decisión 1).

## Capturas (`docs/rediseno/capturas-422/`, 390×844 a 2×)

La app compilada (`next build` + `next start`) contra una copia del respaldo local en el scratchpad **sin `imagenes.json`** (ni un cartel ni una portada de fuera: el SN y un gris), con la cookie inventada de Marcos (autor de los eventos del respaldo) para 01-04 y sin sesión para el resto. Todo lo que no era `127.0.0.1` se cortó en el navegador. **Ni una lectura a producción.** Toques reales por coordenadas (el elemento centrado, para que la pastilla «Seguir» no lo tape) y el ratón fuera antes de cada captura. Cero errores de página. Abiertas una por una:

- `01-menu-se-cancelo`: «Noche de acordeón y guitarra» (ya pasó, de Marcos) con el menú «···» abierto: Editar, Duplicar con otra fecha, Crear cartel, **«Se canceló» con el calendario con ✕ y «No ocurrió: se queda tachado y no cuenta»**, Reportar, Borrar el evento. Detrás, el aviso «Este evento ya pasó…» y «Van 2».
- `02-aviso-deshacer`: tras el toque, el menú cerrado; **el chip rojo «SE CANCELÓ»** sobre el título, el aviso «Marcado «Se canceló»: los demás lo ven así…», **«Era · 20:00»** y «Costo» (sin «Van»), y abajo **«Marcado: se canceló. Ya no cuenta en el historial.» con «Deshacer»** sobre las pastillas.
- `03-menu-no-se-cancelo`: el menú otra vez: **«No se canceló»** con el calendario con palomita y «Sí ocurrió: vuelve a contar en el historial».
- `04-aviso-no-se-cancelo`: tras «No se canceló»: la ficha sin el chip, el aviso de siempre, «Van 2», y **«Marcado: sí ocurrió. Cuenta en el historial.» con «Deshacer»**.
- `05-ficha-cancelada`: «Feleal: acordeón en ACHE» sin sesión: **chip «SE CANCELÓ»**, **«Era · 20:00 / dom 27 sep»**, «Costo · Gratis», solo «Compartir», «Dónde» con ACHE Galería y «Artistas» con Feleal; sin «Fueron» ni «Quién fue». La pestaña: «Feleal: acordeón en ACHE · Se canceló · Somos Nosotros».
- `06-trayectoria-feleal-cabecera`: la trayectoria de Feleal abierta: **«3 fechas · 1 cancelado · 2 lugares»**, «Se ha presentado en · 2» (ACHE y el Bicentenario), octubre con «Noche de acordeón y guitarra» y «2 fueron»; septiembre con **«Feleal: acordeón en ACHE» tachado, «SE CANCELÓ · dom 27 · 20:00», ACHE Galería y el chevrón**, el dúo con «1 fue» y el Jardín.
- `07-trayectoria-feleal-cancelado`: lo mismo, con el renglón cancelado al centro: la miniatura más apagada que las demás.
- `08-historial-ache-cabecera`: ACHE Galería: **«Historial · 2 eventos · 1 cancelado · 4 artistas»**, «Han pasado por aquí · 4» (0Backside0 «2 veces», Abril Merlot, Feleal, Rocío Lozano: Feleal sigue por la «Noche»), octubre con dos eventos y septiembre con el cancelado tachado, «SE CANCELÓ · dom 27 · 20:00» y «Feleal».
- `09-historial-ache-cancelado`: el renglón cancelado de ACHE al centro, antes de «Dónde».
- `10-festival-ya-paso-cancelado`: «Festival Otoño Sonoro»: «Programa registrado: 2 actividades · ninguna por venir»; **«Ya pasó · 2 actividades»** abierto: «Feleal y Abril Merlot a dúo» («19:00 · ya pasó») y **«Cierre de Otoño Sonoro» tachado con «SE CANCELÓ · 20:00»** (el reloj delante, como los demás actos).
- `11-ligado-inauguracion-cancelada`: «Cartografías del agua» (exposición que ya cerró, cabecera oscura «EXPOSICIÓN · YA PASÓ», «Cerró mar 29 sep», «Abrió vie 11 sep»); en «Horario», **«YA PASÓ / ~~Inauguración~~ / Se canceló»** con su chevrón a la ficha.

## Verificación

`npm run lint && npm run typecheck && npm test && npm run build && npm run inventario && npm run medir`, en verde (salida 0), en el árbol de la rama:

- **lint:** 0 errores, 1 aviso que ya estaba en `main` (`VisorImagen.componentes.test.mjs`, `page` sin usar).
- **typecheck:** limpio.
- **test:** 204 archivos, **3 709 pruebas** en verde; nuevas: 5 en `lib/historialFichas.test.ts` (22 en total), 2 en `lib/ligado.test.ts`, 8 en `eventos/cancelado.acciones.test.ts` y 9 en `eventos/[id]/page.test.ts`.
- **build:** en verde.
- **inventario:** sin novedades: 1 bloque duplicado (aceptado 1) y **342 medidas en duro (aceptadas 342)**; sin `--aceptar`.
- **medir:** 38 pantallas × 4 anchos, **sin novedades** (con el respaldo ya cambiado).
- **Banco de PostgreSQL** (`TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`, PostgreSQL 17 local): **98 migraciones, 2 022 pruebas, 0 fallos** (10 nuevas en `eventos-cancelado.test.mjs`).
- **Capturas:** 11, cero errores de página.

## Lo que no entra aquí

- «Tu año» (pieza 3), el currículo y el reporte en PDF (pieza 4), lo anterior a la app e integrantes (pieza 5).
- Que la base rechace la marca en lo que no ha pasado (decisión 1), si el gestor lo pide.
