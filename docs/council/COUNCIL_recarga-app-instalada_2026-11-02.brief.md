# Brief para el council — Recarga de la app instalada: respaldo ante cargas fallidas, «pull para recargar» y «primero lo cargado, luego lo nuevo»

**Proyecto:** somosnosotros (repo en `/home/user/somosnosotros`). Directorio de centros culturales y agenda de eventos para que la gente local se conozca. **No es Flowya ni una app iOS nativa**: es una web móvil (PWA) en Next.js 16.4.3 (App Router, React 19.2) sobre Vercel y Supabase, instalada en el inicio del iPhone del founder (Safari, modo `standalone`). Las lentes que citan Flowya o SwiftUI deben leerse como referencia histórica: aquí mandan `CLAUDE.md`, `docs/DEFINICION.md`, `docs/PLAN.md` y `docs/ops/OPEN_LOOPS.md` (fuente única de estado).

**Fecha del brief:** 2026-11-02. **Quién lo escribe:** el chat que atiende al founder esta tarde (sesión en la nube, sin acceso a producción ni a Vercel).

---

## 1. El incidente que lo dispara (founder, 2026-11-02)

> «Al abrir la app noto que se queda la pantalla en blanco. Como un error en servicios. No me presenta ninguna opción de recarga ni nada. Tuve que volver a abrir la app (iOS) para que recargara.»

Diagnóstico previo del chat (sin acceso a los registros de Vercel; es hipótesis razonada, no medición):

- `src/app/error.tsx` («Algo falló» + «Intentar de nuevo», con `retry`, que Next 16.4.3 sí pasa: comprobado en el paquete) y `src/app/global-error.tsx` existen y están bien. Solo aparecen si el servidor respondió y algo falló al pintar. El founder vio blanco sin texto: no fue este caso.
- `public/sw.js` es un service worker **solo para avisos push**, por decisión documentada en su primera línea: «Sin caché: la app es web». No tiene manejador `fetch`, no guarda nada, no hay página de «sin conexión» ni de «no se pudo cargar».
- Cuando una PWA instalada en iOS vuelve del fondo, WebKit a veces ha descartado su contenido por memoria y vuelve a pedir la URL al servidor. Si esa petición no obtiene respuesta (red que aún no engancha al desbloquear, 5xx, tiempo agotado), Safari en `standalone` no tiene barra ni botón de recargar: deja blanco hasta que se cierra la app. Comportamiento conocido de las PWA en iPhone (reportes de campo: kentcdodds/kody-video PR 200 «Fix installed PWA white screen on cold start», DuarteSantos8/openGym issue 274 «PWA shows a blank page when launched offline», ahwurm/localharness issue 174).
- Hubo despliegue el 31 de octubre (PR 622). Si la app llevaba abierta desde antes, al volver Next detecta build distinto y hace recarga completa; si la red falló en ese instante, mismo blanco.
- No confundir con OL-455 (bitácora 487): aquel era un blanco *momentáneo* antes de los esqueletos, ya atendido. Este es un blanco *permanente* por carga sin respuesta.

## 2. Lo que el founder propone (versión más fuerte)

El founder aprobó la pieza 1 y pidió analizar 2 y 3 **antes de empezar**, cuestionándolas fuerte, investigando cómo lo resuelven otras apps, identificando áreas de oportunidad y proponiendo ajustes; y después un plan de acción que integre las tres.

**P1 · Respaldo ante carga fallida (ya aprobado en principio).** Un respaldo mínimo en el service worker: cuando una *navegación* no obtiene respuesta, servir una página propia guardada al instalar («No se pudo cargar · Reintentar», con botón que recarga). No es caché de contenido: solo esa página. Segundo tramo, por medir antes de proponerlo en firme: al volver del fondo con la pantalla vacía o sin hidratar, forzar una recarga.

**P2 · Pull para recargar.** El gesto estándar de las redes sociales: arrastrar hacia abajo desde arriba de la lista para pedir contenido nuevo, con indicador. Razón: es el gesto que la gente ya conoce; da una salida visible y controlada cuando algo se ve viejo o roto; en `standalone` iOS no existe el pull nativo de Safari, así que hoy no hay *ninguna* forma de recargar sin cerrar la app.

**P3 · «Primero lo cargado, luego lo nuevo».** Al volver a la app ya cargada, **no recargar sola**: mostrar de inmediato la versión que ya estaba y recargar **solo** cuando la persona haga pull, y solo si hay contenido nuevo. Razón del founder: el contenido «no es tan dinámico», aunque sí cambia y crecerá (más eventos, usuarios más activos); una recarga sola al volver es lenta, quita lo que se estaba viendo y gasta servidor sin que haya nada nuevo. Es la conducta que la gente asocia con Instagram/X: el feed se queda donde estaba; lo nuevo llega cuando lo pides (o con una píldora «N nuevos»).

