/* somosnosotros · service worker: recibe avisos push y abre la página al tocarlos. Sin caché: la app es web. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let datos = { titulo: "somosnosotros", cuerpo: "", url: "/" };
  try {
    datos = { ...datos, ...e.data.json() };
  } catch {}
  e.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      // ?v=2: símbolo SN nuevo (OL-200), mismo nombre de archivo.
      icon: "/icono-192.png?v=2",
      // Android pinta el icono chico solo con su silueta: va el SN transparente (docs/diseno/logotipo/insignia.py), no el cuadro.
      badge: "/icono-aviso.png?v=2",
      data: { url: datos.url },
      tag: datos.tag || datos.url,
      renotify: false,
    }),
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
