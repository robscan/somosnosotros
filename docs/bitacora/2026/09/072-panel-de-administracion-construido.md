# 072 · Panel de administración construido: resumen, personas con rol y listas de fichas (OL-044)

**Fecha:** 2026-09-16 (noche) · **Rama:** `panel-admin` (árbol de trabajo propio; solo commits locales, sin push) · **Base:** firma del founder sobre [18](../../../rediseno/18-administracion-fricciones.md) y [19](../../../rediseno/19-administracion-flujo-y-estados.md): «Firmo, continúa sin afectar otras ramas ni chats», con D1 = B, D2 = A y D3 = A · **Diseño:** bitácora [070](070-panel-de-administracion-diseno.md).

## Qué se hizo
- **Firma** registrada en 18 y 19: las 21 fricciones de acuerdo y D1 a D3 decididas.
- **Migración** `supabase/migrations/20260917090000_panel_administracion.sql`, **sin aplicar a producción**:
  - funciones solo para la administración: `panel_resumen`, `panel_pendientes`, `panel_personas` y su conteo, `panel_persona`, `panel_correo`, `panel_lugares`, `panel_eventos`, `panel_artistas` y `panel_fichas_conteos`;
  - `cambiar_rol`, con sus guardas y registro en `cambios_de_rol`;
  - `marcar_visto` y `cuentas_vistas` (D3: solo el último día);
  - `guardar_indicadores` e `indicadores_diarios` (la foto diaria, solo conteos);
  - `sin_pasar`, la misma regla de `filtroSinPasar`. Nada nuevo en `perfiles`.
- **Resumen** (`/admin`):
  - Pendiente: tarjetas por decisión, con la línea de lo hecho y "Mostrar".
  - Últimos 7 días: cuatro indicadores con su desglose en su sitio; la comparación y la tendencia solo aparecen con historia.
  - Gestionar, y los errores con "Intentar de nuevo".
  - Atrás vuelve a Ajustes.
- **Personas** (`/admin/personas` y `/admin/personas/[id]`): búsqueda por nombre o correo, filtros con conteo, ficha de administración (Cuenta, Actividad y Rol), las hojas de hacer y quitar administrador, y el correo oculto hasta "Ver", con "Copiar".
- **Listas** (`/admin/lugares`, `/admin/eventos` y `/admin/artistas`, en una sola ruta `[seccion]`): búsqueda, filtros con conteo, "Oculto" a la vista y el menú de los tres puntos con las palabras de cada ficha.
- **Fuera del panel:**
  - Ajustes › Administración: icono de tablero y lo pendiente ("2 pendientes"); si el conteo falla, no afirma "Nada pendiente".
  - Tres iconos nuevos en `ui/Iconos`: tablero, bandera y ojo tachado.
  - Aviso de privacidad: el último día que se abrió la app (D3) y el uso del correo por la administración (D2), con fecha del 16 de septiembre.
  - `VistoHoy`: dentro de `Sesion`, marca el día una vez por teléfono. Lo recuerda en el almacenamiento del teléfono, no en una cookie: el aviso dice que solo se usa la de sesión.
  - La tarea de la mañana (`/api/recordatorios`) guarda también la foto de los indicadores; si falla, los recordatorios no se enteran.
