# 506 · La app ya está en el App Store: el letrero de Apple en Safari («Ver»/«Abrir») y los enlaces que abren la app

**Pieza:** OL-474. **Rama:** `app-store-letrero`, base `origin/main` (`a047afa9`). **Fecha:** 2026-10-29. **Operador:** agente Opus 5.5 del Gestor de cambios VII, en su árbol aislado. Sin council, workflows ni subagentes.
**Manda:** el founder, 2026-10-29: «ya nos aprobaron la aplicación para App Store de iOS… una notificación en la parte superior que incluso le veo cara de nativa y que invita a ver la aplicación en la app. Para quienes no tienen instalada la app, invita a instalarla. Y para quienes tienen instalada la app, invita a abrirla. También que… si yo abro un enlace en internet, ya sea en Google o en Instagram… me lleve directamente hacia la aplicación cuando la tengo instalada, o me sugiere instalarla cuando no».
**Estado:** hecho, sin migración ni variables nuevas; `apps/ios` sin tocar (no hace falta una compilación nueva para el letrero). Espera el «publica» del founder.

## Antes de esta pieza

- El letrero nunca existió: producción no manda `<meta name="apple-itunes-app">` (comprobado con `curl`, abajo) y ningún commit lo añadió ni lo quitó (`git log -S "apple-itunes-app"` vacío). La única mención es la bitácora [059](../09/059-instalar-y-avisos.md) (2026-09-16): «El objeto arriba que pidió el founder lo dibuja Safari cuando la app esté publicada: el aviso de la App Store (Smart App Banner, Apple ID 6812916453). Se comprueba al publicar.» Ese momento es hoy.
- Los enlaces universales están armados desde OL-194 (bitácora [228](../09/228-app-ios-capacitor.md)) y reclaman todo el sitio desde OL-223 (bitácora [252](../09/252-enlaces-abren-app.md)).
- El aviso de instalar como web (Chrome y Android, `src/lib/avisoInstalar.ts`, `useInstalarApp`) no se tocó.

## Lo que se hizo: el letrero de Apple (Smart App Banner)

- `src/lib/letreroAppStore.ts`: `contenidoLetreroAppStore(ruta)` arma el `content` de la etiqueta: `app-id=6812916453, app-argument=https://somosnosotros.org<ruta>`. La dirección es la canónica de producción de la página que se ve (sin `?…` ni `#…`: sin rastreos de Instagram o Google ni filtros de una lista), con acentos y espacios codificados y la coma como `%2C` (la coma separa los parámetros de la etiqueta). Devuelve `null` en `/admin`, `/auth` y `/api` (y en sus subrutas; `/administrar` sí lleva letrero) y ante cualquier cosa que no sea una ruta de este dominio. El Apple ID y el dominio son constantes (la regla de `marca.ts`), no variables de entorno.
- `src/components/LetreroAppStore.tsx` (cliente, con `usePathname`): pinta la etiqueta. Va en `src/app/layout.tsx`, fuera de todo `<Suspense>`: llega en el primer HTML y React 19 la sube al `<head>`, que es donde Safari la busca. Al navegar dentro del sitio el layout no se vuelve a pintar, pero este componente sí, así que el `app-argument` sigue a la página que se está viendo. Se descartó leer la ruta con `headers()` en el servidor: con `○` (estáticas) en la tabla del build (`/privacidad`, `/reglas`, `/tu-anio`…), leer cabeceras en el layout raíz las habría vuelto dinámicas a todas, y además no seguiría la navegación dentro del sitio. Con `usePathname` cada página estática sale con su propia ruta.
- Comprobado en el HTML que sirve `next start` (abajo): la etiqueta sale dentro de `<head>`, una sola vez, con la ruta de la ficha; en `/admin` y `/auth/…` no sale.

### Qué dice Apple («Promoting Apps with Smart App Banners», documentación de WebKit, leída hoy)

