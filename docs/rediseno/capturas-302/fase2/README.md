# OL-275 · QA de la aplicación real

Next16.3.8 compilado con Bricolage y CSS reales. Datos, imágenes y proveedores inventados; sin Supabase remoto ni reproducción. Doce capturas revisadas a320×844 y390×844: Inicio, lista, cabecera, llegada exacta, recarga y destino fuera de las primeras tres. `qa.json` registra la URL, dimensiones y posición del destino. En todos los estados main.x=0 y el ancho del documento coincide con el viewport; la publicación señalada cabe completa.

Movimiento normal. El fallo heredado de hidratación con movimiento reducido se separó como OL-276 por Gestor III, mensaje189; esa corrección se publica primero. La simulación visual no prueba permisos SQL ni servicios reales: los contratos se prueban con PostgreSQL real y los proveedores se sustituyen.

Para repetir: compilar con NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:64075, NEXT_PUBLIC_SUPABASE_ANON_KEY=llave-inventada y NEXT_PUBLIC_MAPBOX_TOKEN=pk.inventado; ejecutar `node docs/rediseno/capturas-302/fase2/verificar.mjs`. Usa Chrome oficial instalado en macOS, app30475/respaldo64075, reloj fijo2026-10-07 y cierra sus procesos al terminar. `respaldo.mjs` extiende en memoria el banco canónico sin editarlo.
