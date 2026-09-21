# 132 — Criterio de obras colectivas: Pincel primero, el motor con la segunda

**OL-097.** Chat del founder «Motor de experiencias interactivas» (Fable 5.1), abierto el 2026-09-21 en la carpeta principal. Rama `obras-colectivas-criterio` desde `origin/main` (`7a36ab0`), en árbol propio `/Users/apple-1/somosnosotros-obras-colectivas`. Solo documentos.

## Qué pidió el founder

Aterrizar la propuesta de ChatGPT de un motor de experiencias interactivas frente a Pincel, en pausa: «mi principal duda es si es posible desarrollar pincel como un primer acercamiento a este proyecto y que sirva ese esfuerzo para optimizar recursos, entendiendo que quiero lanzar pincel cuanto antes».

## Qué se hizo

- Leídos, sin cambiar nada: la propuesta (turno 16 de la rama del chat de la beca, traída por el Gestor de cambios II), OL-084 (prototipo firmado), el plan de Pincel en la app (bitácora 123 y migración, en la rama local `pincel-app`) y el doc 24.
- Conclusión: el plan de Pincel ya sigue la cadena del motor (QR → sesión → participante → entrada → estado colectivo → salida). Basta separar lo común de lo propio; el motor se saca cuando exista la segunda obra. La pared junta y dibuja: sin servidor propio, stack sin cambios.
- El founder firmó: «Firmo, adelante».
- Aviso al gestor antes de tocar nada (regla del founder, 2026-09-17); con su reserva se escribió [25-obras-colectivas-criterio.md](../../../rediseno/25-obras-colectivas-criterio.md): tabla de lo común y lo propio, cinco ajustes al plan de OL-088 (el quinto, renombrar la migración, es dato del gestor), qué no entra y la regla «nada se generaliza hasta que la segunda obra lo pida».

## Qué no se hizo

- No se tocó la rama `pincel-app` ni código. La bitácora 123 solo existe en esa rama: la línea que apunte al doc 25 queda encargada, dentro del quinto ajuste, a quien reanude OL-088.
- Pincel sigue en pausa. El founder aún no dice si sube en la cola; si lo decide, lo confirma el gestor.
- Sin council, workflows ni agentes.

## Verificación

Solo documentos: revisado el diff. `OPEN_LOOPS.md` solo suma (entrada OL-097, trozo nuevo al principio de «Last updated», línea en «Decidido»); ninguna línea de `main` cambia fuera de la cabecera, que conserva su cadena completa.
