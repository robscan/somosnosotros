# 514 · OL-482 · Barrido de seguridad: la conexión con Instagram, las APIs externas y las galletas

**Versión pública; el completo está en `~/Proyectos/somosnosotros/privado/seguridad/482-seguridad-apis-externas.md`** (regla 10 de
`docs/ops/GESTION_DE_CAMBIOS.md`: los informes de seguridad no van al repo, que es público; mismo trato que OL-058, bitácora 087).

**Fecha:** 2026-10-29. **Rama:** `seguridad-apis-externas` (desde `origin/main` `23a98daf`, puesta al día con `945be550`, que ya trae OL-481). **Quién:** Claude Opus 5.5, agente del Gestor de
cambios VII. **Tipo:** solo lectura y análisis: sin cambios de código ni migraciones.

## El pedido
Founder (2026-10-29): «me surge una duda porque ya estamos usando cookies… que no se abran brechas de seguridad. Esto es bien importante.
Necesito que hagas un barrido de todas las modificaciones que derivaron desde la conexión con Instagram y cualquier otra vulnerabilidad posible
por el uso de APIs externas. Necesito que identifiques brechas de seguridad o riesgos. Lista los riesgos primero, haz un análisis respecto a los
riesgos, evalúa impacto y luego haz un plan.»

## Método
- Lectura del código archivo por archivo, sin abrir producción, Vercel, Meta ni ningún `.env`.
- Inventario de todas las galletas que pone la app (`cookies.set`, `Set-Cookie`, `document.cookie`), de las variables de entorno del código y de
  todas las rutas de `src/app/api/**`, con atención a las de Instagram, Facebook, la cola de redes, los avisos (web y app) y la medición.
- Revisión de las funciones `security definer`, los permisos y las reglas por fila de las migraciones de octubre.
- `npm audit --omit=dev` sobre el `package-lock.json`, contrastado con los avisos publicados.
- Búsqueda de secretos en los archivos y en todo el historial de git (solo rutas y conteos; ningún valor impreso).

## Archivos leídos (principales)
Instagram y Meta: `src/app/api/instagram/{conectar,vuelta,[id]}/route.ts`, `src/lib/instagram/{conexion,conexionEstado,token,api,imagen}.ts`,
`src/lib/facebook/api.ts`, `src/lib/marca.ts`, `src/lib/rutinas/disparar.ts`, la rama `instagram-vuelta-app` (OL-481, ya unida), las migraciones
`20261023140000_instagram`, `20261027120000_espejo_facebook`, `20261028140000_redes_en_cola`, `20261029180000_instagram_conexion`.
Cola de redes: `src/app/api/redes/correr/route.ts`, `src/lib/redes/{cola,herramientas,trabajar}.ts`, `src/app/admin/instagram/acciones.ts`.
Sesión y galletas: `src/proxy.ts`, `src/lib/supabase/*`, `src/app/auth/**`, `src/lib/entrarCon.ts`, `src/app/api/vista/route.ts`,
`src/lib/vistas.ts`, `src/app/admin/CabeceraLista.tsx`, `src/lib/panel.ts`, `src/app/.well-known/apple-app-site-association/route.ts`.
Avisos: `src/lib/push.ts`, `src/lib/suscripcionPush.ts`, `src/lib/dispositivosApns.ts`, `public/sw.js`, `src/app/api/avisos/{prueba,abierto}/route.ts`,
`src/app/perfil/acciones.ts`, migraciones `20261029120000_avisos_direcciones_muertas` y `20261029190000_avisos_forma`, y en la app del iPhone
`apps/ios/capacitor.config.ts`, `MainViewController.swift`, `SceneDelegate.swift`.
APIs externas: `src/lib/cartel.ts`, `src/app/eventos/acciones.ts` (lectura de carteles), `src/lib/rutinas/{agendas,carteles,imagenWeb,mapbox,publicarEvento}.ts`,
`src/app/admin/ciudades/mapbox.ts`, `src/lib/correo.ts`, `src/lib/baja.ts`, `src/app/api/resend/route.ts`, `src/lib/carteles/generar.ts`, `src/lib/cartelDescarga.ts`.
Resto de rutas de API, `next.config.ts`, `src/app/layout.tsx`, `supabase/tests/pg/security-advisor.test.mjs`.
Bitácoras 490, 493, 496, 497, 503, 506, 508, 512 y 513; `docs/investigaciones/vigilancia-instagram-lugares.md` y `avisos-con-la-app-nativa.md`.

## Hallazgos en breve
- **Sin secretos en el repo ni en su historial.** Ningún token llega al teléfono, a la dirección, a una respuesta ni a un registro.
- **La conexión con Instagram está bien resuelta** y quitar la galleta en OL-481 (unida durante el barrido, PR #603) no abre un hueco real: no hay motivo para revertirla.
- **Una pieza para ya:** actualizar dependencias con avisos de seguridad publicados (una de ellas nos aplica).
- **Siete para pronto** y **seis de prioridad baja**, ninguna con datos de personas expuestos hoy. El detalle de cada riesgo, su probabilidad, su
  impacto, el plan por piezas con horas y lo que falta comprobar en Vercel, Mapbox, Anthropic y Meta está en el documento privado.

## Preguntas al founder
1. Mapbox y Anthropic (pendiente de OL-058): ¿quedaron el token del mapa restringido por dominio, las alertas de facturación y el tope de gasto
   de la IA? Si no, ¿aceptas dos tokens de Mapbox (uno público restringido y otro solo del servidor)?
2. Vercel: ¿los secretos de producción están también en las vistas previas? ¿Las vistas previas piden entrar?
3. Meta: ¿quién más tiene rol en la app y en la página? ¿Activamos «Exigir el secreto de la app»? ¿Hace falta el permiso `business_management`?
4. Para que nadie infle los contadores de vistas: ¿tope por evento y hora, o tope por dirección IP resumida con la sal del día, sin guardarla?
5. ¿Autorizas una versión pública del informe en el repo, o se queda todo en la carpeta privada?

## Lo que sigue
El gestor lee el documento privado, decide el orden de las piezas y, con el founder, hace las comprobaciones sin código (Vercel, Mapbox,
Anthropic, Meta) que el documento lista en su §6.
