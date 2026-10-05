# 309 · CI en paralelo

Fecha: 2026-10-04. OL-281. Rama `ci-paralela`, base `9fa3d4e529f8c0ec3c287910077aede0e6fdb8a7` (`origin/main`).

El founder pidió acelerar los ajustes conservando las pruebas y la coordinación con el gestor. Gestor III autorizó esta pieza, sus archivos y dos ejecuciones completas para medirla; la publicación sigue requiriendo su «publica».

## Cambio

La CI anterior ejecutaba todas las comprobaciones consecutivamente. Se reparten en tres trabajos independientes: `codigo` (lint, tipos, unitarias y build sin variables), `contratos` (PostgreSQL real) e `interfaz` (inventario, Chromium, componentes y medir).

El trabajo final conserva exactamente el nombre obligatorio `verificar`. Se ejecuta con `always()` y solo aprueba si los tres resultados son `success`; fallo, omisión o cancelación impiden aprobar. No necesita checkout ni instalación.

Las revisiones del mismo PR comparten grupo de concurrencia y cancelan la ejecución obsoleta. Cada push usa su `run_id`: no comparte grupo con otro push, tampoco cancela ejecuciones pendientes de main. Referencia: [concurrencia de GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

Se conservan los nueve comandos de validación, sus parámetros, el timeout de componentes, PostgreSQL 17 y su entorno local. Permanecen las dos compilaciones porque comprueban entornos distintos. Cada runner necesita su propio `npm ci`; se medirá también la suma de tiempo de los trabajos para distinguir menos espera de menos cómputo.

## Verificación previa

- YAML válido; comparación estructural contra el workflow de la base: mismos comandos, triggers, versiones de acciones y servicio SQL; tres trabajos sin dependencias entre ellos.
- Script real de `verificar` ejecutado en Bash con las 64 combinaciones de success/failure/cancelled/skipped: solo aprueba tres éxitos.
- Grupos evaluados: mismo PR estable, distintos PR separados y push únicos; cancelación activada exclusivamente para pull_request.
- Revisión independiente solo lectura del diff: sin hallazgos bloqueantes.
- `git diff --check` correcto. Solo workflow, esta bitácora y entrada propia de OPEN_LOOPS. No cambia producto, pruebas, cuarentenas, presupuestos, permisos, dependencias ni secretos.

## Medición y entrega

Base comparable: [CI 37251865146](https://github.com/robscan/somosnosotros/actions/runs/37251865146), push de `9fa3d4e`, verde. Desde creación hasta último job completo: **7 min 18 s** (01:33:10–01:40:28 UTC). Trabajo `verificar`: **7 min 15 s** (01:33:13–01:40:28 UTC). Código de producto idéntico al candidato de esta pieza.

Pendientes al preparar el candidato: dos ejecuciones verdes del mismo SHA y comparación de tiempos. Sus enlaces, resultados y tiempos finales se incorporan al PR y a la entrega consolidada al gestor para reutilizar la evidencia sin otro commit documental ni una tercera suite por rutina. Si no hay mejora clara, se devuelve la propuesta sin publicarla.

Entrega: PR sin unir; el gestor revisa el SHA y la evidencia y publica únicamente con autorización del founder. No hay migraciones, variables nuevas ni pasos remotos en Supabase o Vercel.
