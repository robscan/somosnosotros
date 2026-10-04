# 302 · Artistas con novedades en destacados — OL-275

**Fecha:** 2026-10-04. **Rama:** `prototipo-novedades`. **Base:** `origin/main` `e454a334f062d7c03c82438ad106dbbe070e0a64`. **Worktree:** `.claude/worktrees/prototipo-novedades`. **Operador:** Codex, chat `01a108e1-7881-7420-85d0-9ce1947405c1`.

## Encargo y límites

El founder pidió leer la asignación de Gestor III, entenderla y preguntarle las dudas. Se leyeron memoria, gestión, reservas, contexto de producto, estado de Git y antecedentes de novedades (doc 44 y migraciones vigentes). La carpeta principal estaba nueve commits atrás; la reserva nueva estaba en el registro local del gestor y su mensaje completo en «Gestor de cambios III», sesión `local_004a210b-4803-4298-bd64-2666df33576c`.

El mensaje reserva OL-275/302, rama/base/worktree y archivos de prototipo. Primera fase: carril, renglón y ficha con «Nuevo video» para YouTube/Vimeo y «Nuevo audio» para SoundCloud/Bandcamp/Mixcloud. Una novedad visible destaca por 7 días desde su publicación; la última decide el sello. Primero elegidos, después novedades por recencia, tope 12 y sin duplicados. Prototipo local; no `src`, SQL, producción, push ni agentes adicionales. La segunda fase necesita firma del founder y consultar al gestor la forma de la consulta y su migración que solo añade.

Se consultaron cuatro bordes directamente al gestor en Claude, por autorización expresa del founder. Su respuesta confirmó:

- La foto sigue siendo necesaria para entrar al carril. Sin foto, el sello vive en lista y ficha.
- El respaldo de próximos eventos por seguidores se usa solo cuando no hay elegidos ni novedades vigentes; se acepta un carril corto.
- Al ocultar/borrar la última novedad, se recalcula con la anterior visible que conserve menos de 7 días. Un elegido manual permanece y cambia o pierde solo el sello.
- `ui/Chip variante="sello"` con el tratamiento de «Hoy» en tarjeta; el mismo sello sin control separado en lista y ficha.
- HTML autónomo compilado con React/CSS reales de main; tocar abre la novedad exacta sin reproducción automática. Autorizó crear la rama y empezar.

El comprobador `bash scripts/ops/siguiente-bitacora.sh` confirmó última 301/OL-274 y siguientes 302/OL-275. No se tomó ningún número nuevo.

## Entrega

[Prototipo autónomo](../../../rediseno/prototipos/artistas-novedades.html), con un laboratorio de escenarios separado de las pantallas. Recursos, Bricolage y retratos SVG sintéticos incluidos: el HTML abre sin servidor ni conexión. Se conservaron los estilos canónicos de tarjetas, renglones, héroe, KPI, barras y acciones. La pastilla Seguir usa el mismo marcado y `ui/Boton` que la ficha actual; su efecto está simulado.

La revisión visual detectó el sello de la ficha estirado por la rejilla de avisos; se corrigió su colocación con `justify-self:start`. Se repitieron únicamente las comprobaciones del prototipo después de esa corrección y de conciliar la pastilla Seguir con el canon. Ningún archivo real de producto se editó.

[Guía y evidencia](../../../rediseno/capturas-302/README.md): 22 PNG a 320×844/390×844, medidas e inventario de fuentes con sus hashes. Todas las capturas finales se abrieron para revisión visual. Carril con foto sintética, elegidos+novedades; ambos tipos de sello; mismo artista en lista/ficha; ficha sin foto; día 8; recálculo al borrar; respaldo y textos al límite 80/40.

## Verificación y alcance de la evidencia

- 20 estados medidos sin scroll horizontal del documento; Bricolage real cargada.
- Orden elegido/novedad, 12 máximos, sin duplicados, foto necesaria y exclusión de controles ocultos/restringidos.
- Frontera temporal: un milisegundo antes de cumplir 7 días todavía hay sello; exactamente a los 7 días desaparece.
- Ocultar o borrar el último audio de Mar Sol repone su video anterior vigente; sin otra novedad sale; la elegida Luna permanece sin novedad.
- Tarjeta de Mar Sol abre la ficha con `novedad=n3`, y su reproductor de muestra queda visible. No reproducción automática.
- Cero errores de navegador y cero solicitudes HTTP externas; datos, servicios y navegación simulados.
- Solo documentación/prototipo: sin build de Next ni suites de la app. Revisión de diff, enlaces y alcance antes del commit.

**Estado:** listo para revisión final de Gestor III; después, presentación y firma del founder. No se afirma que la funcionalidad exista en producción. No hay migración ni propuesta SQL final: antes de fase 2, revisar consulta, permisos, costo y caché con el gestor. Safari físico todavía no probado para esta propuesta.
