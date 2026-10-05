# OL-276 · Entrada de fichas con movimiento reducido

Aplicación Next16.3.8 real con Bricolage/CSS del candidato; datos e imágenes del respaldo sintético, sin Supabase remoto.36 recorridos: artista/lugar/evento ×320/390 ×movimiento reducido/normal ×entrada directa/recarga/tarjeta. `qa.json` confirma ancho igual al viewport, main.x=0 y ningún antecesor transformado en los36. Doce PNG de recarga se miraron completos; las dos preferencias producen el mismo estado final. Eventos sirve como control porque no usa EntradaFicha; artista y lugar sí.

La regresión de componente usa SSR y hydrateRoot reales: el código anterior falla en2 casos reducidos de entrada directa/recarga;6 casos restantes pasan. Con el arreglo pasan los8. Se añaden2 comprobaciones del primer pintado SSR reducido con JavaScript desactivado: CSS mantiene la ficha visible antes de hidratar.

Para repetir las capturas: compilar con NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:49767, NEXT_PUBLIC_SUPABASE_ANON_KEY=llave-inventada y NEXT_PUBLIC_MAPBOX_TOKEN=pk.inventado; ejecutar `node docs/rediseno/capturas-303/verificar.mjs`. Usa Chrome oficial instalado, respaldo49767/app30476, reloj fijo2026-10-07 y cierra sus procesos. Prueba Safari física pendiente del founder.
