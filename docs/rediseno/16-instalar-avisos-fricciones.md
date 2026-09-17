# Instalar la app y activar los avisos · lista de fricciones (v1.2: firmada por el founder el 2026-09-16; construida en la rama instalar-y-avisos, bitácora 064)

**Fecha:** 2026-09-16 (noche) · **Pedido:** el founder vio el icono de instalar de Chrome y propuso "un objeto arriba cuando se pueda instalar la app" y "un flujo para que activen las notificaciones". Al revisar la v1 añadió que los avisos también pueden venir del calendario, para quien no quiere alertas de ningún tipo, y que el botón de calendario de la ficha debe decir que agrega al calendario ("hoy pareciera que mostrará un calendario") · **Pantallas:** la pregunta de avisos tras "Voy" o "Seguir", la hoja "Instala Somos Nosotros", la app instalada al abrirla, Ajustes › Avisos, la barra de Seguir, Novedades y el botón de calendario de la ficha de evento · **Mirada:** simulador de iPhone 15 Pro con iOS 26.3 (393×852) contra producción, con un usuario desechable (borrado al terminar: el evento volvió a 0 asistentes), el archivo de calendario de un evento real y lectura del código · **Base:** la fricción F4 firmada en [01](01-inicio-fricciones.md) (el aviso de instalar, nunca antes del contenido) y la decisión 10 de [02](02-inicio-flujo-y-estados.md) (avisos con consentimiento por canal) · **Decisiones:** [17-instalar-avisos-flujo-y-estados.md](17-instalar-avisos-flujo-y-estados.md) · **Prototipo:** [prototipos/instalar-avisos.html](prototipos/instalar-avisos.html) (publicado para el iPhone en https://claude.ai/artifact/LHH9XsGDzf6V5CFk5CwfV4) · **Quién decide:** el founder corrige, tacha y firma.

**Firma del founder (2026-09-16, noche):**
- "Ok, tomo tus propuestas": de acuerdo con I1 a C3.
- **V1 = A:** nada arriba para quien visita sin cuenta.
- **La app de la tienda se detiene** (T1): el iPhone se queda con la app instalada desde Safari.
- Añadió el calendario (K1 a K3, abajo) y lo firmó en el prototipo v1.1: «Me quedo con tu propuesta».

## Diagnóstico

En el iPhone, pedir avisos en el teléfono hoy no lleva a ninguna parte: la hoja de instalar nunca sale, la tarjeta termina en "Sin avisos" y se guarda un "no" que la persona no dijo (I1). Al arreglarlo saldrían dos más: la hoja da los pasos de un Safari que ya no existe (I2) y, al abrir la app instalada, nada pide los avisos (A1). En Android y en la computadora los avisos funcionan, pero nunca ofrecemos instalar (C1). Donde se ve el estado (Ajustes, la barra de Seguir, Novedades) se lee de la cuenta y no del teléfono, así que puede decir "Activados" sin estarlo (E1).

Para quien no quiere alertas, el recordatorio es su propio calendario. El botón ya existe y funciona (abre la hoja del calendario del iPhone), pero dice "Calendario", como si fuera a mostrar uno (K1). Además, el evento entra con "Alerta: Ninguna": el calendario no le va a recordar nada (K2). Y quien contesta "No, gracias" no recibe esa alternativa (K3).

**Lo que ya funciona (medido en el simulador):**
- La pregunta sale en cuanto se toca "Voy", con su motivo ("Vas a…", "Ya estás en la lista de quien va").
- Instalar desde Safari lleva la sesión a la app: abrió con la cuenta puesta.
- Dentro de la app instalada, el interruptor de Ajustes muestra el permiso del iPhone ("Somos Nosotros quiere enviarte notificaciones").
- Tras Permitir, el simulador no terminó el alta ("No se activaron los avisos."). Seguramente es un límite del simulador: en producción hay 2 personas con avisos en el teléfono (bitácora [058](../bitacora/2026/09/058-pedir-ayuda-al-volver.md)).
- Tocar "Calendario" abre la hoja del calendario del iPhone con el evento, el lugar, la hora y la liga, tanto en Safari como en la app instalada.

## Resumen por severidad

| # | Dónde | Fricción | Ley | Severidad | Propuesta en una línea |
|---|---|---|---|---|---|
| I1 | iPhone · Safari | "En el teléfono" termina en "Sin avisos… Este navegador no puede recibir avisos"; la hoja de instalar nunca sale y se guarda un "no" | Peak-End · Evidencia | Alta | Primero se mira si es un iPhone sin la app y sale la hoja; un "sí" nunca se guarda como "no" |
| I2 | iPhone · hoja de instalar | "Dos toques: toca Compartir, abajo al centro". En iOS 26 son cinco: ··· › Compartir › Ver más › Agregar a Inicio › Agregar | Evidencia · Jakob | Alta | Los pasos del Safari de la persona, con sus iconos |
| I3 | iPhone · al cerrar la hoja | Dice "✓ Te avisamos en este teléfono ese día" antes de instalar (hoy no se ve por I1; saldría al arreglarlo) | Evidencia | Alta | "Falta un paso", sin palomita, con lo que falta |
| A1 | App instalada | Al abrirla nada pide los avisos: "Después: al abrirla, acepta los avisos" no tiene nada detrás | Peak-End · Zeigarnik | Alta | Una tarjeta arriba de la agenda, una vez: "Activa los avisos en este teléfono · Activar" |
| E1 | Ajustes, Seguir, Novedades | Leen la cuenta, no el teléfono: "Activados en este teléfono" sin estar dado de alta; el primer toque lo apaga; apagar en un teléfono apaga todos | Evidencia | Alta | Cada teléfono dice su estado real; la cuenta guarda el consentimiento |
| K2 | Ficha de evento · calendario | El evento entra al calendario con "Alerta: Ninguna": el calendario no recuerda nada | Evidencia · Peak-End | Alta | El evento lleva una alerta 1 hora antes |
| E2 | Fichas de evento, lugar y artista | Si se cierra la pregunta sin contestar, se abre sola cada vez que se vuelve a esa ficha | El gesto gana | Media | Cerrar sin contestar es "ahora no": se pregunta en el siguiente Voy o Seguir |
| A2 | App instalada · Ajustes | Dentro de la app instalada, el renglón dice "Solo con la app instalada en inicio" | Evidencia | Media | El renglón dice el estado de este teléfono |
| C1 | Android y Chrome | Nunca ofrecemos instalar; lo firmado ("En Android, botón Instalar") no se construyó | Jakob · UX invisible | Media | Instalar en un toque con el diálogo del navegador, tras activar los avisos y en Ajustes |
| K1 | Ficha de evento · calendario | El botón dice "Calendario" con un calendario: parece que muestra uno, no que agrega el evento (observación del founder) | Evidencia · Jakob | Media | "A mi calendario" con el icono de agregar al calendario |
| K3 | Pregunta de avisos | "No, gracias" termina en "Sin avisos" sin la alternativa del calendario | Peak-End | Media | "Sin avisos" y, debajo, "A mi calendario · Agregar" |
| V1 | Quien visita sin cuenta | La página no ofrece instalar (F4: nada antes del contenido) | Atención selectiva · Peak-End | Decidido | **A:** nada arriba |
| T1 | iPhone · app de la tienda | La app de la tienda cambiaba el camino del iPhone | Jakob | Decidido | **Se detiene la app de la tienda:** el iPhone se queda con la app instalada desde Safari |
| A3 | App instalada | "No se activaron los avisos." sin causa ni salida | Evidencia | Baja | La causa y "Intentar de nuevo"; si están bloqueados, dónde se activan |
| E3 | Pregunta y barra de Seguir | "Si cambias de idea, está en Mi perfil" y "se cambia en Mi perfil": vive en Ajustes | Evidencia | Baja | "Se cambia en Ajustes" |
| C2 | Computadora | El canal se llama "En el teléfono" | Evidencia · Jakob | Baja | "En esta computadora" |
| C3 | Android | El icono chico del aviso es el icono entero de la app | Evidencia | Baja | Silueta SN transparente |

## Detalle por fricción

### I1 · En iPhone, "En el teléfono" termina en "Sin avisos"
**Qué se ve.** En Safari del iPhone: Voy → "¿Te recordamos ese día?" → En el teléfono → la tarjeta cambia a "Sin avisos. Si cambias de idea, está en Mi perfil." y debajo "Este navegador no puede recibir avisos. Te avisamos por correo si lo eliges.", pero ya no hay botón de correo. La hoja "Instala Somos Nosotros" no sale. En la base quedó `avisos_push: false` y `avisos_preguntado: true`: la pregunta no vuelve.
**Por qué duele.** La persona pidió que le recordemos y le decimos lo contrario de la verdad: el iPhone sí recibe avisos, instalando la app. El final del flujo es negativo y sin salida. Causa: [`estadoPush`](../../src/lib/pushCliente.ts) primero mira si el navegador tiene avisos y después si es un iPhone sin instalar. Safari solo tiene avisos dentro de la app instalada, así que en todo iPhone responde "no se puede" antes de llegar a la hoja.
**Propuesta.** Primero se mira qué teléfono es: iPhone en Safari → la hoja de instalar. "No se puede" queda solo para los navegadores que de verdad no pueden (por ejemplo, dentro de Instagram), con el correo como salida a la vista. Un "sí" nunca se guarda como "no".
**Decisión:** ☑ de acuerdo (founder, 2026-09-16)

### I2 · Los pasos de un Safari que ya no existe
**Qué se ve.** La hoja dice "Dos toques": "Toca Compartir · Abajo, al centro" y "Elige Agregar a pantalla de inicio", con una barra de Safari dibujada con Compartir al centro. En Safari de iOS 26 (medido en el simulador) la barra de abajo trae Atrás, la dirección y ···. Compartir está dentro de ···. La opción está escondida tras "Ver más" y, en el iPhone en español, se llama "Agregar a Inicio" (medido al construir); al final hay que tocar "Agregar". Son cinco toques: ··· › Compartir › Ver más › Agregar a Inicio › Agregar.
**Por qué duele.** La persona busca un botón que no está y abandona en el primer paso. Evidencia: la hoja afirma algo que la pantalla contradice.
**Propuesta.** Los pasos del Safari que la persona tiene: el sistema lo sabe por la versión del navegador. En iOS 26, los cinco toques con los iconos reales (···, Compartir, Ver más, el cuadro con +, Agregar en azul), uno por renglón y sin frases de ayuda. En versiones anteriores, Compartir abajo al centro › Agregar a pantalla de inicio › Agregar. Al final, "Después: ábrela y toca Activar".
**Decisión:** ☑ de acuerdo (founder, 2026-09-16)

### I3 · Al cerrar la hoja, la palomita llega antes que la app
**Qué se ve (en el código).** Al cerrar la hoja de instalar, la tarjeta dice "✓ Te avisamos en este teléfono ese día" y la cuenta queda como "quiere avisos en el teléfono", aunque no haya instalado nada ([ConsentimientoAvisos](../../src/components/ConsentimientoAvisos.tsx)).
**Por qué duele.** Promesa sin evidencia: el recordatorio no va a llegar. Hoy no se ve porque I1 lo tapa.
**Propuesta.** Sin palomita: "Falta un paso: instálala y, al abrirla, toca Activar", con "Ver los pasos" y la oferta del correo una sola vez ("Mientras, ¿por correo?"). La cuenta guarda que quiere avisos en el teléfono: con eso la app instalada sabe que debe ofrecer Activar (A1).
**Decisión:** ☑ de acuerdo (founder, 2026-09-16)

### A1 · Al abrir la app instalada, nada pide los avisos
**Qué se ve.** Tras instalar, la app abre la agenda con la sesión puesta y nada más. La hoja había prometido "Después: al abrirla, acepta los avisos". El único camino es ir a Mi perfil › Ajustes › En el teléfono.
**Por qué duele.** Peak-End: el final del flujo que la persona empezó (quiero que me recuerden) no existe. Zeigarnik: lo que quedó a medias debe recordarse con el paso exacto que falta.
**Propuesta.** El objeto arriba que propusiste, en el momento en que tiene motivo. Una tarjeta en lo alto de la agenda, con el dibujo de "Completar" de Mi perfil (icono, frase, botón): "Activa los avisos en este teléfono · Para recordarte lo que vas y lo que sigues" con [Activar] y ✕.
- **Cuándo sale:** solo si la persona pidió avisos en el teléfono y este teléfono aún no tiene permiso.
- **Activar:** el iPhone exige un toque para mostrar su permiso, y es este (medido: dentro de la app instalada, el permiso sale al tocar).
- **Con Permitir:** una línea "Listo: te avisamos en este teléfono" y la tarjeta se va.
- **Con ✕:** no vuelve en ese teléfono y queda en Ajustes.

**Decisión:** ☑ de acuerdo (founder, 2026-09-16)

### E1 · El estado del teléfono se lee de la cuenta
**Qué se ve (en el código).** El renglón "En el teléfono" de Ajustes se enciende con la marca de la cuenta (`avisos_push`), no con el alta de ese teléfono ([AvisosPerfil](../../src/app/perfil/AvisosPerfil.tsx)). Puede decir "Activados en este teléfono" sin que lo esté. El primer toque lo apaga (no hay alta que quitar) y hasta el segundo lo da de alta. La barra de Seguir ("Te avisamos … en el teléfono de sus eventos") y la tarjeta de Novedades ("En el teléfono aún no · Activar") leen la misma marca. Y como la marca es de la cuenta, apagar en un teléfono apaga los avisos de todos los demás.
**Por qué duele.** Evidencia: la interfaz afirma lo que no puede probar en ese teléfono.
**Propuesta.** Cada teléfono dice su verdad: el renglón, la barra de Seguir y Novedades leen el permiso y el alta de este teléfono. La cuenta guarda el consentimiento con fecha, como hoy, y los avisos salen mientras haya al menos un teléfono dado de alta.
**Decisión:** ☑ de acuerdo (founder, 2026-09-16)

### E2 · La pregunta se abre sola
**Qué se ve (en el código).** Si se toca Voy o Seguir y se cierra la pregunta sin contestar, la hoja se abre sola cada vez que se vuelve a esa ficha ([Asistencia](../../src/app/eventos/[id]/Asistencia.tsx), [Seguir](../../src/components/Seguir.tsx)). Además, la barra de Seguir dice "Te avisamos de sus eventos" sin que haya un canal elegido.
**Por qué duele.** El gesto de la persona gana: una hoja que emerge sin un toque roba el foco. La regla de `ui/Hoja` dice "nunca sola".
**Propuesta.** Cerrar sin contestar es "ahora no": la pregunta vuelve en el siguiente Voy o Seguir, no al abrir la ficha. La única excepción es volver de Entrar tras tocar Voy sin sesión: ahí la pregunta continúa el mismo gesto. Sin canal elegido, la barra dice "Sigues" y nada más.
**Decisión:** ☑ de acuerdo (founder, 2026-09-16)

### A2 · "Solo con la app instalada" dentro de la app instalada
**Qué se ve.** En Ajustes de la app instalada, el renglón apagado dice "Solo con la app instalada en inicio".
**Propuesta.** El renglón dice el estado de este teléfono: "Apagados en este teléfono", "Activados en este teléfono", "Bloqueados: se activan en Ajustes del iPhone" o, en Safari del iPhone, "Instala la app para recibirlos". Detalle en la decisión 5 de [17](17-instalar-avisos-flujo-y-estados.md).
**Decisión:** ☑ de acuerdo (founder, 2026-09-16)

### C1 · En Android y en Chrome nunca ofrecemos instalar
**Qué se ve (en el código).** En Android y en Chrome de escritorio, "En el teléfono" pide el permiso y funciona sin instalar. La decisión 10 firmada decía "En Android, botón Instalar", pero no se construyó: el código no escucha la señal con la que Chrome avisa que la página se puede instalar.
**Por qué duele.** Quien ya dijo "sí, avísame" es quien más gana con tener la app a un toque, y no se lo ofrecemos. En Android los avisos no dependen de instalar: instalar sirve para tener el icono y abrirla sin la barra del navegador.
**Propuesta.** Tras "✓ Te avisamos en este teléfono", una línea "Tenla en tu inicio · Instalar" que abre el diálogo del propio navegador: un toque, sin tienda. Y en Ajustes › Somos Nosotros, "Instalar la app". Ya instalada, desaparece de los dos sitios.
**Decisión:** ☑ de acuerdo (founder, 2026-09-16)

### K1 · "Calendario" parece que muestra un calendario
**Qué se ve.** En la ficha de evento, entre Compartir y Cómo llegar, el botón lleva un calendario y la palabra "Calendario". Compartir y Cómo llegar dicen lo que hacen; Calendario nombra una cosa. Además, la app usa ese mismo icono para decir "cuándo" (en Lugares y en las fichas).
**Por qué duele.** Observación del founder: "hoy pareciera que mostrará un calendario". Quien no quiere alertas no descubre que ahí tiene su recordatorio. Evidencia: el botón no dice lo que hace.
**Propuesta.**
- **Texto:** "A mi calendario". Dice el destino, cabe en una línea y deja claro que el evento se va con la persona.
- **Icono:** el de agregar al calendario, un calendario con un + en la esquina (la convención de Apple y de Google). Se distingue del calendario con + al centro de "Publicar evento".
- Al tocarlo pasa lo mismo que hoy: la hoja del calendario del teléfono, ya con la alerta de K2.

**Decisión:** ☑ de acuerdo (founder, 2026-09-16)

### K2 · El evento entra al calendario sin alerta
**Qué se ve (medido).** Tocar "Calendario" abre la hoja del calendario del iPhone, en Safari y en la app instalada: título, lugar, "jueves 17 de septiembre, 19:00 a 21:00", la liga y **"Alerta: Ninguna"**. El archivo que entregamos ([calendario/route.ts](../../src/app/eventos/[id]/calendario/route.ts)) no trae recordatorio.
**Por qué duele.** Quien agrega el evento siente "ya no se me olvida", y el calendario no le va a avisar. Es la promesa del botón y hoy no se cumple.
**Propuesta.** El evento lleva **una alerta 1 hora antes**. La persona la ve en la fila Alerta y la puede cambiar ahí mismo antes de agregar. En Android, **por comprobar en un teléfono**: Chrome descarga el archivo y no siempre lo abre el calendario. Si pasa, en Android el botón abre el evento en Google Calendar.
**Decisión:** ☑ de acuerdo, 1 hora antes (founder, 2026-09-16)

### K3 · "No, gracias" termina sin la alternativa
**Qué se ve.** Tras "No, gracias", la tarjeta dice "Sin avisos. Si cambias de idea, está en Mi perfil." y nada más.
**Por qué duele.** Peak-End: el final negativo también se diseña. Quien no quiere alertas es justo quien más gana con su propio calendario, y en ese momento no se lo ofrecemos.
**Propuesta.** "Sin avisos." y, debajo, la misma línea de C1 con otro contenido: "A mi calendario · Con una alerta 1 hora antes" y [Agregar], que abre la hoja del calendario. Un toque, sin insistir: si no lo toca, la tarjeta se cierra como hoy.
**Decisión:** ☑ de acuerdo (founder, 2026-09-16)

### V1 · Quien visita sin cuenta
**Qué se ve.** La agenda sin nada que ofrezca instalar. Chrome de escritorio pone su propio icono en la barra de direcciones (el que viste) y Chrome de Android lo ofrece en su menú. En Safari del iPhone no hay nada.
**Decidido por el founder (2026-09-16, noche): A.** Nada arriba para quien visita. Instalar aparece donde ya hay un motivo: tras activar los avisos (C1) y en Ajustes. Quien no tiene cuenta usa el icono del propio navegador. La opción B (la tarjeta arriba desde la tercera visita) queda descartada.

### T1 · La app de la tienda
**Qué pasó.** La misma noche el founder había decidido la app de iPhone en la tienda (bitácora [057](../bitacora/2026/09/057-app-de-iphone-en-la-tienda.md)), y eso cambiaba el camino del iPhone.
**Decidido por el founder (2026-09-16, noche): la app de la tienda se detiene.** "No veo necesario hacer app nativa aún. No suma valor todavía y me entretiene", y en fase de pruebas cada actualización costaría el doble. El iPhone se queda con la app de navegador instalada en el inicio. Se arregla ya lo roto (I1, I2, I3 y A1), sin aviso de la App Store.

### A3, E3, C2 y C3 · Textos e icono
- **A3.** "No se activaron los avisos." no dice por qué ni qué hacer. Propuesta: "No pudimos darte de alta en este teléfono" con "Intentar de nuevo". Si quedaron bloqueados: "Se activan en Ajustes del iPhone › Notificaciones › Somos Nosotros" (en Chrome, en la configuración del sitio). En los dos casos, el correo como salida.
- **E3.** "Si cambias de idea, está en Mi perfil" y "Sin avisos; se cambia en Mi perfil": desde el 2026-09-15 vive en Ajustes. Propuesta: "Se cambia en Ajustes".
- **C2.** En la computadora el canal se llama "En el teléfono". Propuesta: el sistema sabe dónde está y dice "En esta computadora".
- **C3.** El aviso usa el icono entero de la app como icono chico ([sw.js](../../public/sw.js)). Android pinta ese icono chico solo con su silueta, así que un icono con fondo sale como un cuadro (leído en el código; por ver en un Android). Propuesta: una silueta SN transparente, generada con `docs/diseno/logotipo/iconos.py`.

**Decisión:** ☑ de acuerdo (founder, 2026-09-16)

## Visto al pasar (fuera de esta pieza)

- En el simulador, la ✕ de cerrar de las hojas (texto "✕" en `ui/Hoja`) se dibujó como un cuadro con "?". Otras siete piezas escriben la ✕ igual; `ui/Cerrar` ya usa el icono. El founder la lanzó como tarea aparte la misma noche.
