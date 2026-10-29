# 516 · OL-484 · Un secreto para cada cosa y el token de Meta amarrado al servidor (R3 y R5 del barrido OL-482)

**Fecha:** 2026-10-29. **Rama:** `meta-secreto-propio` (desde `origin/main` `38398f0f`, con OL-479 y OL-481 ya unidas). **Quién:** operador de
Gestor de cambios VII (agente en árbol aislado, sin subagentes). Sin migración ni cron nuevo.

## Por qué
El founder aceptó las recomendaciones del barrido de seguridad del 2026-10-29 (OL-482):
- **R3.** `CRON_SECRET` servía para demasiadas cosas: los crons, los latidos de la base, la firma del `state` de «Conectar Instagram» y la prueba
  de avisos a **cualquier** persona. Si se filtraba, servía para todo.
- **R5.** El token de la página de Meta no caduca y, si se filtra, sirve desde cualquier lado. Con `appsecret_proof` en cada llamada solo sirve
  junto con el secreto de la app, que solo tiene nuestro servidor; después el founder activa «Exigir el secreto de la app» en Meta.

## Qué cambia
1. **La firma del `state` de «Conectar Instagram» sale de `META_APP_SECRET`** (`secretoDeEstado()` en `src/lib/instagram/conexion.ts`), ya no
   de `CRON_SECRET`. Sin `META_APP_SECRET`, null → la conexión dice «Falta configurar la conexión con Meta en el servidor» (clave `config`). La
   llave del HMAC sigue siendo `instagram-conectar:<secreto>`, así que la firma no se confunde con `appsecret_proof` (que usa el secreto solo).
   Prueba: un `state` firmado con la llave vieja ya no se lee (`conexion.test.ts`).
   **Aviso al publicar:** un `state` emitido en los 10 minutos anteriores al despliegue deja de servir («El enlace para conectar caducó»);
   basta volver a tocar «Conectar Instagram».
2. **`POST /api/avisos/prueba` solo manda a cuentas de la administración.** Con el secreto correcto, si el `usuario_id` no es de un perfil con
   `rol = 'admin'`, responde 403 `{ ok: false, error: "solo_administracion" }` sin leer teléfonos ni llamar a Apple; si la base falla al leer el
   perfil, 503. Prueba en `route.test.ts` (rol `usuario`, rol vacío y perfil inexistente → 403 y `enviarPushApns` nunca se llama).
3. **`appsecret_proof` en toda llamada a la Graph API que lleva token.** Un solo sitio lo calcula: `src/lib/instagram/prueba-secreto.ts`
   (`pruebaDeSecreto` = HMAC-SHA256 del token con `META_APP_SECRET`, en hexadecimal; sin `appsecret_time`). Lo usan:
   - `llamarGraph` (`src/lib/instagram/api.ts`): publicar en Instagram (contenedor, espera, `media_publish`, enlace), el carrusel, el cupo, leer
     una página de ubicación, y todo el cliente de la página de Facebook (`src/lib/facebook/api.ts`, que llama por `llamarGraph`).
   - la vuelta de «Conectar Instagram» (`pedir` en `conexion.ts`): `/me/permissions` y `/me/accounts`, con el secreto de la app de la config. El
     cambio del código (`/oauth/access_token`) no lleva token sino `client_secret`, y va sin prueba.
   - La cola de redes (`src/lib/redes/**`) no llama a Meta directo: pasa por `publicar`, `publicarCarrusel`, `cupo` y `publicarEnPagina`, así
     que también va con la prueba. Business Discovery todavía no existe en el código (solo el permiso para leer cuentas); cuando se escriba,
     que vaya por `llamarGraph` y ya lleva la prueba.
   **Sin `META_APP_SECRET`:** la llamada sale sin la prueba (como hasta hoy), `publicar`, `publicarCarrusel` y `publicarEnPagina` devuelven
   `sinPrueba: true` (y `llamarGraph`, en su respuesta), y queda **una** línea por proceso en el registro de Vercel, sin ningún valor:
   `meta: falta META_APP_SECRET; las llamadas a la Graph API salen sin appsecret_proof`.
   Pruebas: `prueba-secreto.test.ts` con un vector fijo calculado con `crypto` (token y secreto inventados); `api.test.ts` comprueba la prueba en
   las cuatro llamadas de una publicación y en carrusel, cupo y página, y el caso sin secreto; `facebook/api.test.ts` igual; la Graph falsa de
   `conexion.test.ts` ahora contesta error si la prueba no cuadra (como Meta con «Exigir el secreto de la app») y la vuelta completa sigue en
   «conectado». Las pruebas que ya había de `api.test.ts`, `api-carrusel.test.ts`, `conexion.test.ts` y `redes` siguen en verde (con
   `META_APP_SECRET` inventado en el entorno de la prueba).
