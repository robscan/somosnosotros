# 518 · OL-486 · Regla general en el Security Advisor de la base

**Fecha:** 2026-10-29. **Rama:** `advisor-regla-general` (desde `origin/main` `945be550`). **Quién:** operador del Gestor de cambios VII, sin agentes. **Origen:** R14 del barrido de seguridad OL-482: la prueba `supabase/tests/pg/security-advisor.test.mjs` revisaba una **lista fija** de 53 firmas (OL-077, 2026-09-18); las funciones `security definer` que llegaron después no entraban y una nueva mal hecha pasaba sin aviso.

## Qué revisa ahora la regla
Además de la matriz fija (que se conserva tal cual), la prueba recorre **todo** el catálogo de los esquemas propios —hoy solo `public`; las funciones que trae una extensión (pgcrypto en el banco) no son nuestras y se saltan— y exige:

1. **`search_path = ''` en toda función.** Obligatorio en las `security definer`; hoy también lo cumplen todas las invoker, así que se exige a todas (es el aviso `function_search_path_mutable` del Advisor de Supabase).
2. **Ninguna función con EXECUTE para `PUBLIC`.** PostgreSQL se lo da por omisión a cada función nueva: quien la crea tiene que hacer `revoke all … from public` y conceder solo a quien la necesita.
3. **`anon` solo en `ANON_PERMITIDAS`** (25 funciones, cada una con su razón en el código).
4. **`authenticated` solo en `ANON_PERMITIDAS` o `AUTH_PERMITIDAS`** (76 más, en cuatro grupos con su razón).
5. **Tablas con RLS, vistas `security_invoker`, y ni vistas materializadas ni tablas foráneas legibles por los clientes**, salvo que estén en `EXCEPCIONES` con su razón. Hoy no hay ninguna excepción: las 63 tablas de `public` tienen RLS y no hay vistas.
6. **Esquemas:** un esquema nuevo que no sea de la plataforma (auth, storage, realtime, vault…) ni esté en `ESQUEMAS_PROPIOS` hace fallar la prueba hasta que se declare, para que la regla también lo recorra.

Las listas son **exactas**: una entrada que ya no existe, que perdió el permiso o que está en la lista equivocada también falla (no se pudren). Una función nueva para clientes entra en su lista, con su razón, en el mismo PR que la crea.

**Cuánto revisa:** 186 funciones y 63 tablas propias (antes, 53 firmas).

## Listas permitidas
**anon (25):** buscadores y «¿Es este?» públicos (`artistas_con_nombre`, `lugares_con_nombre`, `lugares_parecidos`, `eventos_parecidos`, `subcategorias_de`), filtros y conteos públicos (`detalles_de_disciplina`, `disciplinas_con_artistas`, `ciudades_agregadas`, `ciudades_artistas_agregadas`, `cuenta_seguidores`, `van_por_evento`), carriles públicos de Inicio (`tira_destacados`, `artistas_destacados_novedades`, `novedades_recientes_artistas`), ayudantes que evalúa la RLS también para anon (`es_admin`, `gestiona_lugar`, `gestiona_artista`, `gestiona_evento`, `bloqueado_por_mi`), funciones puras de checks y búsquedas (`zona_valida`, `push_endpoint_permitido`, `normalizar_nombre`, `distancia_m`), `registrar_ciudad_vista` (Inicio y Lugares la llaman sin sesión; suma 1 a una ciudad existente, sin persona) y `pincel_activo` (la pared y el mando la consultan desde el servidor también sin sesión; falla cerrado).

**authenticated (76 más), por grupos:**
- **Administración (40):** cada una exige `es_admin()` (o el origen) por dentro y devuelve vacío, null o `sin_permiso` al resto: `panel_*`, `admin_*`, `cambiar_rol`, `cambiar_destacado`, `dar_mas_lecturas`, `aceptar_propuesta`, `borrar_lugar_excepcional_admin`, `impacto_borrado_lugar_admin`, `instagram_sugerencias`, `redes_encolar`, `redes_reciente`, `rol_en_para_admin`, `vistas_por_origen`.
- **La propia cuenta (10):** actúan solo sobre `auth.uid()`: `mi_perfil`, `mi_push_activo`, `activar_mis_avisos_push`, `mi_cupo_de_cartel`, `apartar_lectura_de_cartel`, `marcar_visto`, `borrar_mi_cuenta`, `artistas_con_mi_correo`, `reclamar_si_correo_coincide`, `anotar_sugerencia`.
- **Publicar y editar (20):** alta y edición de fichas propias; las invoker pasan por la RLS y las definer comprueban autor, gestor o admin (`guardar_evento_*`, `editar_evento_con_sesiones`, `publicar_*`, `crear_lugar_con_horario`, `guardar_horario_lugar`, `borrar_lugar`, festivales e inauguraciones, `poner_cartel_a_evento`, `religar_sitio_a_lugar`, `recalcular_festival`).
- **Ayudantes de cálculo (6):** `ciudad_slug`, `slug_de_nombre`, `slug_de_evento`, `imagen_origen_permitido`, `inicio_del_mes`, `fin_en_programa`.

