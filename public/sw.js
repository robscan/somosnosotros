/* somosnosotros · service worker: avisos push y, desde OL-501, el respaldo cuando una pantalla no carga. ALCANCE CERRADO del manejador `fetch`: solo `GET` con `mode: "navigate"` del mismo origen, fuera de `/api/`, `/auth/` (un código PKCE es de un solo uso: ahí no hay respaldo, pasa tal cual) y `/_next/`; la petición va tal cual (lleva las galletas); si falla o pasa de TOPE_NAVEGACION_MS → `/sin-conexion.html` (motivo «red»), si contesta 500 o más → la misma con motivo «servidor»; nunca se guarda una navegación en la caché (solo la página de respaldo, en `sn-respaldo-v1`); cualquier error propio cae a `fetch(event.request)`. LÍMITES: no cubre la caída a mitad del streaming (Inicio con un `<Suspense>` por carril: el SW ya respondió y la pantalla queda en esqueletos); la app de la tienda no lo usa (no registra el SW, pieza nativa aparte); tocar un aviso con la red dormida navega por aquí y cae en el mismo respaldo (por probar en el iPhone). */

const RESPALDO = "/sin-conexion.html";
const CACHE_RESPALDO = "sn-respaldo-v1"; // sube la versión al cambiar la página: `activate` borra las viejas
// Tope de una navegación hasta que llegan las cabeceras: menor que el límite de función de Vercel (el 504 llega después) y que lo que una
// persona aguanta mirando blanco antes de cerrar la app.
const TOPE_NAVEGACION_MS = 12000;
const FUERA = /^\/(api|auth|_next)(\/|$)/;
// Si la página de respaldo no está en la caché (falló la precarga), lo mínimo, para no dejar el blanco.
const RESPALDO_MINIMO =
  '<!doctype html><html lang="es" data-motivo="red"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<body style="font-family:-apple-system,sans-serif;padding:24px 20px"><h1>No se pudo cargar</h1><p>Suele arreglarse al intentar de nuevo.</p>' +
  '<button style="min-height:48px;margin-top:16px;padding:8px 16px;border:0;border-radius:8px;background:#6d34c8;color:#fff;font:inherit;font-weight:700" onclick="location.reload()">Intentar de nuevo</button>' +
  '<script>addEventListener("online",function(){location.reload()})</script></body></html>';

function precargarRespaldo() {
  return caches
    .open(CACHE_RESPALDO)
    .then((c) => c.add(new Request(RESPALDO, { cache: "reload" })))
    .catch(() => {}); // sin la precarga el SW sigue sirviendo los avisos; el respaldo cae al mínimo
}

self.addEventListener("install", (e) => {
  self.skipWaiting();
  if (e && e.waitUntil) e.waitUntil(precargarRespaldo());
});
self.addEventListener("activate", (e) => {
  const limpiar = caches
    .keys()
    .then((nombres) => Promise.all(nombres.filter((n) => n.startsWith("sn-respaldo-") && n !== CACHE_RESPALDO).map((n) => caches.delete(n))))
    .then(() => caches.open(CACHE_RESPALDO))
    .then((c) => c.match(RESPALDO))
    .then((hay) => hay || precargarRespaldo())
    .catch(() => {});
  // Sin precarga de navegación (`navigationPreload`) a propósito: con ella, lo que este SW deja pasar (`/auth/callback`, un código de un solo
  // uso) podría pedirse dos veces según el navegador. El costo del arranque del SW se mide en la bitácora 534.
  e.waitUntil(limpiar.then(() => self.clients.claim()));
});

/** ¿Es una navegación propia que el respaldo cubre? */
function cubierta(peticion) {
  if (peticion.method !== "GET" || peticion.mode !== "navigate") return false;
  const url = new URL(peticion.url);
  return url.origin === self.location.origin && !FUERA.test(url.pathname);
}

async function respaldo(motivo) {
  let html = null;
  try {
    const guardada = await caches.match(RESPALDO, { cacheName: CACHE_RESPALDO, ignoreSearch: true });
    if (guardada) html = await guardada.text();
  } catch {}
  // Se sirve en la dirección que se pidió (así «Intentar de nuevo» recarga esa misma); el motivo va en `data-motivo` de la página.
  html = (html || RESPALDO_MINIMO).replace('<html lang="es" data-motivo="red">', '<html lang="es" data-motivo="' + motivo + '">');
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

function conTope(promesa, ms) {
  let id;
  const tope = new Promise((_, rechazar) => {
    id = setTimeout(() => rechazar(new Error("tope")), ms);
  });
  return Promise.race([promesa, tope]).finally(() => clearTimeout(id));
}

async function navegar(e) {
  let respuesta;
  try {
    // Sin `signal`: una petición `navigate` no se puede copiar con opciones; el tope solo deja de esperarla.
    respuesta = await conTope(fetch(e.request), TOPE_NAVEGACION_MS);
  } catch {
    return respaldo("red");
  }
  // Una redirección llega opaca (status 0) y pasa tal cual; solo un error del servidor es fallo.
  if (respuesta.status >= 500) return respaldo("servidor");
  return respuesta;
}

self.addEventListener("fetch", (e) => {
  try {
    if (!cubierta(e.request)) return; // lo demás, el navegador como siempre
    e.respondWith(navegar(e).catch(() => fetch(e.request)));
  } catch {
    // un error propio nunca deja en blanco: sin respondWith, el navegador pide como siempre
  }
});

self.addEventListener("push", (e) => {
  let datos = { titulo: "Somos Nosotrxs", cuerpo: "", url: "/" }; // la marca (src/lib/marca.ts): un archivo estático no la importa
  try {
    datos = { ...datos, ...e.data.json() };
  } catch {}
  const tag = datos.tag || datos.url;
  // OL-480: el `tag` de un aviso de evento es su hilo («evento-<id>»): el aviso nuevo de un evento sustituye al anterior del mismo evento. Si el
  // que estaba es de otro aviso (`aviso`, el trabajo de la cola), suena (`renotify`) en vez de cambiarse en silencio; si es el mismo (un
  // reintento), no suena dos veces. Sin `aviso` (el de la administración, los de antes), como siempre: sin volver a sonar.
  const previas = self.registration.getNotifications ? Promise.resolve(self.registration.getNotifications({ tag })).catch(() => []) : Promise.resolve([]);
  e.waitUntil(
    previas.then((lista) =>
      self.registration.showNotification(datos.titulo, {
        body: datos.cuerpo,
        icon: "/icono-192.png",
        // Android pinta el icono chico solo con su silueta: va el SN transparente (docs/diseno/logotipo/insignia.py), no el cuadro.
        badge: "/icono-aviso.png",
        data: { url: datos.url, aviso: datos.aviso || null },
        tag,
        renotify: !!datos.aviso && lista.length > 0 && !lista.some((n) => n.data && n.data.aviso === datos.aviso),
      }),
    ),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if ("focus" in v) {
          v.navigate(url);
          return v.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
