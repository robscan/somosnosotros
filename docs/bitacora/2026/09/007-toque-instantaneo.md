# 007 · El toque responde al instante (2026-09-13)

Rama `toque-instantaneo`. El founder: "cuando doy tap en una acción como agregar evento pasa mucho tiempo (más de 400 ms) antes de que suceda algo".

## Medición (producción, antes)

Tiempo hasta el primer byte desde el escritorio, 3 muestras por pantalla: `/` 415–456 ms · `/entrar` 385–414 ms · `/lugares/nuevo` (solo redirige) 362–378 ms · `/eventos/nuevo` (redirige) 376–399 ms · ficha de lugar 404–457 ms · `/api/estado` 594–649 ms. La petición entra por `sfo1` y la función corre en `iad1` (x-vercel-id). Toda pantalla se genera en el servidor (lee la sesión por cookies), así que cada toque es un viaje de ida y vuelta, y hasta que llega no se dibuja nada.

## Qué cambió

1. **Pantalla de espera instantánea por sección** (`loading.tsx` en `entrar`, `perfil`, `lugares`, `eventos` → `ui/Cargando`): Next la muestra en el primer toque, antes de que responda el servidor. Esqueleto con pulso y "Cargando…".
2. **Estado de pulsado y sin espera de doble toque**: `touch-action: manipulation` en enlaces, botones, campos; `:active` baja la opacidad al instante.
3. **Sesión sin ir a la red**: `proxy.ts` y `usuarioActual()` usaban `auth.getUser()`, que llama a Supabase Auth en cada petición (dos veces por pantalla). Ahora `auth.getClaims()` verifica el token localmente y refresca solo si hace falta; queda una sola consulta de red, la del perfil. En el servidor local `proxy.ts` pasó de 100–136 ms a 6–13 ms por petición. Las acciones de escritura siguen usando `getUser()`.

## Verificación

- Lint, typecheck, 39 tests, build.
- Con sesión real (usuario desechable, borrado): `/perfil` muestra correo y perfil leídos de los claims; el panel muestra el nombre. Logs del servidor: `proxy.ts: 6ms`.
- Lo que no depende de nosotros: región `iad1` y arranques en frío de Vercel. Se mide en producción tras el merge.
