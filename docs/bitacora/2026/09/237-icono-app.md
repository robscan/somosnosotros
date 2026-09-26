# 237 · Icono nuevo de la app (OL-208)

**Fecha:** 2026-09-25 · **Rama:** `icono-app` · **Quién:** gestor de cambios

## Pedido

Founder: «acabo de hacer el icono en la app de Icon Composer, con versión dark y mono, revisa la app que está abierta, extrae los elementos y úsalos para este proyecto».

## Qué había en Icon Composer

El documento `iconoApp.icon`, guardado en iCloud Drive (`Documents/smsnstrs/`):

- Una capa, `SN - Symbol.svg`, al 80 % del lienzo. El SVG es **idéntico byte a byte** a `docs/diseno/logotipo/LogoFinal/SN - Symbol.svg`: el símbolo no cambia.
- Fondo en degradado automático sobre el crema Display P3 (0.96078, 0.94902, 0.92549), que en sRGB es `#F6F2EB`.
- En oscuro, el símbolo va en crema sobre fondo oscuro. En teñido (mono), en gris que iOS tiñe. Sin cristal en la capa, con sombra neutra y translucidez al 50 %.

## Qué se hizo

- **App de iPhone.** El `.icon` entra tal cual como `apps/ios/ios/App/App/AppIcon.icon`, en los recursos del proyecto. Se borra el `AppIcon.appiconset` viejo, porque tenía el mismo nombre. Xcode 26 lo compila con sus variantes (clara, oscura y teñida) y genera `AppIcon60x60@2x.png` como respaldo para iOS 17 y 18.
  - Verificado con `assetutil --info` sobre el `Assets.car` compilado: renditions `UIAppearanceLight`, `UIAppearanceDark` e `ISAppearanceTintable`.
  - Instalado en un simulador de iPhone 17 Pro con iOS 26: el icono aparece en el inicio, sobre crema y con el SN negro. El simulador ya está borrado.
  - La variante oscura en el inicio depende del ajuste de iconos de la pantalla de inicio de cada persona. En el simulador no se logró cambiar ese ajuste desde la línea de comandos, así que la variante oscura queda comprobada en el catálogo compilado y en el render de `ictool`, no en el inicio.
- **Proyecto de iPhone, ajustes pendientes de la primera subida** (en esa subida se forzaron a mano):
  - `DEVELOPMENT_TEAM = AT53235M7U`.
  - `TARGETED_DEVICE_FAMILY = 1` (solo iPhone).
  - `CURRENT_PROJECT_VERSION = 2`, para la siguiente compilación de TestFlight.
- **Web.** `docs/diseno/logotipo/iconos-sn.mjs` pasa a fondo crema `#F6F2EB`, tinta negra y el símbolo al 80 % del lado, igual que el `.icon`. Se regeneraron:
  - `src/app/favicon.ico`
  - `public/apple-touch-icon.png`
  - `public/icono-192.png` y `public/icono-512.png`
  - `public/icono-maskable-512.png` (el símbolo dentro del círculo seguro)
  - La insignia de avisos (`icono-aviso.png`) no cambia: blanco sobre transparente.

## Evidencia

- `capturas-237/01-app-claro-oscuro-tenido.png`: las tres variantes del `.icon` dibujadas con `ictool`, la herramienta de Icon Composer. La primera es crema con el SN negro; la segunda, gris oscuro con el SN crema; la tercera, teñida en violeta sobre fondo oscuro.
- `capturas-237/02-web-favicon-inicio-android.png`: la hoja de revisión del generador.
  - El favicon a 16, 32 y 48 en pestañas clara y oscura: legible sobre crema.
  - El icono de «Añadir a inicio» junto a iconos de colores.
  - El icono adaptable de Android dentro de su círculo seguro.
  - La insignia de avisos sobre gris.
- La compilación Release para dispositivo sale verde.