## Control negativo
Siete casos, cada uno creado **dentro de una transacción** de la prueba y deshecho con `rollback`: una `security definer` sin `search_path`, una función con EXECUTE para `PUBLIC`, una para anon fuera de la lista, una para authenticated fuera de la lista, una tabla sin RLS, una vista sin `security_invoker` y un esquema sin declarar. La prueba comprueba que la regla señala cada uno con su motivo y que, tras el rollback, no queda nada.

**Forzado:** con `FORZAR_ADVISOR_MAL=1` la prueba deja a propósito (sin rollback) una `security definer` sin path. La corrida falla con cuatro motivos (`sin search_path`, `PUBLIC`, anon, authenticated): `x 2785 pruebas: 4 fallaron`.

## Funciones reales que incumplían (diez)
La regla, sin la migración nueva, da **30 fallos en diez funciones** (`x 2811 pruebas: 30 fallaron`). Ninguna se arregló en silencio; todas son de forma clara (falta el path o falta un `revoke`) y se corrigen en `supabase/migrations/20261029220000_advisor_regla_general.sql`, que solo hace `alter function … set search_path = ''`, `revoke` y el `grant` explícito que conserva a quien hoy la necesita (cada línea explicada en la migración):

| Función | Migración de origen | Qué tenía | Qué se hizo |
|---|---|---|---|
| `bloqueado_por_mi(uuid)` | `20260925150000_bloqueos.sql` | `security definer` con `search_path = public`; EXECUTE para PUBLIC | path vacío (el cuerpo ya cualifica `public.bloqueos` y `auth.uid()`); se quita PUBLIC y queda explícita a anon, authenticated y service_role, porque la evalúan las políticas de lectura de `eventos` y `novedades_artista` también para anon |
| `avisos_admin_trigger_reportes()`, `_eventos()`, `_lugares()`, `_artistas()`, `_perfiles()` | `20260922150000_avisos_admin.sql` | disparadores `security definer` con EXECUTE para PUBLIC, anon y authenticated | se quitan a los clientes y queda service_role. Era el mismo hueco que OL-077 cerró en `crear_perfil`: una cuenta podía ponerlos en una tabla temporal suya y encolar avisos falsos a la administración |
| `eventos_clase_coherente()` | `20261006160000_eventos_clase.sql` | disparador invoker con EXECUTE para PUBLIC | se quita a los clientes |
| `eventos_colores_cartel_al_cambiar()` | `20261009120000_colores_cartel.sql` | ídem | ídem |
| `eventos_cartel_huella()` | `20261028130000_cartel_huella.sql` | ídem | ídem |
| `fin_en_programa(timestamptz,timestamptz,text)` | `20261009130000_festival_rango_ultimo_acto.sql` | cálculo puro con EXECUTE para PUBLIC | se quita a PUBLIC y anon; queda a authenticated (la usa `recalcular_festival`, invoker, solo authenticated) y service_role |
| `pincel_activo()` | `20260922180000_pincel_freno.sql` | invoker con EXECUTE para PUBLIC | se quita PUBLIC; queda explícita a anon, authenticated y service_role |

Ningún disparador necesita EXECUTE del cliente para dispararse: PostgreSQL solo lo comprueba al crear el disparador (el banco ya prueba lo mismo con `crear_perfil` y `poner_nombre_orden`), así que quitarlo no cambia ninguna escritura.

## Comprobación
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: **122 migraciones, `ok 2781 pruebas: 0 fallaron`** (eran 2772; las nuevas son la regla, siete controles y la limpieza del rollback).
- Con `FORZAR_ADVISOR_MAL=1`: `x 2785 pruebas: 4 fallaron` (los cuatro motivos de la función forzada).
- Sin la migración nueva: `x 2811 pruebas: 30 fallaron` (las diez funciones de la tabla).
- `eslint` del archivo de prueba sin avisos. Solo el banco local; nada en producción.

## Para publicar
La migración `20261029220000_advisor_regla_general.sql` solo quita permisos y fija el path; no pide variables. Se aplica con las demás de la tanda; va después de `20261029200000` y `20261029210000` (otras piezas).
