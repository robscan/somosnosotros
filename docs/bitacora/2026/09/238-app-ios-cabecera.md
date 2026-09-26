# 238 · App de iPhone: la cabecera se integra con la hora (OL-209)

**Fecha:** 2026-09-25 · **Rama:** `app-ios-cabecera` · **Quién:** gestor de cambios

## Lo que vio el founder

Con capturas de TestFlight 1.0 (2): «Header se rompe horrible. No se integra bien.»

- Arriba, una franja negra del alto de la hora y, debajo, un hueco crema antes de la cabecera (Inicio, Agenda y Entrar).
- Al desplazar, el contenido pasaba por debajo del reloj, y la cabecera pegajosa de Inicio se encimaba con la hora.
- En Entrar, otra franja negra abajo.

## Causa

`apps/ios/capacitor.config.ts` tenía `ios.contentInset: "always"`: iOS reservaba la zona de la hora dentro del área que se desplaza. La web también la reserva (`env(safe-area-inset-top)` en `.raiz`, `.pagina` y `ui/Barra`), así que quedaba doble. El espacio que reservaba iOS mostraba el fondo del sistema, que en modo oscuro es negro: esa era la franja. Como la reserva vive dentro del desplazamiento, al desplazar el contenido subía hasta debajo del reloj.

Capacitor no permite bajar la vista web para que empiece debajo de la hora: `CAPBridgeViewController.loadView()` es `final` y hace `view = webView`. Por eso la web se encarga de toda la zona segura.

## Arreglo

- `capacitor.config.ts`: `contentInset: "never"` y `backgroundColor: "#ffffff"`. La vista web llega hasta arriba y el fondo nunca es negro.
- `globals.css`:
  - `--tope: env(safe-area-inset-top, 0px)`.
  - `body::before`, una franja fija del alto de `--tope`, color `--fondo`, por encima de lo que se desplaza (z 30) y por debajo de las hojas (z 40).
- Las cabeceras pegajosas se detienen en `--tope`: `ui/Cabecera` (también al compactarse), la tira de Agenda y la de letras. `TiraLetras.tsx` lee el `top` ya resuelto, así que sigue calculando bien.
- En Safari y en la web instalada, `--tope` vale 0 porque el navegador ya deja la página debajo de la hora: ahí no cambia nada.

## Evidencia

Simulador iPhone 17 Pro con iOS 26, en modo oscuro, con la app compilada desde esta rama apuntando a un servidor local de la rama. Ese cambio de `server.url` no se guardó: el archivo sigue apuntando a producción. El simulador ya está borrado.

- `capturas-238/01-inicio-arriba.png`: la hora sobre blanco y la cabecera (logotipo, Entrar, ciudad y buscar) justo debajo. Sin franja negra ni hueco.
- `capturas-238/02-ficha-arriba.png`: ficha de evento con «Atrás», el logotipo y «···» justo debajo de la hora.
- `capturas-238/03-ficha-desplazada.png`: la ficha desplazada. El contenido pasa bajo la barra, nunca bajo la hora.
- También se comprobó a mano que, al desplazar Inicio, el contenido no pasa bajo el reloj y que, al subir, la cabecera vuelve a aparecer debajo de la hora y no encima.

La insignia «1 Issue» de las capturas es el aviso del servidor de desarrollo de Next; en producción no aparece.

Pendiente: probarlo en el iPhone del founder con la compilación 3.
