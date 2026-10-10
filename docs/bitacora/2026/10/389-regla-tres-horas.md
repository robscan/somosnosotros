# 389 · La regla de las 3 horas (OL-358)

**Fecha:** 2026-10-09. **Rama:** `regla-tres-horas`, base `origin/main` (`373fec25`). **Operador:** Claude (agente del gestor).
**Estado:** código y migración listos, verificación completa en verde. **La migración NO está aplicada**: la aplica el gestor antes de unir.

## Qué se decidió

Founder, 2026-10-09: **un evento sin hora de fin deja de verse 3 horas después de empezar, en toda la app.** Sustituye su regla del 2026-09-16 (sin hora de fin, el evento seguía hasta la medianoche de su día), que a las 18:00 todavía mostraba «Inauguración: Dos siglos a través de la lente, 10:00» (bitácora 388). Medida: de 36 eventos con hora de fin, 20 duran 3 h o menos (`src/app/nuevo/evento/pasos.ts` ~469).

## Dónde vive la regla (dos lados que dicen lo mismo)

- **Base:** la columna generada `eventos.termina` = `coalesce(fin, inicio + 3 h)`. Migración `supabase/migrations/20261009100000_termina_tres_horas.sql`. Ya no depende de la zona. Se escribe `timezone('UTC', timezone('UTC', inicio) + interval '3 hours')` porque Postgres no admite `timestamptz + interval` en una columna generada (no es inmutable); en UTC da lo mismo (3 h reales, también en el cambio de horario).
- **App:** `terminaDe` en `src/lib/fechas.ts` (constante `DURACION_SIN_FIN_MS`); de ella cuelgan `eventoPaso`, `ocurrenciaPaso` (`src/lib/ocurrencias.ts`), `periodoDePrograma` (festivales) y `sitioReservadoVencido` (`src/lib/retencionSitio.ts`). `filtroSinPasar` sigue filtrando con `termina >= ahora`.

## Qué cambió

- **Migración** (solo sustituye; se puede repetir): quita y vuelve a crear `eventos.termina` con la expresión nueva, sus dos índices `eventos_termina_idx` y `eventos_ciudad_termina_idx` (iguales) y su `comment`. No hay vistas que usen la columna. Sí la usa una política, `"sitio privado: autor, admin, o con sesión cuando toca"` en `eventos_sitio_privado`: se aparta un momento a una versión sin `termina` y se repone tal cual la dejó `20261003130000_sitio_privado_purga.sql`, todo en una transacción. Las funciones SQL que filtran con `e.termina` (destacados, tope_de_lecturas, indicadores, coincidencias_lista, rol_de_entonces, festivales, purga del sitio privado) no cambian: la columna conserva su nombre.
- **TS:** `terminaDe` devuelve `fin` o `inicio + 3 h`; comentarios de `eventoPaso`, `filtroSinPasar`, `ocurrenciaPaso`, `periodoDePrograma`, `eventosEstaSemana`, `ocurreEstaSemana`, `FIN_DEL_DIA` y `SesionGuardada` al día.
- **`tramo` / `diaPin`** (el «Hoy» del pin del mapa) llamaban a `eventoPaso(inicio, null)`: con la regla nueva un evento de 10:00 con fin a las 20:00 habría perdido su «Hoy» a las 13:01. Ahora `tramo` solo agrupa por el día en que empieza («pasado» = un día anterior a hoy), que es exactamente lo que daba la regla vieja; si se ve o no lo sigue decidiendo `eventoPaso`.
- **`proximoPorSede`** (pin de cada sede de un festival) pasaba `null` como fin: ahora pasa el `fin` del acto (`ActoConSitio.fin`, opcional; la consulta de la ficha ya lo trae).
- **Respaldo local** (`scripts/ops/auditoria-ui/respaldo-local/fixture.mjs`): un evento creado sin fin imita la columna con `inicio + 3 h` (antes 4 h).
- **Textos para la persona:** ninguno decía «hasta que termine el día» (solo comentarios de código), así que no cambió ningún texto visible.

## Pruebas

