# 485 · Aceptar desde la Mac todas las propuestas de una corrida (OL-453)

**Fecha:** 2026-10-22. **Rama:** `aceptar-corrida`, desde `origin/main` (`5325e236`, con #571). **Operador:** agente de la pieza (Claude) para el
Gestor VII, sin otros agentes. **Migración:** `20261022170000_aceptar_propuesta_como.sql` (solo añade). **Variables:** ninguna. **Pantallas:** ninguna (la bandeja acepta igual que antes).
**Estado:** lista para la revisión del gestor.

## El pedido

Con la carga real de la cartelera corriendo, el founder: «no me pongas a aprobar en front, aprueba tú por favor». Hace falta aceptar desde la
Mac las propuestas de una corrida por el mismo camino que «Aceptar» de la bandeja de Ciudades.

## Qué cambió

- **`src/lib/rutinas/aceptarPropuesta.ts`**: `aceptarLeida`, lo que hacía `aceptarPropuesta` de `src/app/admin/ciudades/acciones.ts` para un
  lugar, un evento o un artista, movido tal cual (validación y «¿es este?» del lugar, la del artista; `prepararEvento` → marcar → insertar →
  ligar la ficha → poner la imagen como cartel; las notas «se publicó sin cartel», «se publicó con costo por confirmar», la espera de un acto,
  los actos de un festival; los mismos errores). Lo que cambia entre la bandeja y el guion va en sus dependencias: con qué se marca, con qué se
  pregunta «¿es este?», qué se vuelve a pintar. La acción ahora solo comprueba la sesión, lee la propuesta, deja los carteles como estaban y
  llama a `aceptarLeida` con la sesión (para `aceptar_propuesta`) y la llave de servicio (para publicar). `acciones.aceptar.test.ts` sigue en
  verde sin tocarlo.
- **`aceptar_propuesta_como(p_autor, p_id, p_ficha)`** (migración `20261022170000_aceptar_propuesta_como.sql`, solo añade):
  `aceptar_propuesta` exige una sesión de admin (`auth.uid()`) y el guion no la tiene (no se entra con contraseña). En vez de copiar su lógica
  (decisión del gestor: «no quiero dos lógicas que se separan»), esta función comprueba que `p_autor` es admin (su perfil con rol «admin», la
  regla de `es_admin()`, que pone `admin_correos`), fija solo para la transacción el sujeto de la sesión (`request.jwt.claims` con `sub` y
  `role`, y `request.jwt.claim.sub`) y llama `aceptar_propuesta(p_id, p_ficha)` tal cual, devolviendo lo que devuelve. `security definer`,
  `revoke all … from public, anon, authenticated` y `grant execute … to service_role`: solo la llave de servicio la llama.
- **`scripts/instituciones/aceptar-corrida.ts`** (por `correr.mjs`): comprueba que `--autor` sea admin, lee las propuestas **sin decidir** de la
  corrida y las acepta **en orden: lugares, artistas y eventos (los festivales primero)**, así los eventos quedan en sus recintos recién
  aceptados (al publicar, la cartelera solo liga por nombre exacto, OL-451) y los actos encuentran su festival. En serie, con 200 ms entre
  propuestas; si la bandeja diría «Intenta de nuevo» o «Sin conexión», espera 2 s y reintenta una vez. Lo que no se puede aceptar se queda en la
  bandeja como estaba y va al informe con su motivo; nada se rechaza solo. Los carteles («Buscar carteles») no los toca. Se puede volver a
  correr: solo mira lo que sigue sin decidir. `--simular` comprueba cada una (todo lo de antes de marcarla) y no escribe nada; `--solo lugar|
  evento|artista` y `--limite N` acotan. El informe (`scripts/instituciones/salida/aceptar-corrida-…md`, y sin `--simular` los ids aceptados):
  revisadas y aceptadas por tipo, eventos con imagen con cartel y sin cartel, las notas de lo aceptado y lo no aceptado agrupado por motivo con
  cinco ejemplos cada uno. En la consola, una línea por propuesta.

## Decisiones por confirmar

1. **Resuelta por el gestor:** nada de copia en TypeScript de `aceptar_propuesta`; el guion usa `aceptar_propuesta_como` (arriba). Hay que
   aplicar la migración `20261022170000` antes de correr el guion sin `--simular` (con `--simular` no se llama).
2. **`--simular` no sabe de los lugares que se aceptarían en la misma corrida:** un evento cuyo recinto también está propuesto se comprueba como
   sitio con el punto de la cartelera, y uno sin punto sale «el mapa no lo encuentra» aunque al aceptar de verdad sí quedaría en su lugar. Para
   ver lo real: primero `--solo lugar` sin simular y luego `--simular` de los eventos.
3. Los eventos que la bandeja acepta pero no pudo insertar («se publica con la siguiente corrida de agendas») quedan aceptados sin evento, como
   en la bandeja; los publica la siguiente corrida de agendas de la ciudad.

## Evidencia

- `npm run lint` (0 errores; el aviso de `VisorImagen.componentes.test.mjs` ya estaba), `npm run typecheck`, **`npm test`: 4 631 pruebas**,
  **`test:db`: 109 migraciones, 2 373 pruebas, 0 fallaron**, `npm run inventario` y `npm run medir` sin novedades, **`npm run test:componentes`: 719 de 719**.
- `scripts/instituciones/aceptar-corrida.test.ts` (base falsa, sin red): el recinto se acepta antes que el evento propuesto antes que él y el
  evento queda en ese lugar, a nombre del admin, ligado a su propuesta; la imagen que no baja deja «se publicó sin cartel»; un costo que no es
  cifra, «costo por confirmar»; lo que ya pasó se queda «propuesta» sin motivo de rechazo y sale en el informe; carteles y lo ya decidido no se
  tocan; 200 ms entre propuestas; volver a correr no repite nada; `--simular` no escribe nada; `--solo` y `--limite`; un `--autor` que no es admin
  no puede; la base que no responde se reintenta a los 2 s; lo que se marca va por `aceptar_propuesta_como` a nombre del admin; el orden y los motivos agrupados.
- `supabase/tests/pg/aceptar-propuesta-como.test.mjs`: la llave de servicio acepta a nombre del admin y devuelve lo mismo que la bandeja
  (`aceptar_propuesta` con la sesión del admin): la ficha con `creado_por` = el admin, la propuesta aceptada por él con su ficha; aceptar dos
  veces no crea otra ficha; después de la llamada no queda ningún sujeto puesto; un autor que no es admin, uno que no existe y sin autor fallan
  (42501) y la propuesta sigue sin decidir; un visitante, una cuenta y hasta el admin con su sesión no pueden llamarla (42501).
- El guion compila (`node scripts/instituciones/correr.mjs aceptar-corrida` sin argumentos dice su uso). No lo corrí contra ninguna base.

## Para el gestor

Desde la carpeta principal (la del `.env`), con la corrida de la carga de la cartelera ya terminada:

```
node scripts/instituciones/correr.mjs aceptar-corrida <corrida_id> --autor <id del admin> --solo lugar --simular
node scripts/instituciones/correr.mjs aceptar-corrida <corrida_id> --autor <id del admin> --solo lugar
node scripts/instituciones/correr.mjs aceptar-corrida <corrida_id> --autor <id del admin> --simular
node scripts/instituciones/correr.mjs aceptar-corrida <corrida_id> --autor <id del admin>
```

(o solo la última, que ya va en orden). Con ~740 eventos y ~180 lugares, unos 15 a 25 minutos: cada evento con imagen baja, prepara y sube su
cartel.
