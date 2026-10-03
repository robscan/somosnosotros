# 288 · Redirecciones internas seguras (OL-261 / H04)

**Fecha:** 2026-10-03. **Estado:** candidato probado, listo para revisión.
Reserva de Gestor de cambios III: rama `seguridad-redirecciones`, base
`origin/main 3d7945c8`, worktree `/Users/apple-1/somosnosotros-seguridad-redirecciones`.
OL261/bit288; numeración comprobada. Sin migración ni subagentes. Founder ordenó
continuar tras recuperar Supabase y mantiene autorización de publicar cada entrega
probada. Publicación con ventana cedida por el gestor tras revisión.

## Fallo reproducido y corrección

`rutaSegura` admitía `/\t/example.test`, `/\r/example.test` y `/\n/example.test`.
Al pasarlos a `new URL(destino, origen)`, la URL resultante cambiaba al host ajeno.
Reproducción sin red y en pruebas del callback con Auth simulado; no se completó
OAuth real ni se afirma robo de sesión. Regresiones nuevas antes del arreglo:
9 fallos / 29 pruebas correctas en los tres archivos focalizados.

El único archivo de producto modificado es `src/lib/rutas.ts`:

- Rechaza autoridades externas, barras inversas y controles ASCII en cualquier
  parte del valor. Así URL no puede eliminar un control y cambiar su significado.
- Interpreta la entrada respecto de un origen fijo ficticio, compara el origen y
  devuelve pathname + search + hash normalizados, nunca la autoridad.
- Rechaza también pathname que normaliza a `//`: `/a/..//example.test` no debe
  convertirse en una autoridad al reutilizar la ruta devuelta.
- Los fallbacks los proporcionan los llamadores; conserva el vacío usado por el
  alta de lugar. Query y fragmento legítimos se conservan, incluidos valores de
  búsqueda que contienen una URL codificada. No hace decodificaciones sucesivas.

Inventariados consumidores: Entrar, inicio/fin de proveedor (nuevoIntento y
leerIntento), callback de correo, regreso al envoltorio, historial y alta de lugar.
Todos ya pasan por esta frontera; no necesitan cambios de producto adicionales.
No se modifican proveedores/configuración Auth, interfaz, avisos, ubicación,
archivos nativos ni PR294/295. Tráfico de imágenes sigue pieza separada del gestor.

## Pruebas y revisión visual

- **76 pruebas focalizadas** de rutas, intento/cookie, historial y callbacks.
  Cubren controles0–31/127, tab/CR/LF codificados en query, barras inversas,
  normalización de segmentos, cookie manipulada, composición URL real y
  preservación de query/fragmento, origen localhost/producción y fallback vacío.
- **1747 unitarias / 131 archivos**, tipos, build e inventario correctos.
  Lint global sin errores; se retiró una directiva ESLint innecesaria encontrada
  durante la iteración y lint focalizado final limpio. Queda el warning anterior
  de `VisorImagen.componentes.test.mjs:169`.
- No se repite PG local: no hay SQL ni contrato de datos modificado. CI ejecuta
  sus controles obligatorios sobre el candidato, incluido PostgreSQL y medir.
- QA con la skill front-visual, `next build` + `next start` y Auth/datos sintéticos
  en loopback. Callback con tab codificado retorna a `/perfil`; destino válido
  retorna a `/ajustes?desde=perfil#avisos`; Entrar con sesión y LF codificado
  también retorna a `/perfil`. No se navega al host atacante.
- Capturas390×844 en `docs/rediseno/capturas-288/`: 288-01 muestra Perfil con
  identidad, actividad, ajustes y navegación; 288-02 muestra Ajustes legible,
  con ficha, avisos y cuenta. Sin cambio de maquetación. VAPID intencionalmente
  ausente en el fixture; imágenes de eventos mostradas como placeholder.

En la primera navegación local se mezclaron127.0.0.1 y localhost; Next normaliza
el origen de callback a localhost y la cookie no atraviesa hosts. La prueba final
usa localhost de forma consistente. No se cambió el código para ocultar esta
condición local. Ningún acceso/envío real ni prueba de Safari físico.
Logs locales: `/tmp/sn-ol261-evidencia/`.

## Cierre previo y publicación

El gestor autorizó incluir el cierre documental H03 (bit287 y OL260) en este PR.
Supabase restablecido: lectura pública200, preferencias/filtros privados y RPC
anónima401/42501; estado supabase:ok. Se conservan antecedentes de la cuota y la
limitación de QA autenticado sintético/Safari físico pendiente.

Siguiente: revisión del gestor sobre SHA congelado, CI y ventana de publicación;
merge con Production del SHA exacto, dominio saludable y comprobación anónima de
Entrar con destino manipulado sin completar OAuth ni escribir datos reales.
Recuperación: revertir este cambio reintroduce H04; preferir corregir la frontera
si apareciera una regresión. Sin migraciones ni cambios de configuración que
revertir.