- `fechas.test.ts`: sin fin a las 10:00 sigue a las 12:59 y ya pasó a las 13:01; con fin manda el fin (también un fin corto, antes de 3 h); la regla no depende de la zona (Madrid, Tokio, sin zona); una noche de 22:00 sin fin sigue a la 1:00; banco por zona con 3 h reales en los cambios de horario de Madrid.
- `ocurrencias.test.ts`: una sesión sin fin se ve 3 h (17:00 → 20:00 incluido, 20:01 ya no) y `ocurrenciaPaso` con 10:00 → 12:59 / 13:01.
- `inicio.test.ts`: «Esta semana» y Agenda usan el mismo fin (frontera inclusiva a las 3 h, Los Ángeles, Tokio, Nueva York en el cambio de horario).
- `claseEvento.test.ts`, `retencionSitio.test.ts`: periodo del festival y retención del sitio reservado con inicio + 3 h.
- Contratos SQL (`npm run test:db`, Postgres 17 local en el puerto 55439, base desechable): `sitio-privado-ventana` (3 zonas × empezó hace 1, 4 y 6 h: el tercero ve la dirección hasta inicio + 3 h + 2 h), `eventos-clase` y `sugerencias-al-publicar` (el festival llega a 3 h después del inicio de su último acto sin fin). **93 migraciones aplicadas, 1951 pruebas, 0 fallaron.**

### Los 4 casos (salida real de `terminaDe`, zona America/Mexico_City)

| Caso | `terminaDe` | ¿Ya pasó? |
|---|---|---|
| Sin fin, empieza 10:00 (16:00Z); reloj 12:59 | `2026-10-09T19:00:00.000Z` (13:00) | no |
| Sin fin, empieza 10:00; reloj 13:01 | `2026-10-09T19:00:00.000Z` (13:00) | sí |
| Con fin 17:00 (23:00Z), empieza 10:00; reloj 13:01 | `2026-10-09T23:00:00.000Z` (17:00) | no |
| Sesión sin fin, empieza 17:00 (23:00Z); reloj 20:01 | `2026-10-18T02:00:00.000Z` (20:00) | sí (`ocurrenciaPaso`) |

## Verificación

`npm run lint` (0 errores; 1 aviso ajeno en `VisorImagen.componentes.test.mjs`) · `npm run typecheck` ok · `npm test` 187 archivos, 3407 pruebas en verde · `npm run inventario` sin novedades · `npm run medir` 37 pantallas × 4 anchos sin novedades · `npm run test:db` 1951 pruebas, 0 fallaron. Sin UI nueva: en vez de capturas, la tabla de arriba.

## Lo que no se tocó y por qué

- **Festivales que terminan tarde:** el periodo de un festival es del primer acto al `termina` del último. Si el último acto no tiene fin y empieza después de las 21:00, su fin cae pasada la medianoche y «Del 12 al 14 de nov» pasaría a decir un día más (`ultimoDiaDelPeriodo` solo trata las 00:00 justas como final del día anterior). Antes daba la medianoche exacta. No lo toqué (lo pide el encargo: si una clase depende de la medianoche, explicarlo); arreglo sugerido: que el rango de un festival tome como último día el del inicio del último acto cuando ese acto no tiene fin.
- **Eventos de varios días sin hora de fin** (`FIN_DEL_DIA` 23:59): el evento entero sigue hasta las 23:59 del último día (su `fin` existe). Cada día suelto en «Esta semana» (`ocurrencias`) queda sin fin y ahora se ve 3 h desde su hora de inicio, igual que una sesión sin fin. Es lo pedido; si una exposición de varios días se reparte así, su día deja de salir en «Esta semana» a las 3 h (la exposición en sí sigue visible).
- **Dirección reservada del sitio privado:** el tercero la ve hasta `termina + 2 h`; para un evento sin fin pasa de «medianoche + 2 h» a «inicio + 5 h». La retención de 168 h cuenta desde el `termina` nuevo. Es consecuencia directa de la regla; la política no cambia.
- `public.sin_pasar` (regla vieja, ya sin uso desde la 0029) se queda: las migraciones solo añaden.
- Producción y `.env` intactos; la migración no se aplicó.
