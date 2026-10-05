# 307 · Enlaces públicos de Lugares desde el servidor

**Fecha:** 4 de octubre de 2026. **OL:** OL-279. **Rama:** `lugares-ssr`.
**Operador:** Codex, sin ayudantes. **Worktree:** `.claude/worktrees/lugares-ssr`.
**Base:** `f653e63967fb6f6873e54e6dfc1be4916c3e663c` (`origin/main`).

## Autorización y alcance

El founder pidió continuar el plan SEO y acelerar los ajustes conservando la coordinación. Gestor III evaluó la propuesta B y autorizó implementar OL-279/bit307: `VistaLugares.tsx`, `ListaLugares.tsx`, sus pruebas y documentación propia. Confirmó que OL-270 A solo toca `lugares/page.tsx` y `FilaLugares`, sin conflicto de escritura con esta pieza. Producción queda con el gestor y requiere el «publica» del founder; OL-277 y PR341/OL-278 siguen congelados.

El script de números comprobó hasta bit305/OL278. Bit307 fue reservada expresamente por el gestor; no se tomó bit306 ni otro número. No se editan la página del servidor, `useResuelta`, física/CSS de la hoja, consultas, topes, privacidad, URL ni textos de ciudad. Las capturas son evidencia de las pruebas de esta pieza.

## Cambio y regresión

La página ya obtiene los lugares públicos, pero `VistaLugares` ocultaba todo el cuerpo hasta resolver la promesa de sesión, seguimientos y destacados en un effect. El servidor por tanto no emitía los renglones ni sus enlaces.

- La misma `HojaLugares` y `ListaLugares` se renderizan desde el servidor con los datos públicos. Se conserva la primera tanda de 20 y la carga progresiva, grupos, orden, filtros y enlace slug/UUID de respaldo; no hay una segunda lista para buscadores.
- La lista omite Seguir mientras la cuenta es desconocida. Los enlaces funcionan como enlaces normales durante esa espera; al resolver, el toque ordinario vuelve a abrir la ficha dentro de la hoja. Los clicks modificados conservan su enlace. El alta del vacío también espera a conocer la sesión.
- El mapa espera sus extras. Su cálculo inicial se mueve a `MapaLugares`, componente local que se monta una sola vez con los destacados completos. Al revalidar cambia sus props y conserva su estado; no se remonta el mapa ni la lista.
- El esqueleto conserva el área del mapa. Su contenedor `data-techo-hoja` y los mandos mantienen la geometría que mide la hoja. No se alteran sus gestos ni sus estilos.

**Antes:** tres regresiones SSR fallaban por ausencia de lista, enlaces y vacío público. **Después:** los cuatro casos SSR pasan, incluido el render de la página real con una consulta capaz de leer un lugar privado propio: su filtro explícito lo excluye también del nuevo HTML.

Las pruebas de navegador usan HTML renderizado y `hydrateRoot` de Vista, Lista, Hoja, Fila, memoria y hooks reales; dobles solo para Mapbox y servicios externos. Cubren extras pendientes/resueltos, cuenta anónima y con sesión, destacados lejanos en el primer encuadre, lista y mapa sin remontar, Solo lo que sigo, Seguir, enlace modificado, ficha y cierre, filtro de tipo con hoja recogida, cambio de ciudad y regreso. La carga progresiva puede revelar más de 20 al hidratar; el límite exacto inicial se verifica en el HTML anterior a JavaScript.

## Evidencia local del candidato

| Comprobación | Resultado |
| --- | --- |
| Focalizadas SSR + lugares + tandas | 59/59, 1,58 s |
| Unitarias completas | 1.909/1.909, 138 archivos, 13,74 s |
| Tipos | Correctos |
| Lint | 0 errores; aviso previo `VisorImagen.componentes.test.mjs:171`, fuera de alcance |
| Componentes de Vista, Fila y Hoja | 25/25, 107,45 s; sin skips en Mac, incluida física de la hoja |
| Build y medición de Lugares | Build 31 s; 4 pantallas × 4 anchos, sin novedades, 59 s totales |
| Inventario CSS | Sin novedades; no se cambiaron presupuestos ni excepciones |
| App compilada, HTTP | Cuatro casos: humano/Googlebot × anónimo/sesión; HTTP200, 9 enlaces slug públicos, 0 direcciones privadas |
| App compilada, UI | Lista, mapa único, ficha/cierre y sin desborde horizontal en 320, 390 y 1280; sin errores de página |

Los 9 enlaces son del respaldo inventado, no un nuevo conteo de producción. Para probar privacidad se añadió en memoria al respaldo un lugar privado con nombre/dirección distintivos; se comprobaron ambas sesiones sin escrituras reales. Se reutilizó el build de `medir` para HTTP y capturas, sin recompilar para cada comprobación. Las fotos y el estilo de mapa son recursos locales/sintéticos: no equivale a QA de cartografía remota ni Safari físico.

La inspección de capturas detectó que la hoja inicial móvil quedaba llena en este entorno. Se comparó con el build anterior de OL-278, cuyos archivos UI coinciden con la base: misma geometría (`y=612`, ancla333,34, techo108 a390) y **PNG inicial a390 idéntico** (SHA256 `1c40f2f48fbf9e647de4c60dcafde6c9d6553c290a6c2ad6df891c4d7bbc9551`). No se modificó la física para corregir un comportamiento previo fuera de esta reserva. La referencia anterior emitía 0 enlaces en los cuatro HTTP; B emite 9.

Capturas locales revisadas:

- Lugares: [320](capturas-307/lugares-320.png), [390](capturas-307/lugares-390.png), [1280](capturas-307/lugares-1280.png).
- Ficha: [320](capturas-307/ficha-320.png), [390](capturas-307/ficha-390.png), [1280](capturas-307/ficha-1280.png).
- Comparación anterior: [Lugares390](capturas-307/base-lugares-390.png).

## Entrega y límites

Pruebas focalizadas durante el trabajo y controles completos al congelar candidato; CI requerida del PR sin omitir comprobaciones. Resultados reutilizables solo para este código/base y entorno. El gestor recibe una entrega consolidada con PR sin unir, SHA, CI y vista previa, sin sondeos de avances intermedios.

No hay migraciones ni variables nuevas. El HTML contiene enlaces sin depender de JavaScript; el CSS móvil previo sigue ocultando la hoja hasta medirla al hidratar. Esta pieza mejora la disponibilidad de enlaces para rastreo, sin afirmar indexación ni aumento de posición/tráfico. C/D y Search Console/Bing conservan sus autorizaciones separadas. Publicación y comprobación del dominio corresponden al gestor.