- **Lógica pura** en `src/lib/panel.ts`, con 24 pruebas.
- **`main` traído a la rama** (PR #71, #72 y #73, sin migraciones). El único choque fue `OPEN_LOOPS.md`, resuelto conservando todo lo de las dos ramas.

## Verificación
- **Código:** lint (0 errores; 1 aviso ajeno en `docs/diseno/logotipo/iconos-sn.mjs`), tipos, 236 pruebas y build, en verde antes y después de traer `main`.
- **Base de datos, sin producción:**
  - Banco local con PGlite (Postgres en WebAssembly), en el scratchpad y fuera del repo y de `package.json`. Imita lo mínimo de Supabase: esquemas `auth` y `storage`, roles `anon`, `authenticated` y `service_role`, y sus permisos por defecto.
  - Aplica las **28 migraciones** del repo en orden y hace **85 comprobaciones**:
    - guardas del rol;
    - permisos: sin sesión no se ejecuta nada; con sesión no se ejecutan `indicadores_ahora` ni `guardar_indicadores`;
    - RLS de `cuentas_vistas`;
    - conteos de indicadores, pendientes, personas, listas y filtros.
  - Un fallo forzado confirmó que el banco detecta errores.
- **Hallazgo confirmado (P2 de 18):** con los permisos por defecto de Supabase, `has_column_privilege('authenticated', 'public.perfiles', 'rol', 'UPDATE')` es verdadero. El `revoke` por columna no restringe; lo detienen el trigger `proteger_rol` y ahora `cambiar_rol`.
- **Pantallas a 390×844:** `next dev` de la rama con un respaldo 100 % local de datos inventados y una sesión de administrador inventada (sin red ni producción). Se vio:
  - A0 con los conteos del 16 de septiembre y un indicador abierto;
  - A1 con dos pendientes y líneas de tendencia;
  - A3: ocultar y pasar la ficha dejan su línea, que sobrevive a la recarga del servidor; "Mostrar" deja "… se ve otra vez";
  - A5: con la función del resumen fallando, "No pudimos leer los indicadores · Intentar de nuevo", y Pendiente y Gestionar siguen;
  - P0, P3, P4 (hoja), P5 ("Ya es administrador", "Desde hoy, lo nombraste tú · Quitar"), P6 (hoja roja) y la vuelta a Usuario ("Ya no es administrador"); "Ver" muestra el correo con "Copiar";
  - L0 y L1 (Lugares): ocultar desde el menú deja "Oculto" y sube el filtro a 2; también Eventos, Artistas y Ajustes ("Administración · 2 pendientes").
  - Tras traer `main`, se volvieron a mirar el resumen y la hoja de hacer administrador (la hoja bloquea el desplazamiento de atrás y lo suelta al cerrar).
- **Maquetación, medida en el DOM con la página visible:**

  | Pantalla | Nodos | Profundidad |
  |---|---|---|
  | `/admin` | 117 (antes 282) | 6 (antes 8) |
  | Personas | 66 | 5 |
  | Ficha de persona | 84 | 6 |
  | Lugares | 130 | 6 |

  Ninguna tiene desplazamiento horizontal. Todos los toques llegan a 44 px salvo **Atrás, 40 px** (el componente `ui/Atras` de toda la app). El nombre de la ficha y el de quien reporta medían 20–24 px: un `::after` los lleva a 44–45 px sin mover el dibujo.
- **Consola:** "An unknown error occurred when fetching the script" en cada carga. Viene de `RegistroSW` (el service worker, código existente que ya atrapa el error): `/sw.js` responde 200. Es propio del navegador integrado, no de esta pieza.

## Desviaciones declaradas (frente a 19)
- **Decisión 6, segundo punto:** tocar el dato de atención de un renglón de Gestionar no abre la lista filtrada; todo el renglón abre la lista.
  - Por qué: dos zonas de toque en un renglón de 56 px quedan por debajo de 44 px cada una (Fitts).
  - En su lugar: la lista abre con los filtros y sus conteos a la vista (el filtro queda a un toque) y el desglose de cada indicador sí lleva a su lista filtrada.
- **Decisión 3, textos sin género:** "Foro Escénico La Lonja quedó oculto" pasa a "… ya no se ve", y "Colectivo Barro ahora lo lleva Luis Rangel" pasa a "Luis Rangel ya lleva Colectivo Barro". Así sirven para cualquier nombre de ficha.
- **Filtros:** el filtro elegido usa el chip de la app (relleno del color de acción), no el tono suave del prototipo.
- **P1:** "Nadie con «…»" sin botón "Borrar la búsqueda": la ✕ del campo ya lo hace, y dos caminos para lo mismo violan Hick.
- **A4:** la espera no escribe "Administración". Sirve también para las listas, y un título que no corresponde no sería evidencia.
- **D3 en la práctica:** "abrió la app" es abrir con sesión una pantalla raíz (Agenda, Lugares o Artistas), que es donde vive `Sesion`.

## Revisión de seguridad del PR #74 (2026-09-16, noche)
El encargado de gestión de cambios subió la rama al [PR #74](https://github.com/robscan/somosnosotros/pull/74) por orden del founder. Una revisión aparte encontró tres cosas que había que corregir antes de aplicar la migración. Están corregidas en la rama, con commit local y sin push.

1. **D1 se podía saltar con un update directo.**
   - **El problema:** `cambiar_rol` exigía una cuenta de origen, pero el trigger `proteger_rol` solo pedía `es_admin()`, y `authenticated` conserva UPDATE sobre `perfiles.rol` (P2). Un administrador nombrado podía hacer o quitar administradores, también a las cuentas de origen, sin dejar registro.
   - **Arreglo, dentro de la migración:** `proteger_rol` se reemplaza. Ahora exige una cuenta de origen, no deja bajar de rol a una cuenta de origen por ningún camino y deja él mismo el registro en `cambios_de_rol` (`cambiar_rol` ya no lo inserta).
   - **Probado:** con una copia de la migración sin el arreglo, el banco falla 32 comprobaciones: una administradora nombrada le quita el rol al fundador y lo demás se cae detrás. Con el arreglo, 95 en verde.
2. **Pendiente se quedaba vacío al reintentar.**
   - **El problema:** `useState(iniciales)` no vuelve a leer la lista después de "Intentar de nuevo". Si la primera carga fallaba, pintaba "Nada pendiente".
   - **Arreglo:** la página le pone al componente una llave que cambia entre "sin leer" y "leídos", así se monta otra vez con la lista real.
   - **Visto con el respaldo local:** error → Intentar de nuevo → "Pendiente 2" con sus dos tarjetas.
3. **Un error en la ficha de persona se leía como "cuenta borrada".**
   - **El problema:** `cargarPersona` devolvía null en los dos casos.
   - **Arreglo:** ahora devuelve `{ persona, error }`. Con error: "No pudimos leer esta cuenta · Intentar de nuevo"; sin cuenta: "Esta cuenta ya no existe".
   - **Visto:** los dos estados.

**Menores:**
- `decidirPendiente` solo pasa la ficha si el motivo es "es mío".
- En la búsqueda, `%` y `_` del correo cuentan como letras. Si lo buscado no deja letras ni números, no encuentra nada: antes lo encontraba todo, en Personas y en las listas.
- La espera lleva `role="status"`.
- La cabecera de la migración dice 0028.

**Banco en el repo:** `supabase/tests/panel_administracion.mjs`, con 95 comprobaciones. PGlite no es dependencia: se instala aparte y la cabecera del archivo dice cómo.

**Verificación:** lint (0 errores), tipos, 236 pruebas y build.

**Notas:**
- A las 21:01 apareció en este árbol de trabajo un `.env` con llaves de producción. No lo creó este chat y quedó intacto. Para mirar las pantallas, `.env.local` dejó vacías esas llaves y apuntó Supabase al respaldo local; se borró al terminar.
- `admin_correos` puede tener correos sin cuenta. Con la confirmación de cambio de correo de Supabase activada (lo normal), nadie puede ponerse ese correo. Si se desactivara, alguien podría convertirse en cuenta de origen cambiando su correo a uno de la lista. Conviene dejarla activada o quitar de la lista los correos que no se usan.

## Queda
- **Founder, antes de mezclar:**
  1. aplicar la migración (`npm run db:push`);
  2. push de `panel-admin` y PR;
  3. probar en el iPhone.

  Sin la migración el panel muestra sus errores con salida, no se rompe.
- **Aviso de privacidad:** dice que, si cambia cómo se usan los datos, se avisará por correo. Mandar ese correo (hoy, a 5 cuentas) lo decide el founder.
- **Para otra pieza:** `ui/Atras` mide 40 px (Fitts pide 44) en toda la app.