4. **Permisos pedidos al conectar: sin `business_management`.** Ninguna llamada del código usa la API de negocios (`/me/businesses`,
   `/{business-id}/owned_pages`, `client_pages`…): la página sale de `/me/accounts`, que pide `pages_show_list`; publicar pide `instagram_basic`,
   `instagram_content_publish`, `pages_read_engagement` y, para el espejo, `pages_manage_posts`; leer cuentas, `instagram_manage_insights`.
   `PERMISOS_PEDIDOS` (`src/lib/instagram/conexionEstado.ts`) pasa de siete a seis. No cambia nada más de la conexión: la conexión ya guardada
   sigue igual (sus permisos concedidos no se tocan) y `business_management` nunca estuvo en `PERMISOS_PARA_PUBLICAR`.
   **Riesgo, anotado:** según Meta, si el rol de la cuenta sobre la página llega por el portafolio de negocio y no directo, `/me/accounts` podría
   no listar la página sin ese permiso. Se vería al reconectar como «La cuenta que entró no administra la página Somos Nosotrxs» (clave
   `pagina`); entonces se repone `business_management` en `PERMISOS_PEDIDOS` (una línea) y se reconecta.
5. **La captura de «Conectar Instagram»** (`scripts/ops/auditoria-ui/capturar-instagram-conectar.mjs`) lleva ahora un `META_APP_SECRET`
   inventado, porque la firma del `state` ya no sale de `CRON_SECRET`.

Sin pantallas nuevas ni cambiadas: no hay captura móvil que tomar (la frase de `config` y la de «caducó» ya existían).

## Pieza futura (no hecha): un secreto propio para los latidos de la base
Los latidos de `pg_cron` (avisos, rutinas, carteles, cola de redes; migraciones de OL-086, OL-444 y OL-465) llaman a la app con el valor de
`CRON_SECRET` guardado en Vault (`avisos_cron_secret`). Con este cambio ese valor ya no firma la conexión de Instagram ni manda avisos a
cualquiera, pero todavía abre todas las rutas de cron. Siguiente paso sugerido: un `LATIDO_SECRET` propio en Vault y en Vercel, aceptado solo
por las rutas que llaman los latidos (`/api/avisos-pendientes`, `/api/rutinas/correr`, `/api/redes/correr`), para que quien lea Vault no tenga
también el secreto de los crons de Vercel. Pide migración (cambiar el secreto que leen los latidos) y una ventana en la que las rutas acepten
los dos; por eso queda fuera de esta pieza.

## Comprobación
- `npm run lint`: 0 errores (2 avisos de antes, en archivos que no toca la pieza).
- `npm run typecheck`: sin errores.
- `npm test`: 313 archivos, 5056 pruebas en verde.
- `TEST_DATABASE_URL=postgres://127.0.0.1:5432/sn_control npm run test:db`: 122 migraciones, 2847 pruebas, 0 fallaron.
- `npm run inventario`: sin novedades.
- `npm run medir`: 62 pantallas × 4 anchos, sin novedades.

## Guion para el gestor
1. **Antes de unir:** confirmar en Vercel que `META_APP_SECRET` está en **Production** (ya estaba, OL-471). Si una vista previa no lo tiene,
   allí «Conectar Instagram» dice `config` y lo que se publique desde ella sale sin la prueba (`sinPrueba`), como hasta hoy.
2. **Al publicar:** avisar que un «Conectar» empezado en los 10 minutos previos al despliegue hay que repetirlo.
3. **En producción, en seguida:** publicar una **historia de prueba** desde Administración › Instagram y comprobar que sale en Instagram (y en la
   página, si va el espejo). En los registros de Vercel **no** debe aparecer `meta: falta META_APP_SECRET`. Si Meta respondiera con un error
   de `appsecret_proof` (el secreto de Vercel no es el de la app 1459504089615420), la hoja diría un error y se corrige el valor en Vercel.
4. **Prueba de avisos:** `POST /api/avisos/prueba` con el `usuario_id` del founder (admin) sigue mandando; con el de una cuenta que no es de la
   administración responde 403 sin mandar nada.
5. **Después (el founder), con la historia de prueba ya publicada:** Meta › la app «Somos Nosotrxs Publicador» › App settings › Advanced ›
   Security › activar **«Exigir el secreto de la app»** (Require App Secret). Desde entonces, un token sin prueba no sirve. Repetir una
   historia de prueba.
6. **Cuando la conexión de Vault lleve una semana sin fallos:** retirar `INSTAGRAM_TOKEN` de Vercel (el token de respaldo pegado a mano).
   Con «Exigir el secreto de la app» activo, ese token ya no serviría sin la prueba, pero sigue siendo un token sin caducidad fuera de Vault.
7. **Al reconectar** (cuando toque): el diálogo de Meta pide seis permisos, ya no `business_management`. Si la vuelta dice «La cuenta que entró no
   administra la página Somos Nosotrxs», reponerlo (ver «Riesgo» arriba).

## Preguntas al founder
1. ¿Activas «Exigir el secreto de la app» en Meta en cuanto el gestor confirme la historia de prueba, o prefieres esperar unos días?
2. ¿Tu acceso a la página Somos Nosotrxs es directo (rol en la página) o por el portafolio de negocio? Si es por el portafolio, conviene
   conservar `business_management` y lo reponemos antes de unir.
3. ¿Abrimos como pieza aparte el secreto propio de los latidos de la base (`LATIDO_SECRET`), con su migración?