## 3. La pregunta EXACTA al council

1. ¿P2 (pull para recargar) resuelve un problema real y medible de esta app, o es un gesto importado de productos con otro ritmo de contenido? Si entra, ¿con qué alcance mínimo y en qué pantallas?
2. ¿P3 («primero lo cargado, luego lo nuevo», recarga solo por pull) es la política correcta para somosnosotros, dado que (a) hay contenido con hora (fila «Ahora» con cuenta atrás, regla de las 3 horas: un evento sin fin deja de verse 3 h después de empezar), (b) hay acciones propias (Voy, Me interesa, Seguir, publicar) que ya invalidan con `revalidatePath`, y (c) el router cache de Next (`staleTimes.dynamic: 60`) ya reutiliza por un minuto? ¿Qué alternativa (stale-while-revalidate silencioso, píldora «Hay novedades», recarga al volver con umbral de tiempo) sirve mejor al momento de uso?
3. ¿Qué falta en P1 para que de verdad cubra el incidente del founder, y qué NO debe hacer (riesgo de romper la decisión «sin caché: la app es web», riesgo de servir contenido viejo, riesgo con sesión/cookies)?
4. ¿En qué orden y con qué primer tramo verificable se ejecutan las tres? ¿Qué se mide antes y después (en el iPhone del founder, Safari, 390×844) para declarar verificado?
5. ¿Qué área de oportunidad ve cada lente que el founder no mencionó?

## 4. Hechos del repo que los advisors deben tener en cuenta (verificables)

- **Stack decidido, no se relitiga** (`CLAUDE.md`): Next.js App Router + Supabase + Mapbox + Vercel. Sin app de tienda hasta que la web esté cerrada y testeada. Las capacidades del navegador sí se usan.
- **Regla de simplicidad** (`CLAUDE.md`, «Cómo se trabaja»): si una pieza no sirve a registrar usuarios, lugares o eventos, o a que la gente se conozca, no entra. Una fase/pieza a la vez. Nada se declara verificado sin build verde + tests + captura móvil 390×844.
- **Inicio** (`src/app/page.tsx`, `src/components/Inicio.tsx`): el shell (barra, cabecera) se pinta tras ciudad y sesión; cada carril es un componente de servidor en su propio `<Suspense>` y llega por streaming. `app/loading.tsx` pinta `InicioEsqueleto` en `/` (OL-455).
- **Router cache**: `next.config.ts` → `experimental: { staleTimes: { dynamic: 60 } }`: una pantalla vista hace menos de un minuto se reutiliza al cambiar de sección; publicar, Voy, Seguir invalidan con `revalidatePath` (`src/app/admin/acciones.ts`, `src/app/avisos/acciones.ts`, `src/app/sitios/sitio.ts`, etc.). Es memoria del proceso: en una recarga completa o en arranque en frío no hay nada guardado.
- **Service worker**: `public/sw.js` solo push (sin `fetch`, sin caché), registrado por `src/components/RegistroSW.tsx`. Manifiesto en `src/app/manifest.ts` (`display: standalone`, `start_url: "/"`, fondo blanco).
- **Ya hay piezas que reaccionan al volver al frente** (`visibilitychange` / `pageshow`): `src/components/useUbicacionFresca.ts` (relee ubicación al volver, OL-255), `src/components/instagram/useAlDia.ts` (Administración: al volver pregunta por los trabajos en camino; comentario: «en el iPhone una app instalada que vuelve del fondo no siempre avisa con `visibilitychange`»), `src/components/inicio/Historias.tsx` (pausa al ocultar), `src/components/Navegacion.tsx` (`pageshow` con `e.persisted`: recarga si el aterrizaje lo pide, por la vuelta de entrar con Apple/Google). **No existe hoy** ninguna recarga general de contenido al volver al frente.
- **Contenido con reloj**: `src/lib/ahora.ts` (fila «Ahora» de Inicio: «En 30 min», «Hoy», lo que caduca; OL-359) y la regla de las 3 horas (OL-358, `eventos.termina = coalesce(fin, inicio + 3 h)`). Una pantalla vieja miente con el tiempo aunque no haya cambiado nada en la base.
- **Medición disponible**: `scripts/ops/auditoria-ui/medir-tiempos.mjs` y `banco-funciones.mjs` (bitácora 529, OL-497); `npm run medir` comprueba el primer HTML de Inicio; `medirCliente("error_pantalla")` ya cuenta errores de pantalla (`src/app/error.tsx`). Council previo sobre carga: `docs/council/COUNCIL_carga-rendimiento_2026-10-31.md` (VOBO_CONDICIONADO; insistió en medir en el teléfono del founder antes de ordenar piezas).
- **Gestos y desplazamiento ya existentes**: `overscroll-behavior: contain` en hojas y listas (`ui/Hoja.module.css`, `ui/ListaFlotante.module.css`, `Ciudad.module.css`…); `ui/useTecladoSeSueltaAlDesplazar.ts` y `ui/useCampoVisible.ts` escuchan `touchstart`/`touchmove`; `src/app/obra/[id]/mando/Mando.tsx` ya bloquea `touchmove` no pasivo. Un pull-to-refresh propio compite con todo eso por el gesto de arrastre vertical.
- **Historial propio**: `Navegacion.tsx` mantiene una marca en `history.state` (Atrás propio, rebobinado tras entrar con Apple/Google). Una recarga completa (`location.reload`) la respeta porque se reconstruye al aterrizar; una recarga en medio de un gesto no debe romperla.
- **Pendientes del founder en «Ahora» de OPEN_LOOPS** que compiten por su tiempo de prueba: OL-499 (Speed Insights), OL-359/358/360/361/364/367 (Inicio) esperando «publica». Crédito de la API (200 USD) vence el 11 de noviembre y la carga de ciudades depende de él.

