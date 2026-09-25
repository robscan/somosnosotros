# 225 · Plan de la app de iOS en la tienda (OL-191)

**2026-09-25 · Solo documentación.**

## Qué leí

- CLAUDE.md: decisión del founder sobre app nativa (espera a cerrar web y probar, sin capacidades que la web ya cubra, NFC y vibración para después).
- docs/DEFINICION.md: reglas y audiencia.
- OL-032 (app de tienda detenida el 2026-09-16): lo hecho en Apple se queda (identificador, ficha), si se retoma la lista de lo que pide Apple.
- OL-155 (Wallet, espera certificado Pass Type ID del founder).
- docs/ops/COLA_DE_PIEZAS.md, E3: "preparar app nativa" falta acotar con el founder.
- docs/rediseno/28-avisos-y-boletin.md: web push ya existe; APNs para la app.
- docs/rediseno/40-perfil-artista-enlace.md: Wallet es posible desde web de Safari (no solo nativa), pero el founder decidirá si antes o después de la app.
- src/app/manifest.ts: PWA configurada con display standalone, icons.
- public/sw.js: service worker ya maneja push web y abre URLs.

## Qué decidí

Documento 47 cubre:

1. **Qué es:** la web envuelta, no reescrita. Suma Wallet, APNs, NFC, vibración, deep links.
2. **Enfoque recomendado:** WKWebView en Swift (control total, costo cero por actualización, tamaño mínimo ~15 MB, equipo chico). Comparación con Capacitor (50 MB, control medio) y PWABuilder (herramienta, control bajo).
3. **Requisitos de Apple:** 4.2 (funcionalidad mínima mitiga Wallet/APNs/deep links), 5.1.1 (Sign in con Apple obligatorio, borrado en app), Webkit, Nutrition Label, etiqueta de edad, capturas y textos.
4. **Qué suma lo nativo:** tabla de Wallet, APNs, NFC, vibración, Sign in más fluido, deep links nativos, caché de emergencia, actualización automática.
5. **Piezas:** dos fases de setup (certificados, llaves), luego envoltorio + Wallet (TestFlight), APNs cliente/servidor, NFC/vibración, ficha y envío a tienda. Cada una es OL-192 a OL-202; tamaño chica a mediana.
6. **Costos:** USD 99/año (ya pagado), revisión 3–10 días, rechazos típicos (wrapper vacío, sin funcionalidad) con respuesta preparada.
7. **App antes o después del blog:** **antes o en paralelo**. Revisión de tienda es el único plazo externo; while esperamos Apple, blog avanza sin bloqueos. Si blog primero, app se retrasa.
8. **Pendientes del founder:** crear certificado Pass Type ID, llave P8 de APNs, 5 capturas, textos de Store, aceptar términos, probar en TestFlight, dar orden de envío.

## Qué queda

- El founder firma el plan y elige si app antes o después del blog.
- Confirmar OL-192 a OL-202 en ASIGNACIONES.md.
- Primera pieza (OL-192): certificados y llaves — solo founder.
