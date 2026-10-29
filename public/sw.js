/* somosnosotros · service worker: recibe avisos push y abre la página al tocarlos. Sin caché: la app es web. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

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
