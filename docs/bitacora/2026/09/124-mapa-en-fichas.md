# Mapa en fichas (OL-089)

Pedido del founder, transmitido por el chat de gestión de cambios: «agregar un mapa en cada evento y lugar como referencia de ubicación». Autorizado para publicarse directo (sin prototipo). Rama `mapa-en-fichas` desde `origin/main` del día, worktree propio.

## Qué quedó

- **`lib/mapaEstatico.ts`**: arma la URL de la Static Images API de Mapbox (pin sobre el punto, 600×170 lógicos, `@2x` para retina) con el token público de `lib/config.ts`. Sin token o sin punto, `urlMapaFicha` da `null` — nunca se fabrica un mapa a medias.
- **`lib/eventos.ts`**: se extrajo `puntoComoLlegar` de lo que ya calculaba `enlaceComoLlegar` (el mismo punto: uno público, o uno reservado que la ficha ya recibió autorizado a revelar — nunca uno privado sin revelar). `enlaceComoLlegar` ahora es una envoltura sobre `puntoComoLlegar` que arma el enlace de Google Maps; el comportamiento no cambió (mismas pruebas en verde).
- **`components/MapaFicha.tsx`** + su CSS: el componente, con las esquinas de las tarjetas (`Cartel.module.css`); tocarlo hace lo mismo que «Cómo llegar» (mismo `href`). Sin punto, o sin token, no pinta nada — ni un hueco vacío.
- Integrado en la ficha de lugar (`app/lugares/[id]/page.tsx`, con `{lat: lugar.lat, lng: lugar.lng}`, siempre presente) y en la de evento (`app/eventos/[id]/page.tsx`, con `puntoComoLlegar` sobre los mismos datos que ya usa «Cómo llegar»), justo bajo la dirección y antes del renglón de acciones.
- Prueba nueva que ata la privacidad: un evento con sitio reservado sin revelar (`sitio_reservado: true`, sin `privado`, aunque haya un lugar con coordenadas) hace que `puntoComoLlegar` dé `null` — sin mapa, ni de ciudad ni con el pin de otro punto.

## El bloqueo con el estilo de la cuenta

Al verificar a ojo, el mapa salía en blanco (solo el pin, sin calles) tanto en Lugares como en Eventos. Investigado con el token real (`.env` de la cuenta, por symlink como en otras piezas): el estilo de la cuenta, `FLOWYA_Light`, se apoya en `mapbox://styles/mapbox/standard` (Mapbox Standard) mediante `imports` — la composición de estilos que usa Mapbox GL JS (`components/Mapa.tsx`). La Static Images API **no resuelve los `imports`**: solo pinta lo que el estilo define directo, así que el basemap importado (calles, edificios, etiquetas) no sale. Confirmado pidiendo la misma URL con el estilo genérico `mapbox/light-v11` y el mismo token: ese sí sale completo. No era el token ni las coordenadas.

Reportado a gestión de cambios antes de decidir nada (cambia algo visible). Instrucción recibida: usar `mapbox/light-v11` solo para esta miniatura, con una constante propia y su comentario explicando el porqué (`ESTILO_MINIATURA` en `mapaEstatico.ts`); el mapa interactivo sigue con el estilo de la cuenta, que corre en el navegador con Mapbox GL JS y si resuelve los `imports`.

## Verificación

- Lint (0 errores; el warning previo del logotipo, ajeno, y ninguno más — el `<img>` externo de Mapbox lleva su `eslint-disable-next-line` con la misma convención que `Cartel.tsx`), typecheck, 690 pruebas y `npm run build`, todo en verde. `AGENTS.md`, reescrito por `next dev`, restaurado antes de comitear.
- Verificado a ojo (front-visual) en el navegador integrado, `next dev` de la rama en un puerto propio, contra la base real (con `.env.local` como symlink al `.env` de la cuenta, borrado al cerrar): a 390×844, ficha de lugar (Museo Federico Silva) con el mapa ya con calles, nombres y el pin en `--primario`, esquinas redondeadas, entre la dirección y «Cómo llegar»; ficha de evento («México, Mágico, Musical», con lugar público) igual, en la misma posición.
- El caso de privacidad (sitio reservado sin revelar) se ató con la prueba de `puntoComoLlegar`; no se buscó un evento reservado real entre los datos de prueba para la captura.
- Con el token de esta cuenta, la Static Images API se sirvió correctamente desde `localhost`; falta que gestión de cambios compruebe en `somosnosotros.org` que la restricción del token por dominio deja pasar la imagen (las peticiones las hace el navegador de quien mira la ficha, con el `Referer` del dominio).
- No se probó con lector de pantalla ni en el iPhone del founder.
- Sin migración.
