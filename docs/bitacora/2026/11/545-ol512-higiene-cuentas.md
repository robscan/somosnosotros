# 545 · OL-512 · Higiene de cuentas y permisos

**Fecha:** 2026-11-09. **Rama:** `higiene-cuentas` (desde `origin/main` `9fbe6dd5`). **Quién:** operador del Gestor de cambios IX. Pieza 1 de la revisión de la plataforma (OL-511, bitácora 544). Founder (2026-11-09): «Adelante con las piezas 1 y 2, acepto tus recomendaciones». **Migración:** `supabase/migrations/20261109100000_higiene_cuentas.sql` (una sola; se puede aplicar dos veces; no borra tablas, columnas ni datos; la aplica el gestor en producción antes de unir).

## Qué cambió

1. **El nombre al entrar ya no sale del correo.** Una cuenta nueva toma el nombre que dan Apple o Google; si no dan ninguno, nace con el nombre vacío y la app se lo pide. Lo demás del alta sigue igual (foto filtrada, rol por la lista de la administración, correo encendido con su fecha). Al entrar con Apple, su nombre se pone si el perfil tiene el nombre vacío o el de antes (`nombresPorDefecto`).
2. **Un perfil sin correo confirmado no se lee en público.** La regla de lectura de `perfiles` deja leer el propio, todo a la administración y, al resto, solo las cuentas que ya confirmaron su correo (función `perfil_legible`: solo dice sí o no). La propia persona se sigue viendo y editando aunque no haya confirmado.
3. **Sin sesión no se lee la columna del rol.** La ficha pública de una persona ya no lo pide (`PerfilPublico` ya no lo trae; `Perfil`, el de la propia cuenta, sí). `es_admin()` sin sesión contesta «no» sin consultar la tabla, para que las reglas que la evalúan sin sesión no necesiten esa columna.
4. **«Quién va» y «quién sigue» solo con lo ligado a la vista.** Una asistencia se lee si su evento se puede ver; un seguimiento, si su lugar o su artista se puede ver (cada uno con su propia regla). Lo propio y la administración, como antes; un perfil reservado, como antes. Los conteos públicos no cambian.
5. **Tu cartel a un evento, solo con una imagen de tu carpeta.** Poner cartel a un evento ajeno sin cartel sigue siendo lo querido; la base ahora exige, igual que ya hacía la pantalla, que la imagen sea un archivo directo de la carpeta propia (`fotos/lugares/<tu cuenta>/`) y que no sea un cartel hecho aquí.
6. **Un regreso validado.** Publicar, editar y borrar una novedad de artista pasan su regreso por `rutaSegura` (solo rutas internas; si no, la ficha del artista).
7. **Borrar la cuenta borra sus fotos de perfil.** Antes de borrar la cuenta, con su propia sesión, se listan y borran los archivos de `fotos/perfiles/<su cuenta>/`. Si no se puede, la cuenta se borra igual: queda en el registro del servidor y en la medición (evento nuevo `cuenta_borrada` con `fotos: borradas | sin_fotos | fallo`, sin decir de quién). El aviso de privacidad dice ahora «tu perfil con su foto».
8. **La app con perfiles sin nombre.** Donde se pinta el nombre de una persona (su ficha y su título, compartir, metadatos, quién va, «Publicado por», bloqueadas, «Tu año», la inicial de la navegación) sale «Persona nueva» con la inicial «?» (`NOMBRE_SIN_PONER`, `nombreVisible`, `inicialDe` y `faltaNombre` en `src/lib/perfil.ts`). En el resumen «Van 2: Marcos y 1 más» y en Novedades («Van a lo mismo») quien no tiene nombre cuenta en el número sin dejar un hueco. **Al entrar**, a quien no tiene nombre se la lleva una sola vez por sesión a la pantalla que ya existe para editar su ficha (`/ajustes/editar?pedir=nombre&siguiente=…`), con la línea «¿Cómo te llamas? Así saldrá en lo que publiques.» y el renglón Nombre abierto con el campo enfocado; Atrás y Guardar la devuelven a donde iba. Si no lo pone, no se la vuelve a mandar en esa sesión (`sessionStorage`) y en su ficha propia ve «Ponle nombre a tu perfil: así saldrá en lo que publiques.» con «Ponerlo». Sin pantallas nuevas.

## Decisiones por confirmar

- **La regla de perfiles no usa `es_admin()`:** `es_admin()` lee `perfiles` con los permisos de quien llama, así que la regla se llamaría a sí misma. `perfil_legible` (definer, ruta vacía, stable) hace la misma comprobación de la administración sin volver a la regla. Va en la lista de funciones que ejecuta `anon` del banco del Security Advisor, con su razón.
- **`es_admin()` pasa de SQL a plpgsql** (sigue invoker con la ruta vacía, como pide el banco): sin sesión, o sin permiso para leer la columna, contesta «no» sin consultar. Ya no se podía «incrustar» antes (lleva `set search_path`), así que no cambia cómo la planea Postgres.
- **El rol se quita solo a quien no tiene sesión.** Con sesión la app lo lee de la propia cuenta en unos 16 sitios (`esAdminDeSesion`, carteles). Quitarlo también con sesión pide cambiar esas lecturas por `es_admin()`: pieza aparte si se quiere.
- **Lo propio sigue visible** aunque el evento, lugar o artista esté oculto (la persona ve a qué dijo «Voy»); la administración, todo.
- **El cartel de la carpeta propia vale también para la administración** (usa la misma pantalla y sube a su carpeta).
- **Dónde no se desvía a pedir el nombre:** editar la ficha, Entrar y sus vueltas, y las altas a medias (`/nuevo/…`, `/obra/…`); se le pide en la siguiente pantalla. Sin almacenamiento del navegador (navegación privada estricta) no se le desvía nunca: queda el renglón de su ficha.
- **Una cuenta sin confirmar que aparezca como autora** de un lugar, evento o artista saldría como «una cuenta borrada» (su perfil no se lee). Sin sesión no se publica, así que debería ser rarísimo: lo mide el gestor (abajo).

