# 103 - Base de verificacion y continuidad

Fecha: 2026-09-18. OL-072. Rama: `codex/base-verificacion`.

## Autorizacion y alcance

El founder aprobo el plan de continuidad con gestor Astra y operadores segun
complejidad ("Adelante"). Primero conciliar ramas y establecer pruebas de base
de datos reproducibles. Push, merge a main y produccion requieren indicacion
expresa. Los worktrees y cambios de Claude se conservan intactos.

## Reservas del gestor

- OL-072 / bitacora 103: inventario y banco PostgreSQL, sin migracion.
- OL-073 / bitacora 104: suscripciones push, rama `codex/push-seguro`.
- Migracion reservada para push: `20260918100000_push_validado.sql`, posterior
  a las pendientes de cupo e indicadores. No aplicar en produccion ni adelantar
  su orden respecto de las migraciones pendientes.
- Terra modifica solo package.json, package-lock.json, .github/workflows/ci.yml,
  scripts de verificacion y supabase/tests de su pieza. El gestor lleva docs.

## Punto de recuperacion

Respaldo privado fuera del repositorio: verificado nuevamente con SHA-256 en
esta sesion. Incluye historia Git, worktrees, cambios sin commit y memoria de
Claude. No incluye el estado remoto de Supabase, Storage o Vercel. Antes de
modificar datos remotos se debe verificar su recuperacion por separado.

## Inventario conciliado

Base: main y origin/main en `8f30d918`, limpios. Luna reviso solo lectura.

| Rama | Estado al recibirla | Continuidad |
| --- | --- | --- |
| tope-de-lecturas, d86b998 | 29 staged, 9 unstaged y OPEN_LOOPS unmerged | Preservar y terminar con indicadores; no repetir el trabajo |
| indicadores-rol-de-entonces, bc68eb5 | Migracion y banco ampliados sin commit | Conservar los cambios del operador y probar ambas reglas |
| nuevos-por-publicacion, 18a8435 | Limpia, diez commits propios | Revisar referencia temporal de la lista antes de integrar |
| entrar-texto-con-icono, 792b287 | Limpia, cambio propio | Pendiente real adicional, respetar diseno firmado |
| entrar-apple-google, fae91a3 | Cambio funcional equivalente a main | Conciliar documentacion; no volver a aplicar |
| hover-deslizar, a506956 | Cambio funcional integrado | Conciliar numeracion documental; no volver a aplicar |

## Banco PostgreSQL

`npm run test:db` requiere TEST_DATABASE_URL explicita y solo admite loopback.
No lee .env ni DATABASE_URL. Crea una base sn_test_ aleatoria, aplica todas las
migraciones en orden y la elimina al cerrar. Usa roles anon, authenticated y
service_role con RLS real; rechaza servidores donde esos roles ya existan.
Un bloqueo evita dos bancos sobre el mismo servidor simultaneamente.

Ejemplo con un servidor PostgreSQL 17 desechable (no Supabase local ni remoto):

```
TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55439/postgres npm run test:db
```

Las pruebas de auth y Storage usan esquemas minimos, no los servicios completos
de Supabase. El banco inicial no reemplaza todas las pruebas historicas PGlite,
ni una prueba end-to-end del navegador. No exige secretos en GitHub.

## Evidencia y pendientes

- 33 migraciones y 19 comprobaciones PostgreSQL: aprobadas.
- FORZAR_FALLO=1: salida 1 con una comprobacion fallida, como debe ocurrir.
- Base de 379 pruebas existente aprobada; con las 7 guardas del runner son 386.
- Build y typecheck aprobados. Lint sin errores; conserva el warning previo
  de `k` sin uso en docs/diseno/logotipo/iconos-sn.mjs (no se toco).
- Las pruebas DB forman parte del mismo check `verificar` que ya usa el CI.
- Terra dejo implementacion parcial al agotar cuota; el gestor la reviso,
  completo y ejecuto. La revision independiente no se pudo ejecutar por cuota;
  no se presenta como realizada.
- Falta publicacion autorizada y ejecucion del workflow real en GitHub.
- Las ramas originales de Claude y main no se han cambiado.

## Entorno local

Se instalo PostgreSQL 17 para probar en una instancia temporal, sin servicio
permanente. Homebrew ejecuto limpieza automatica y retiro ICU 74.2 requerido por
Node 22.6.0. El gestor restauro ICU desde el paquete oficial con hash verificado;
Node 22.6.0, npm 10.8.2 e Intl volvieron a funcionar. No se volvera a usar Homebrew
para este trabajo. El respaldo del proyecto no abarca instalaciones globales.