## 5. Lo que se investigó fuera (búsqueda web, 2026-11-02; fuentes de terceros, no documentación de Apple)

- **Blanco en PWA iOS**: patrón de arreglo consistente en los reportes: *navigation fallback* en el service worker a una página `offline` precacheada; tiempo máximo a las peticiones de red del SW para que un `fetch` colgado caiga al respaldo; no borrar el SW ni la caché estando sin red; mostrar un estado «no se pudo conectar» con reintento. Advertencia repetida: casi nada probado en dispositivo real; el soporte de SW en iOS es más limitado que en Android.
- **Pull-to-refresh en PWA iOS**: en `standalone` no existe el de Safari; `overscroll-behavior` no apaga/enciende nada fiable en iOS (WebKit bug 275947 abierto; reportes contradictorios entre Safari 16 y 18). Implementación propia = `touchstart/touchmove` con `{ passive: false }` en la raíz, curva de goma, umbral, indicador, y **un botón de recarga accesible** para quien no puede arrastrar (web.dev, dev.to/wingo-ui). Paquetes como `react-use-pull-to-refresh` existen; calidad no verificada.
- **Cómo lo hacen los feeds**: el patrón dominante en diseño de feeds es «traer lo nuevo en segundo plano y ofrecer una píldora “Nuevas publicaciones” arriba; nunca insertar en silencio mientras se lee» (GreatFrontend, system design de News Feed; PR de activities.next «hold new posts behind the pill when reopening at the top», citando el modo lento de Mastodon). La recarga automática al volver tiene costo documentado: la vista salta arriba y se pierde la posición (quejas sobre X y clientes de Twitter; issue de squawker). Una propuesta intermedia en clientes: recargar sola al volver al frente **solo si pasaron más de ~30 s** y la lista está arriba. No se hallaron estudios controlados píldora vs. automático; es práctica de la industria, no evidencia experimental.
- **Next.js y la vuelta del fondo**: el router cache (`staleTimes`) no se refresca con `visibilitychange`/`pageshow`; si se quiere refrescar al volver hay que llamar `router.refresh()` a mano. Atrás/adelante conserva el cache aunque esté vencido (imita bfcache). Se reporta un mínimo de 30 s que `dynamic: 0` no elimina (no confirmado en documentación oficial).

## 6. Restricciones conocidas

- Lo que se construya tiene que probarse en el iPhone del founder (Safari y app instalada), con captura 390×844 y, donde aplique, screencast/medición (`medir-tiempos.mjs`). El chat autor del brief no tiene acceso a producción ni a Vercel: toda cifra de producción tendrá que producirla el gestor o el founder.
- No hay app de la tienda ni habrá por ahora: nada de soluciones nativas.
- La decisión «sin caché: la app es web» está escrita en `public/sw.js`; cambiarla requiere decirlo explícitamente y acotar qué se guarda.
- Español llano con el founder; cada pieza en su rama; bitácora y línea en OPEN_LOOPS al cerrar; `publica` solo del founder.