- Formato: `<meta name="apple-itunes-app" content="app-id=myAppStoreID, app-argument=myURL">` en el `head` de cada página donde se quiera; `app-id` obligatorio, `app-argument` opcional («A URL that provides context to your native app»), generable por página en el servidor.
- Si la app no está instalada, tocar el letrero lleva a su ficha del App Store («Ver»); si ya está, el letrero cambia solo y la abre («Abrir»). Al volver tras instalar, el letrero muestra el avance de la descarga y pasa de «Ver» a «Abrir». Cerrado con su ✕, no vuelve a salir al regresar a la página. Si el teléfono no admite la app o la app no está disponible en su país, no sale.
- No sale dentro de un iframe y **no sale en el simulador de iPhone** («Banners don't appear in the iOS simulator»).
- Solo lo dibuja **Safari** de iPhone y iPad. Chrome, Firefox y Edge en iOS no lo muestran, ni el navegador dentro de Instagram o Facebook. La web instalada en el inicio (PWA) no lo necesita: quien la usa ya tiene «la app» abierta; y dentro de la app de la tienda (WKWebView) tampoco sale.

## Enlaces universales: la comprobación

### Salidas de `curl` (2026-10-29, solo lecturas públicas)

```
$ curl -sS -D - https://app-site-association.cdn-apple.com/a/v1/somosnosotros.org
HTTP/1.1 200 OK
Content-Type: application/json
Apple-From: https://somosnosotros.org/.well-known/apple-app-site-association
Apple-Origin-Format: json
Cache-Control: max-age=3600,public
{"applinks":{"details":[{"appIDs":["AT53235M7U.org.somosnosotros.app"],"components":[{"/":"/auth/*","exclude":true},{"/":"/api/*","exclude":true},{"/":"/avisos/baja*","exclude":true},{"/":"/eventos/*/calendario*","exclude":true},{"/":"/*"}]}]},"webcredentials":{"apps":["AT53235M7U.org.somosnosotros.app"]}}

$ curl -sS -D - https://somosnosotros.org/.well-known/apple-app-site-association
HTTP/2 200
cache-control: public, max-age=3600
content-type: application/json
(el mismo JSON, byte por byte)

$ curl -sS -o /dev/null -w "%{http_code} %{redirect_url}" https://www.somosnosotros.org/.well-known/apple-app-site-association
308 https://somosnosotros.org/.well-known/apple-app-site-association

$ curl -sS -o /dev/null -w "%{http_code} %{redirect_url}" https://somosnosotrxs.org/
308 https://somosnosotros.org/

$ curl -sS https://somosnosotros.org/ | grep -o '<meta name="apple-itunes-app"[^>]*>'
(nada: hoy producción no manda el letrero)
```

- **Apple ya sirve nuestro archivo a los iPhones:** la CDN de Apple devuelve 200 con el mismo contenido que el dominio, sin redirección y con `Content-Type: application/json`.
- **Cobertura:** `/*` va al final, así que entran la raíz (`*` también vale «nada»), `/eventos/<slug>`, `/lugares/<slug>`, `/artistas/<slug>`, `/agenda`, `/obra/<id>/mando` y la dirección corta del cartel `/e/<slug>` (la app la carga y el `src/proxy.ts` la manda a la ficha). Lo prueba `route.test.ts`, que imita cómo lee iOS los componentes (gana el primero que coincide).
- **Las exclusiones tienen sentido:**
  - `/auth/*`: entrar. La vuelta de Apple y Google la atrapa `ASWebAuthenticationSession` con su callback https, sin enlace universal; reclamarla competiría con el enlace de entrar del correo cuando se abre fuera de la app.
  - `/api/*`: no son páginas.
  - `/avisos/baja*`: es una ruta del servidor (`src/app/avisos/baja/route.ts`), no una pantalla: da de baja los avisos por correo con un toque, sin sesión, y contesta una página suelta («Listo. Ya no te escribimos…»). Gmail y Yahoo la llaman además por POST (List-Unsubscribe-Post). En el navegador donde se abre cumple su trabajo; llevarla a la app no suma nada.
  - `/eventos/*/calendario*`: es el archivo `.ics` de «Agregar al calendario». Safari lo entrega a Calendario; dentro de la app el calendario va por la hoja nativa (OL-214, `CalendarioPlugin.swift`) y el WKWebView no sabría qué hacer con el archivo.
- **La app carga la dirección del enlace, no la raíz** (lectura de `apps/ios`, sin tocarlo): `SceneDelegate.swift` escucha `capacitorOpenUniversalLink` y hace `webView.load(URLRequest(url: url))` con la URL que llega. Con la app cerrada del todo, `CAPSceneDelegateProxy` de Capacitor 8.5.2 guarda los `userActivities` del arranque y los reenvía en el primer `capacitorViewDidAppear`, cuando el observador ya existe (bitácora 252; releído hoy en el código de la etiqueta 8.5.2). En el simulador se vio en la 252: `/obra/prueba/mando` con la app cerrada y `/agenda` con la app en segundo plano abrieron la app en esa misma dirección.

### Lo que falta o conviene (propuestas, sin cambiar el archivo; decide el gestor)

1. **«Abrir» del letrero puede abrir la app en Inicio y no en la ficha.** Apple entrega el `app-argument` por `openURL` (en la documentación, `application:openURL:…`; con escenas, `scene(_:openURLContexts:)`), no como enlace universal. `SceneDelegate` lo pasa a Capacitor, que publica `capacitorOpenURL`, pero nadie lo escucha: solo se carga en el WKWebView lo que llega por `capacitorOpenUniversalLink`, y la web no escucha `appUrlOpen` de `@capacitor/app`. No encontré en la documentación de Apple si hoy, con un `app-argument` https de un dominio que la app reclama, iOS lo entrega como enlace universal (`NSUserActivity`, y entonces sí funcionaría) o por `openURL` (y entonces abre donde la app se quedó o en Inicio). Se ve solo en un iPhone con la app de la tienda. Si abre en Inicio, hay dos arreglos: (a) en la web, escuchar `appUrlOpen` de `@capacitor/app` (ya va en la app) y navegar a la ruta si la URL es de somosnosotros.org y no es la que ya se ve; sin compilación nueva, pero cuidando no cargar dos veces lo que ya cargó el enlace universal; (b) en `SceneDelegate.swift`, tratar `capacitorOpenURL` con URL `https://somosnosotros.org/…` igual que el enlace universal: compilación nueva, la decide el founder.
2. **somosnosotrxs.org (y smsnstrs.org, y los www) no abren la app.** La CDN de Apple sigue la redirección 308 y devuelve el archivo también para `somosnosotrxs.org` y `www.somosnosotros.org`, pero `App.entitlements` solo dice `applinks:somosnosotros.org`. Un enlace tocado en `somosnosotrxs.org/…` (el dominio que va en los carteles y en los textos de Instagram y Facebook) abre Safari, que redirige a somosnosotros.org y ahí, si acaso, sale el letrero. Para que abran la app directo habría que añadir esos dominios al archivo de permisos: compilación nueva. Lo que se escribe a mano en la barra de Safari nunca abre la app (así funcionan los enlaces universales).
3. El comentario de `route.ts` dice que Apple pide el archivo «con o sin extensión .json»; `/.well-known/apple-app-site-association.json` da 404. Desde iOS 9.3 Apple solo pide la forma sin extensión (y hoy la lee de su CDN), así que no estorba; solo el comentario está de más.

## Lo que no se pudo probar sin un iPhone con la app de la tienda

- **Que el letrero salga.** Apple no lo dibuja en el simulador; además necesita la ficha del App Store visible en México. En el Safari del simulador se cargó una ficha con la etiqueta en el `<head>` y, como dice Apple, sin letrero (captura abajo).
- «Ver» → ficha de la tienda → instalar → volver → «Abrir»; y que «Abrir» lleve a la misma ficha (punto 1 de arriba).
- Que un enlace tocado en Google (Safari) abra la app. Desde el buscador de Google en Safari los enlaces universales suelen abrir la app; desde la app de Google y desde el navegador de dentro de Instagram o Facebook, por lo general **no**: esos navegadores abren la página ahí mismo, sin letrero (no son Safari). Ahí la salida es el menú «···» → «Abrir en el navegador», o mantener el dedo sobre el enlace.
- Con la app instalada desde la tienda (no TestFlight), iOS vuelve a leer el archivo de la CDN al instalar; no hay nada que hacer de nuestro lado.

### Para que el founder lo pruebe en su iPhone (tras el «publica»)

1. Sin la app instalada, en Safari, abrir `https://somosnosotros.org/` o cualquier ficha: arriba sale el letrero con el icono, «Somos Nosotrxs» y «Ver».
2. Instalar desde ahí, volver a Safari y recargar: el letrero dice «Abrir». Tocarlo: ¿abre la app en esa misma ficha o en Inicio? (punto 1 de las propuestas).
3. Con la app instalada, en Notas o Mensajes, tocar un enlace `https://somosnosotros.org/eventos/…`: debe abrir la app en esa ficha. Si abre Safari, mantener el dedo sobre el enlace y elegir «Abrir en Somos Nosotrxs» (iOS recuerda la elección).
4. Si se cierra el letrero con la ✕, Safari no lo vuelve a mostrar en esa página por un tiempo: es de Apple, no nuestro.

## Comprobado

- `src/lib/letreroAppStore.test.ts` (7 pruebas): el Apple ID; la dirección canónica de `/`, las tres fichas y `/agenda`; sin consulta ni ancla; acentos, espacios y comas codificados; sin letrero en `/admin`, `/admin/instagram`, `/admin/grafo`, `/auth`, `/auth/callback`, `/auth/google/fin` y `/api/estado`; sí en `/administrar` y `/authors`; nunca otro dominio.
- En el HTML que sirve `next start` (la app compilada contra el respaldo local, sin llaves; con `curl`, también con el user-agent de Safari de iPhone): la etiqueta va dentro de `<head>`, una sola vez, en `/`, `/eventos/concierto-de-la-orquesta-sinfonica-de-san-luis-potosi`, `/lugares/teatro-de-la-paz`, `/artistas`, `/privacidad` (estática) y `/entrar`, cada una con su propia dirección; en `/admin` y `/auth/callback`, ninguna.
- Al navegar dentro del sitio (Chrome real a 390×844, toque por coordenadas en la barra inferior de `/` a `/artistas` y luego a `/lugares`): la etiqueta sigue en `<head>`, sola, y su `app-argument` cambia a `https://somosnosotros.org/artistas` y `https://somosnosotros.org/lugares`.
- `npm run lint` (0 errores; 2 avisos ajenos en `VisorImagen.componentes.test.mjs`), `npm run typecheck`, `npm test` (301 archivos, 4 872 pruebas), `npm run build` (en verde; las páginas estáticas siguen estáticas), `npm run inventario` (sin novedades) y `npm run medir` (60 pantallas × 4 anchos, sin novedades: la etiqueta no cambia la maqueta).

## Captura (`docs/rediseno/capturas-506/`)

- `01-ficha-evento-safari-simulador.png` (iPhone 17e, iOS 27.0, 390×844 a 3×; Safari sin la app instalada): la ficha «Concierto de la Orquesta Sinfónica de San Luis Potosí» servida por `next start` contra el respaldo local, con la etiqueta en su `<head>`. **No hay letrero arriba**, y es lo que Apple anuncia: «Banners don't appear in the iOS simulator». La captura con «Ver» solo se puede sacar en un iPhone de verdad, con producción ya publicada (pasos de arriba). Abierta y revisada: la ficha completa, sin nada roto.

## Preguntas al founder

1. **¿Un letrero propio arriba para Chrome y Firefox en iPhone?** El de Apple solo sale en Safari. Podríamos dibujar uno con el mismo aire (icono, nombre, «Ver en el App Store»), como ya hacemos con el aviso de instalar como web en Chrome y Android. Límite: desde Chrome no se puede saber si la app está instalada, así que diría siempre «Ver» (la tienda dice «Abrir» si ya la tienes). ¿Lo hacemos o basta con Safari?
2. **¿Y dentro de Instagram y Facebook?** Su navegador interno no muestra el letrero ni abre la app solo. Un letrero propio ahí podría decir «Ábrelo en la app» y llevar a la tienda. ¿Entra en la misma pieza que la pregunta 1?
3. **¿Una compilación nueva para que «Abrir» y los enlaces de somosnosotrxs.org lleven a la ficha?** Solo si la prueba del paso 2 abre en Inicio, o si quieres que el dominio de los carteles abra la app directo (propuestas 1 y 2).
4. En `/entrar`, `/ajustes`, `/perfil` y las altas el letrero sí sale (hoy solo se quita en Administración y entrar con Apple/Google). ¿Lo quitamos también ahí?
