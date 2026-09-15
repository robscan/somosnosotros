# 033 · Logotipo en la app: barra, favicon e icono de instalación (2026-09-15)

## Pedido

El founder aprobó el borrador 3 del logotipo con manos y pies ("ese es el logotipo que usaremos") y pidió: ponerlo en la cabecera del sitio con buen tamaño, un favicon solo con SN y otro icono para instalar la app ("Añadir a inicio"). Al verlo a 40 px dijo "demasiado gigante" y pidió revisar la maquetación: simple y sin sobreanidación.

## Qué se hizo

- **Logotipo:** `public/logotipo.svg` (completo, 17 KB) y `public/logotipo-chico.svg` (dedos más gruesos y calzado sin cordones, 14 KB), con coordenadas enteras y tinta fija. Generador: `docs/diseno/logotipo/cabecera.py`.
- **`ui/Logotipo`:** dos nodos, el enlace (área de toque de 44 px) y la imagen (`next/image` sin optimizar, con precarga). La prop `chico` elige la versión chica. Alturas en rem, que crecen con el texto del teléfono: `--alto-logo` 1.75rem (28 px) en raíz y `--alto-logo-chico` 1.5rem (24 px) en interiores; sustituyen a `--letra-logo`.
- **`ui/Barra`:** la interior usa la versión chica. Se quitó el `div.derecha`: en raíz solo envolvía la sesión y en las interiores sin menú quedaba vacío. Lo de la derecha es hijo directo de la barra; el menú "···" se alinea con `.interior > :nth-child(3)`. La hoja de estilos quedó por bloques (los dos bloques `.interior` se unieron).
- **Favicon** (`src/app/favicon.ico`): SN liso en tinta sobre hueso, capas de 16, 32 y 48 px (PNG dentro del ICO). A tamaño de pestaña las manos serían ruido.
- **Icono de instalación:** el par SN del logotipo, la S del pulgar arriba y la N que hace la paz, en tinta sobre hueso: `public/apple-touch-icon.png` (180 px), `icono-192.png`, `icono-512.png` e `icono-maskable-512.png` (dibujo dentro del círculo seguro). Mismos nombres de archivo, así el manifiesto y el aviso push no cambian. Generador: `docs/diseno/logotipo/iconos.py`.
- **`layout.tsx`:** `icons` declara solo el apple-touch-icon; el favicon lo sirve `src/app/favicon.ico` (antes la pestaña usaba el PNG de 192).
- **Docs:** `LINEA_GRAFICA.md` (logotipo, favicon, icono, tabla de roles), README de `docs/diseno/logotipo`, OL-015 (1) en `OPEN_LOOPS.md`.

## Verificación

- `npm run lint`, `npm run typecheck`, `npm test` (19 archivos, 127 pruebas) y `npm run build`: en verde.
- Capturas 390×844 en el navegador integrado: Agenda (raíz), Aviso de privacidad (interior sin menú) y ficha de evento con la hoja "···" abierta ("Reportar", fuera de la barra).
- Medidas: logotipo de 138×28 en raíz; 119×24 en interiores, centrado (centro 195 = centro de la vista 195); sesión y menú a 20 px del borde, en el gutter.
- **Revisión de maquetación** (regla del founder): barra raíz 3 nodos y profundidad 2; interior sin menú 6 nodos y profundidad 3; ficha de evento 11 nodos y profundidad 3; cero envoltorios sin función. Quitado: `div.derecha` y el selector anidado `.chico .dibujo`.
- Favicon e iconos revisados a tamaño real: 16, 32 y 48 px en pestaña clara y oscura; 180 px en la retícula del iPhone; el adaptable de Android dentro de su círculo seguro.

## Pendiente

- **Sin commit ni push:** somosnosotros.org sigue con el logotipo en texto hasta subirlo. En la carpeta hay muchos cambios de otros chats sin commit (artistas, lugares, eventos, librerías, migraciones nuevas y `OPEN_LOOPS.md`): el commit debe añadir solo estos archivos por nombre.
- Archivos de este trabajo: `public/logotipo.svg`, `public/logotipo-chico.svg`, `public/apple-touch-icon.png`, `public/icono-192.png`, `public/icono-512.png`, `public/icono-maskable-512.png`, `src/app/favicon.ico`, `src/app/layout.tsx`, `src/app/globals.css` (solo los tokens del logotipo), `src/components/ui/Logotipo.tsx`, `src/components/ui/Logotipo.module.css`, `src/components/ui/Barra.tsx`, `src/components/ui/Barra.module.css`, `docs/diseno/LINEA_GRAFICA.md`, `docs/diseno/logotipo/`, esta bitácora y, en `OPEN_LOOPS.md`, la línea de estado y OL-015 (el archivo trae además cambios de otro chat).
- Firma del founder en su iPhone (Safari) cuando esté en una vista previa o en producción.
- Observación sin tocar: en desarrollo, la raíz tiene dos `header` mientras llega la página (el del estado de carga y el real, oculto); ambos con la misma estructura.
