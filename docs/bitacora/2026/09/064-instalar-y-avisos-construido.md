# 064 · Instalar la app y activar los avisos: construido y probado en el simulador (OL-034)

**Fecha:** 2026-09-16 (noche) · **Rama:** `instalar-y-avisos`, en su propio árbol de trabajo · **Base:** firma del founder («Me quedo con tu propuesta») de [17](../../../rediseno/17-instalar-avisos-flujo-y-estados.md): decisiones 1 a 9 y 12 a 14; V1 = A y sin app de tienda (bitácora [059](059-instalar-y-avisos.md)).

## Qué se construyó
- **Qué puede este teléfono** (`src/lib/plataforma.ts`, lógica pura con pruebas): primero se mira si es un iPhone sin instalar y después si el navegador tiene avisos. Así en iPhone sale la hoja de instalar; antes terminaba en "Sin avisos". Reconoce Safari y su versión, Chrome del iPhone, el navegador de Instagram o Facebook, la computadora y el iPad que se presenta como Mac. `src/lib/pushCliente.ts` le pasa los datos reales, no se queda esperando si no hay service worker y dice por qué falló un alta ("bloqueado" o "fallo").
- **Hoja "Instala Somos Nosotros"**: los pasos del Safari de la persona, con sus iconos. En iOS 26 son cinco: ··· › Compartir › Ver más › Agregar a Inicio › Agregar. Antes de iOS 26: Compartir › Agregar a pantalla de inicio › Agregar. Fuera de Safari pide abrirla en Safari. Al pie, el icono real y "Después, ábrela desde tu inicio y toca Activar".
- **La pregunta de avisos** (`ConsentimientoAvisos`):
  - al cerrar la hoja, "Falta un paso" con "Ver los pasos" y el correo, sin palomita;
  - lo que no se puede se dice con su causa y salida (bloqueados y dónde se activan, "No pudimos darte de alta" con reintento, el navegador de otra app), y un "sí" ya no se guarda como "no";
  - dado de alta en Chrome o Android sin instalar: "Tenla en tu inicio · Instalar";
  - "No, gracias" ofrece "A mi calendario";
  - "En esta computadora" en la computadora;
  - "Se cambia en Ajustes".
- **Tarjeta "Activa los avisos en este teléfono"** (`ActivarAvisos`): arriba de la agenda. La página la pinta si la cuenta pidió avisos en el teléfono, y solo sale en la app instalada cuando este teléfono aún no tiene permiso. Activar pide el permiso; la ✕ no vuelve en ese teléfono.
- **Cada teléfono dice su verdad:**
  - el renglón de Ajustes (`AvisosPerfil`) dice activados, apagados, instalar la app, bloqueados o este navegador no los recibe;
  - la barra de Seguir solo promete "en este teléfono" si lo está;
  - Novedades (`TelefonoAun`) solo sale si aquí se pueden activar;
  - `borrarSuscripcionPush` deja la cuenta con avisos si queda otro teléfono dado de alta.
- **La pregunta solo tras un toque** (`Asistencia`, `Seguir`): ya no se abre sola al volver a la ficha. La excepción es volver de Entrar tras tocar Voy o Seguir sin sesión (`src/lib/intencionAvisos.ts`, en la pestaña).
- **Instalar en un toque** donde el navegador lo avisa (Chrome, Edge, Android). Un guion en el layout guarda el aviso antes de que cargue React (`src/lib/avisoInstalar.ts`) y `useInstalarApp` abre el diálogo del navegador. En Ajustes › Somos Nosotros va "Instalar la app" (`InstalarApp`): un toque; o "5 toques en Safari", que abre la hoja; o dónde abrirla. Instalada, desaparece.
- **"A mi calendario"** en la ficha, con el calendario con + en la esquina (`IconoCalendarioAgregar`). El archivo (`src/lib/calendario.ts`, con pruebas) lleva una alerta 1 hora antes y escapa el punto y coma. Se nombra con el evento (`noche-de-son-en-el-patio.ics`).
- **Insignia de los avisos en Android**: `public/icono-aviso.png`, silueta SN transparente de 96 px, generada con `docs/diseno/logotipo/insignia.py`, en `public/sw.js`.
- Sin migración y sin variables nuevas.

## Verificación
- **Comprobaciones:** lint, tipos, 203 pruebas (25 nuevas) y build en verde.
- **Simulador**, con el build de la rama en local: iPhone 15 Pro, iOS 26.3, en español de Latinoamérica, con usuario desechable borrado al final (el evento volvió a 0 asistentes y a 0 altas):
  1. La ficha muestra "A mi calendario" con el icono nuevo.
  2. Voy › pregunta › En el teléfono: sale la hoja de instalar.
  3. **Los nombres de Safari en español, medidos:**
     - Compartir es el primero del menú ···;
     - "Ver más" va al final de la fila de Copiar;
     - la opción se llama **"Agregar a Inicio"**, no "Agregar a pantalla de inicio";
     - la confirmación dice "Agregar", con "Abrir como app web" encendido.

     Hoja y pruebas corregidas con eso.
  4. Cerrar la hoja: "Falta un paso · Ver los pasos · Mientras, ¿por correo?". La cuenta quedó con `avisos_push: true`. Tras "No", queda "Se cambia en Ajustes" y la hoja no se cierra sola.
  5. Al volver a la ficha con Voy puesto y sin contestar, la pregunta ya no se abre sola.
  6. A mi calendario: la hoja del calendario con **"Alerta: 1 hora antes"**.
  7. No, gracias: "Sin avisos. Se cambia en Ajustes." y "A mi calendario · Con una alerta 1 hora antes · Agregar", que abre el calendario con la alerta.
  8. Ajustes en Safari: "En el teléfono · Instala la app para recibirlos" y "Instalar la app · 5 toques en Safari".
- **Navegador integrado** (trae los avisos bloqueados):
  - en computadora, Ajustes dice "En esta computadora · Bloqueados: se activan en la configuración del sitio", con el interruptor sin tocar y sin "Instalar la app";
  - captura 390×844 de la ficha;
  - consola sin errores.

## Lo que queda para el iPhone del founder, con la vista previa
- **La tarjeta "Activa los avisos" dentro de la app instalada.** En localhost la app instalada no hereda la sesión de Safari (en producción sí, medido en la 059). Entrar dentro de ella exigía mandar un correo real, y en el navegador integrado los avisos vienen bloqueados.
- **El alta completa de avisos:** el simulador no la termina.
- **Instalar en un toque en Chrome o Android, la insignia en Android y qué hace "A mi calendario" en Android.**

## Notas
- **Texto de la tarjeta:** "Para recordarte lo que vas y lo que sigues". El prototipo decía "lo que vas", pero la cuenta también pide avisos al seguir un lugar o artista.
- **Simulador:** el idioma se cambió a español para la prueba y volvió a como estaba; la app instalada de prueba se borró; los dos iconos anteriores no son de esta sesión.
- **main en la rama:** traída antes de los documentos, con la 061.

## Pendiente del founder
1. Decir si hago push para que Vercel arme la vista previa y abro el PR.
2. En la vista previa, desde su iPhone:
   - Safari › Voy › En el teléfono › instalar › abrir › Activar › Permitir;
   - con un evento del día siguiente, el recordatorio de las 9:00.
