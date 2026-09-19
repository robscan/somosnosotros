# 056 · Invitación por correo al CAPO

**Fecha:** 2026-09-16 · **Rama:** `invitacion-capo` · **Pieza:** OL-011

## Qué pidió
Repartido en la bitácora [052](052-firma-y-cola-en-marcha.md): la invitación por correo a los 520 artistas importados del Catálogo de Artistas Potosinos (CAPO), en tandas de 15 a 20 al día, para que reclamen su ficha con "Soy yo / es mi grupo". Plantilla y script con ensayo; sin mandar nada hasta que el founder apruebe el texto.

## Qué se hizo
- **Plantilla** [`scripts/capo/invitacion.md`](../../../../scripts/capo/invitacion.md): dos variantes de asunto (A con el nombre por delante, B en pregunta) y un cuerpo de texto llano, un solo llamado ("Ábrela y toca 'Soy yo / es mi grupo'"), dice de dónde salió la ficha (el catálogo municipal) y que se puede pedir que se quite; firma "Somos Nosotros".
- **Script** [`scripts/capo/invitar.ts`](../../../../scripts/capo/invitar.ts): corre con `npx tsx scripts/capo/invitar.ts [N] [--ensayo|--enviar]`. Toma `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` y `CORREO_REMITENTE` de `/Users/apple-1/somosnosotros/.env` (las carga él mismo, sin imprimirlas). Elige los artistas del CAPO con correo en `contactos_importados` y sin fila en `invitaciones_enviadas` (uno por artista, aunque el catálogo trajera dos correos), manda con la misma llamada a Resend que usa `src/lib/correo.ts` (reescrita aquí porque ese módulo trae `"server-only"` y no corre fuera de un componente de servidor) y anota cada envío (`artista_id`, `correo`, `enviado_en`, `resend_id`). Si Resend falla para alguien, lo anota en la consola y sigue con el resto sin marcarlo como invitado (se reintenta otro día). Modo `--ensayo` por defecto: no manda ni escribe, solo imprime la tanda (nombre y correo enmascarado), el asunto y cuerpo con el primer artista, y cuántos quedan.
- **Migración** [`supabase/migrations/20260916100000_invitaciones.sql`](../../../../supabase/migrations/20260916100000_invitaciones.sql): tabla `invitaciones_enviadas`, sin políticas (solo la llave de servicio la lee), como `contactos_importados`. **No se aplicó a producción.** Mientras no exista, el script trata "nadie invitado" (atrapa el error de PostgREST `PGRST205`, tabla fuera de su caché de esquema) para que el ensayo funcione hoy mismo.
- **Pruebas** en `scripts/capo/invitar.test.ts` (7, siguiendo el patrón de `capo.test.ts`: solo lo puro): asunto en sus dos variantes, cuerpo del correo con la liga y el llamado, enmascarado del correo y elección de la tanda (un correo por artista, tamaño exacto, `n = 0`).

## Ensayo
`npx tsx scripts/capo/invitar.ts --ensayo` contra producción (solo lectura): **476 artistas pendientes** de invitar hoy (con correo y sin invitación previa). Tanda de 15, primero de la lista **MOSKIN** (`oc…@gmail.com`):

```
Asunto: MOSKIN, tu ficha ya está en Somos Nosotros
Cuerpo: Hola,

Tomamos tu ficha del Catálogo de Artistas Potosinos (el catálogo de la
Dirección de Cultura Municipal) para armar el directorio de Somos Nosotros...

Tu ficha está aquí: https://somosnosotros.org/artistas/<id>

Ábrela y toca "Soy yo / es mi grupo" para hacerla tuya...
Si prefieres que no aparezcas, ábrela y toca "Soy yo / es mi grupo" también...

Somos Nosotros

Quedarían 461 pendientes después de esta tanda.
```

Los otros 14 de la tanda de hoy (correo enmascarado): José Gerardo Méndez González Foster (`ge…@gmail.com`), Julia Tello (`ju…@gmail.com`), Victoria Dorado Novellino (`v.…@gmail.com`), Yahir de Valero (`pe…@gmail.com`), Zerendipia espectáculos (`ri…@hotmail.com`), Sombrilla Clown (`da…@gmail.com`), Juan Bernardo torres segura (`be…@gmail.com`), Mayra Ortega De León (`ma…@gmail.com`), Mayela Guadarrama Briones (`ma…@outlook.com`), Claudia Rodríguez (`cl…@gmail.com`), Oscar Fernando Delgado Martínez (`os…@gmail.com`), Lizette Barrón (`li…@gmail.com`), Flora Piñon (`gu…@gmail.com`), Daniela Saldierna (`da…@gmail.com`).

**No se mandó ningún correo.** Lint, typecheck y 154 pruebas (23 archivos) en verde.

## Queda
- Aprobar el texto de la invitación (y elegir variante de asunto, A o B) — el founder.
- Aplicar la migración `20260916100000_invitaciones.sql` a producción cuando se apruebe el texto.
- Empezar a mandar tandas de 15–20 al día con `npx tsx scripts/capo/invitar.ts --enviar` (476 pendientes hoy; a 15 por día, unos 32 días).

## Firma
Pendiente del founder.

## Primera tanda (2026-09-16, noche)
El founder aprobó el texto mandando la primera tanda él mismo: `npx tsx scripts/capo/invitar.ts --enviar` → 15 mandados, 0 fallidos, 461 pendientes. Los 15 quedaron anotados en `invitaciones_enviadas` con su id de Resend. Cadencia: una tanda al día.

## Tandas diarias

- 2026-09-17 · mandados 15 · fallidos 0 · quedan 446
- 2026-09-18 · mandados 15 · fallidos 0 · quedan 431. Ejecutado desde Codex a petición del founder tras fallar la rutina de Claude por falta de créditos; se verificó que no hubiera envíos registrados hoy antes de ejecutar.
