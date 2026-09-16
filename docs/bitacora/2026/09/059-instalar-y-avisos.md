# 059 · Instalar la app y activar los avisos: fricciones, decisiones y prototipo

**Fecha:** 2026-09-16 (noche) · **Base:** pedido del founder al ver el icono de instalar de Chrome: "un callout o un objeto en la parte superior cuando se pueda instalar la app… y luego crear un flujo para que activen las notificaciones". Primero pidió opinión; con "Adelante", la lista de fricciones y el prototipo para firmar.

## Qué se hizo
- **Opinión, en el chat.** Sí al objetivo. No a un aviso fijo arriba de la agenda: ya existió y se quitó con la F4 firmada el 2026-09-14. El objeto arriba sí, donde tiene motivo.
- **Lectura del código:**
  - la pregunta tras Voy y Seguir (`ConsentimientoAvisos`, `Asistencia`, `Seguir`);
  - `HojaInstalar`;
  - `AvisosPerfil` y la tarjeta de Novedades;
  - `lib/pushCliente.ts`, `lib/push.ts`, `lib/avisos.ts` y `public/sw.js`.
- **Simulador de iPhone 15 Pro con iOS 26.3, contra producción**, con un usuario desechable (perfil reservado) en un evento del 6 de diciembre sin asistentes:
  1. **Instalar desde Safari son cinco toques:** ··· › Compartir › Ver más › Agregar a pantalla de inicio › Agregar, con "Abrir como app web" encendido. La hoja de la app dice "Dos toques: Compartir, abajo al centro". Captura de los cinco pasos enviada al founder.
  2. **Voy › "¿Te recordamos ese día?" › En el teléfono** termina en "Sin avisos. Si cambias de idea, está en Mi perfil" y "Este navegador no puede recibir avisos". La hoja de instalar no sale. En la base quedó `avisos_push: false` y `avisos_preguntado: true`. La llave pública de avisos sí llega a la página en producción; la causa es el orden de `estadoPush`, que mira si hay avisos en el navegador antes de mirar si es un iPhone sin instalar.
  3. **La app instalada abre con la sesión de Safari** y nada pide los avisos.
  4. **Ajustes dentro de la app instalada** dice "Solo con la app instalada en inicio". El interruptor muestra el permiso del iPhone. Tras Permitir sale "No se activaron los avisos.": el simulador no terminó el alta, seguramente por un límite suyo, porque en producción hay 2 personas con avisos en el teléfono.
- **Limpieza:** usuario borrado (el evento volvió a 0 asistentes y no quedaron altas de avisos). El icono agregado se quitó del simulador, que quedó apagado. Los dos iconos anteriores de Somos Nosotros en el simulador no son de esta sesión.
- **Entregado:**
  - fricciones [16](../../../rediseno/16-instalar-avisos-fricciones.md) (14, con "Tu decisión");
  - decisiones [17](../../../rediseno/17-instalar-avisos-flujo-y-estados.md) (11, con flujo y estados);
  - prototipo [instalar-avisos.html](../../../rediseno/prototipos/instalar-avisos.html) · https://claude.ai/artifact/LHH9XsGDzf6V5CFk5CwfV4.

## Hallazgos que cambian el diseño
- **La app de la tienda, decidida esta noche** ([OL-032](../../../ops/OPEN_LOOPS.md), bitácora [057](057-app-de-iphone-en-la-tienda.md)), cambia el camino del iPhone. Queda como T1. Recomendación: arreglar ya lo roto, porque la tarjeta "Activa los avisos" y los estados por teléfono se usan igual dentro de la app.
- **El objeto arriba que pidió el founder** lo dibuja Safari cuando la app esté publicada: el aviso de la App Store (Smart App Banner, Apple ID 6812916453). Se comprueba al publicar.
- **La sesión pasa de Safari a la app instalada** (iOS 26.3): la tarjeta Activar no necesita "entra primero".
- **Lo firmado en la decisión 10 de [02](../../../rediseno/02-inicio-flujo-y-estados.md) ("En Android, botón Instalar") no se construyó.** En Android los avisos llegan sin instalar; instalar sirve para el icono.

## Visto al pasar
En el simulador, la ✕ de texto de `ui/Hoja` se dibujó como un cuadro con "?". Siete piezas más escriben la ✕ igual; `ui/Cerrar` ya usa el icono. Se propuso como tarea aparte: confirmar y pasar todas al icono.

## Segunda vuelta, la misma noche: decisiones del founder y el calendario
- **Decidido:**
  - "Ok, tomo tus propuestas": decisiones 1 a 9 de 17 aceptadas.
  - **Quien visita sin cuenta: A**, nada arriba.
  - **La app de la tienda se detiene:** «no veo necesario hacer app nativa aún. No suma valor todavía y me entretiene», y en fase de pruebas cada actualización costaría el doble. Se queda la web instalada en el inicio. CLAUDE.md, DEFINICION y PLAN vuelven a decir "sin app de tienda", con la fecha. OL-032 pasa a Después como detenido; lo hecho en Apple se queda.
- **Sumado por el founder:** los avisos también pueden venir del calendario, para quien no quiere alertas de ningún tipo. El botón "Calendario" de la ficha parece que muestra un calendario.
- **Medido:**
  - el archivo de calendario de un evento real no trae alerta (sin `VALARM`), y el punto y coma no se escapa (`"\;"` en JS es solo `;`);
  - en el simulador (iOS 26.3), tocar "Calendario" abre la hoja del calendario del iPhone con título, lugar, hora, liga y **"Alerta: Ninguna"**, en Safari y en la app instalada.
- **Propuesta para firma** (fricciones K1 a K3 en [16](../../../rediseno/16-instalar-avisos-fricciones.md), decisiones 12 a 14 en [17](../../../rediseno/17-instalar-avisos-flujo-y-estados.md), prototipo v1.1 en el mismo enlace):
  - el botón "A mi calendario" con el icono de agregar al calendario (+ en la esquina, distinto de "Publicar evento");
  - el evento con una alerta 1 hora antes;
  - "No, gracias" ofrece "A mi calendario";
  - en Android, por comprobar en un teléfono qué hace el archivo.
- **Prototipo v1.1:** sin las pantallas de quien visita y de la app de la tienda; con K0 (botón), K1 (hoja del calendario con la alerta) y K2 ("No, gracias" con calendario).

## Pendiente del founder
1. Recorrer el calendario en el prototipo v1.1 (K0 a K2) y firmar 12 a 14.
2. Con la firma: un PR "Instalar y avisos" con las decisiones 1 a 9 y 12 a 14.

Sin cambios de código, sin migraciones, sin commit. Cambiados en texto: CLAUDE.md, DEFINICION.md, PLAN.md y OPEN_LOOPS.md.
