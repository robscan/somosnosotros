# 25 · Obras colectivas: Pincel es la primera, el motor se saca con la segunda

**Estado:** **firmado por el founder el 2026-09-21** («Firmo, adelante»). Nada construido: son cinco ajustes al plan de Pincel en la app (OL-088, bitácora 123, que vive solo en la rama local `pincel-app`). · **OL:** OL-097 · **Bitácora:** [132](../bitacora/2026/09/132-obras-colectivas-criterio.md)

## De dónde sale

2026-09-21, founder: «este proyecto que propone crear un motor de experiencias interactivas, que sirva para crear varias experiencias […] Me interesa absorber esa filosofía de eficiencia y re aprovechamiento de los recursos desarrollados sin que sea bloqueante para que pincel se pueda cerrar cuanto antes, mi principal duda es si es posible desarrollar pincel como un primer acercamiento a este proyecto».

La propuesta viene de la rama del chat de la beca en ChatGPT (la misma fuente del doc [24](24-grafo-cultural.md)): una base común, «Somos Nosotros Live» (QR → sesión → participante → entrada → estado colectivo → salida), tres motores (entrada, colectivo, salida), un simulador de participantes, y cada obra como una configuración encima.

## En una línea

Sí se puede, y cuesta casi nada, porque el plan de Pincel ya sigue esa cadena. La condición: **no se construye el motor; se construye Pincel con lo común separado de lo propio.** El motor se saca cuando exista la segunda obra, que es cuando se sabrá de verdad qué es común.

## Qué es común y qué es de Pincel

| Común a cualquier obra (ya está en el plan de OL-088) | Solo de Pincel |
| --- | --- |
| Tabla `obras_colectivas`: nombre, evento, lugar, abierta/cerrada, hora de cierre, imagen final | El mando: botón, Trazo, Tinta |
| Crearla desde el evento, el panel o la ubicación; terminar y reabrir | El mensaje que viaja: pincel, color, movimiento |
| Entrar por el QR, con sesión, y comprobar la cercanía | Cómo se dibuja en la pared |
| Un canal en vivo por obra y el contador de personas | |
| Pedir permiso de los sensores | |
| La pared: pantalla completa, QR que se esconde al cerrar | |
| Guardar la imagen final; algún día, «este evento dejó esta obra», su único lazo con el grafo (doc [24](24-grafo-cultural.md)) | |

**Una obra nueva es tres cosas: su mando, su mensaje y su dibujo.** Lo demás se reaprovecha.

El «motor colectivo» no pide servidor propio: la pared recibe los mensajes de todos y dibuja. En Pincel pinta trazos; en otra obra (un enjambre, unas partículas) haría lo mismo con otras reglas. Supabase Realtime alcanza; el stack no cambia. Límite conocido: hay una sola pared por obra; dos pantallas a la vez no verían exactamente lo mismo.

## Los cinco ajustes al plan de OL-088

1. **Columna `tipo`** en `obras_colectivas` (texto, por defecto «pincel»), añadida a la migración antes de aplicarla. Hoy es gratis; después sería otra migración.
2. **Direcciones neutras:** `/obra/[id]/pared` y `/obra/[id]/mando`, en vez de `/pincel/...`.
3. **Dos carpetas:** lo común (canal en vivo, presencia, cercanía, sensores, guardar imagen) y lo de Pincel (mando, mensaje, dibujo). Es orden de archivos, no una capa nueva: sin SDK, sin registro de obras, sin configuración abstracta.
4. **Un simulador chico en la Fase 2:** un script que finge 20, 50 o 100 mandos enviando al canal. Es lo único de la propuesta que vale adelantar: la prueba de la Fase 2 (dos teléfonos) no dice si aguanta un evento real, y el plan ya marca el cupo de Realtime como riesgo sin verificar. Sirve igual para todas las obras que vengan.
5. **Renombrar la migración antes de aplicarla** (dato del gestor): `20260919030000_obras_colectivas.sql` necesita una fecha posterior a `20260921100000_rol_de_entonces_en_listas.sql` (reservada para OL-093), porque `db push` rechaza una migración más vieja que la última aplicada. El nombre nuevo lo da el gestor. Al reanudar, añadir también a la bitácora 123 una línea que apunte a este documento.

Costo estimado: medio día repartido entre las fases, sin alargar ninguna.

## Qué NO entra

El SDK, los tres motores como capas separadas, audio, luces, objetos que se mueven, telemetría, el laboratorio de 8 a 12 experimentos. Sirve para la solicitud de la beca, no para la cola de trabajo (mismo criterio que el doc 24).

## La regla

**Nada se generaliza hasta que la segunda obra lo pida.** El riesgo de esta pieza no es técnico: es ceder a «ya que estamos, hagámoslo genérico». Con una sola obra, cualquier abstracción saldría mal; con dos, se ve sola.

## Pendiente

- **Pincel sigue en pausa** por orden del founder (créditos, 2026-09-19). Este documento no lo reanuda: si el founder decide subirlo en la cola, lo confirma el gestor antes de mover nada.
- Quien reanude OL-088 aplica los cinco ajustes; el gestor decide cuándo.