## Qué debe comprobar el gestor en producción tras aplicar la migración (solo lectura)

1. **Que las cuentas de Apple y Google siguen visibles:** cuántos perfiles tienen su cuenta con `email_confirmed_at` vacío, por proveedor (`raw_app_meta_data ->> 'provider'`). En el banco local no hay Supabase Auth: que se llene al entrar con Apple o Google queda **por confirmar en producción**.
2. **Cuántos perfiles dejan de verse en público** (los de cuentas sin confirmar) y cuántos de ellos son autores de fichas visibles.
3. Sin sesión: la ficha de una persona, «Quién va» de un evento y las fichas de lugares y artistas cargan; leer el rol se rechaza.
4. Con la cuenta de administración: Administración entra (`es_admin()` sí) y Personas lista todas las cuentas.
5. Que la migración aplicada dos veces no da error (el banco ya lo hace).
6. Tiempos de «Quién va» y de las fichas con muchas asistencias (la regla de perfiles llama una función por fila; Speed Insights).
7. Después de vaciar el nombre de las 19 cuentas (con respaldo), que al entrar se les pide y su ficha dice «Persona nueva».

## Capturas (`docs/rediseno/capturas-545/`, 390×844 a 2×, respaldo local con `RESPALDO_SIN_NOMBRE=1`)

Se sacan con `node scripts/ops/auditoria-ui/capturar-higiene-cuentas.mjs <árbol> docs/rediseno/capturas-545`.

Cada una abierta y mirada antes de darla por buena.

- `a-ficha-persona-nueva.png`: la ficha de Ana (sin nombre) vista por Marcos. Título de la barra, cabecera y pestaña del navegador dicen «Persona nueva»; el avatar sin foto lleva «?»; su colonia y sus listas, como siempre.
- `b1-pedir-nombre-al-entrar.png`: Ana abre Inicio con sesión y la app la lleva sola a `/ajustes/editar?pedir=nombre&siguiente=/`: «Editar perfil», debajo «¿Cómo te llamas? Así saldrá en lo que publiques.», el renglón Nombre abierto con el campo enfocado (medido: el foco está en «Nombre») y Guardar apagado hasta que escriba. Atrás dice «Atrás» y vuelve a Inicio.
- `b2-pedir-nombre-con-teclado.png`: la misma con el área visible del teléfono con teclado (390×508): el campo queda entero arriba (289–333 px). Guardar queda abajo en el flujo, como en esta pantalla desde antes (no se cambió su maquetación; **por confirmar** si se ancla sobre el teclado como en las altas).
- `c-mi-perfil-ponle-nombre.png`: tras volver con Atrás sin ponerlo (no se la vuelve a mandar: medido, se queda en `/`), Mi perfil muestra «Persona nueva», «?» en la navegación y el renglón «Ponle nombre a tu perfil: así saldrá en lo que publiques.» con «Ponerlo», solo (sin el de colonia y sobre ti).
- `d-quien-va-persona-nueva.png`: «Quién va» de LXS COLOCAOS visto por Marcos: «Van 2: Marcos y 1 más», la pila con «M» y «?», y la lista abierta con «Marcos Ledesma» y «Persona nueva».

## Verificación

- `npm run lint` (0 errores, 2 avisos de antes), `npm run typecheck`, `npm test` (329 archivos, 5 215 pruebas) en verde.
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: 132 migraciones, **3 121 pruebas, 0 fallaron**. Banco nuevo `supabase/tests/pg/higiene-cuentas.test.mjs` (puntos 1 a 5, y la migración aplicada por segunda vez antes de probar). Sin la migración, ese banco falla (nombre sacado del correo, función que no existe). Ajustes a bancos que ya había: `perfiles-privados` (cuentas con el correo confirmado; seis columnas públicas sin sesión, siete con sesión), `cartel-a-evento-existente` (la imagen ajena ahora se rechaza por no ser de la carpeta propia) y `security-advisor` (`perfil_legible` en la lista de `anon`, con su razón).
- `npm run test:componentes` de `FormularioPerfil` (3, uno nuevo: pedir el nombre llega abierto y enfocado, Guardar espera al nombre y vuelve a donde iba).
- Pruebas nuevas de lógica: `pedirNombre.test.ts`, `perfil.test.ts` (Persona nueva), `novedades.test.ts` (Van a lo mismo sin nombre), `entrarCon.test.ts` (nombres por defecto), `acciones.borrar.test.ts` (fotos antes de la cuenta, y la cuenta se borra aunque falle), `novedades/acciones.test.ts` (regresos que no son rutas internas) y `consultas.privacidad.test.ts` (la ficha pública no pide el rol).
- `npm run inventario`: sin novedades. `npm run medir`: 63 pantallas × 4 anchos, sin novedades.
- El respaldo local gana `RESPALDO_SIN_NOMBRE=1` (Ana sin nombre) solo para estas capturas; `npm run medir` no lo usa.
