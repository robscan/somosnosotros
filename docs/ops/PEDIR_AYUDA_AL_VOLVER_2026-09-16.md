# Pedir ayuda al volver de un evento — análisis y propuesta

**Fecha:** 2026-09-16 (noche) · **Estado:** POSTERGADO · **Bitácora:** [058](../bitacora/2026/09/058-pedir-ayuda-al-volver.md)

**Decisión del founder (2026-09-16, noche):** «Se mantiene sin cambios, se posterga hasta hacer entrevistas y confirmar necesidad». Este documento queda como base para cuando las entrevistas confirmen o descarten la necesidad.

**Lo que pidió el founder.** Primero: que una persona que se siente en peligro lance una alerta con su ubicación en tiempo real y que otros usuarios la ayuden. Después lo precisó con una escena: «fui a un evento de noche y regreso a casa caminando. Me siento en peligro y uso la aplicación para que las personas sepan dónde estoy; si hay alguien cerca o en su casa, podría asomarse o salir a acompañarme». Sin ubicación en tiempo real: solo un aviso con la ubicación de ese momento, «por eso podríamos comenzar».

## Veredicto

La escena es real y le toca a la plataforma: en 2025, el 21.6 % de la gente dejó de ir al cine o al teatro por miedo. Pero avisar a vecinos no puede ser el primer paso. Hoy no le llegaría a nadie, de noche casi no suena, y en México sacar gente a la calle ya costó vidas.

**Propuesta:** el mismo toque, con tu ubicación de ese momento, avisa primero a **tu gente** y te deja a la vista el 911 y los lugares con gente. **Los que se asoman** crece por zonas y se enciende solo donde alcance.

## Tu escena, pieza por pieza

| Lo que pides | ¿Se puede? | Qué propongo |
|---|---|---|
| Un toque cuando te sientes en peligro | Sí | Igual. Se mantiene apretado un segundo para que no salga sin querer |
| Tu ubicación de ese momento, sin seguimiento | Sí, confiable con la app abierta | Igual; se borra a las 24 h |
| Que le llegue a gente cerca | Solo a quien marcó antes dónde vive. Nadie sabe dónde está la gente en ese momento | Primero a tu gente, esté donde esté. Después, a vecinos inscritos, por zonas |
| Que suene de noche | En la web no: respeta el silencio y el modo Dormir. En la app de iPhone de la tienda ([OL-032](OPEN_LOOPS.md)) puede pasar Dormir, si la persona lo permite | Construirlo cuando exista la app de iPhone |
| Que se asomen | Sí: es la ayuda más segura que se le puede pedir a quien no te conoce | Es lo único que se les pide a los vecinos |
| Que salgan a acompañarte o vengan a verte | Con desconocidos, arriesga a quien sale, y un aviso falso sirve para asaltar | Tu gente sí puede ir; a los vecinos no se les pide |

## Sección 1 · Por qué le toca a la plataforma

- **El miedo aleja de la cultura.** En 2025, por temor a un delito, el 44.7 % dejó de salir de noche, el 30.2 % dejó de salir a caminar y el 21.6 % dejó de ir al cine o al teatro. Solo el 35.4 % de las mujeres se siente segura caminando sola de noche cerca de su casa; entre los hombres, el 52.4 % ([ENVIPE 2026, INEGI](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/envipe/ENVIPE2026_RR.pdf), gráficas 20 y 26).
- **En la capital potosina, el 62.5 % considera insegura su ciudad** (segundo trimestre de 2026; el promedio nacional es 59.8 %) ([ENSU, INEGI](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/ensu/ENSU2026_07_RR.pdf)).
- **La plataforma invita a salir de noche y a conocer gente.** Además, ya muestra sin cuenta quién va a qué evento y a qué hora; la salida es el Perfil reservado. Cualquier función de seguridad convive con eso.
- **Hoy:** 3 perfiles en producción, 2 con avisos en el teléfono (consulta a la base, 2026-09-16).

## Sección 2 · Cómo lo resuelven otros

| Quién recibe el aviso | Ejemplos | Qué aprendieron |
|---|---|---|
| Desconocidos cercanos, filtrados antes por el 911 | PulsePoint, GoodSAM (paro cardíaco) | Aun con central y voluntarios con RCP (reanimación cardiopulmonar), pocos llegan. En Londres, de 4,196 paros, se avisó a voluntarios en el 6.7 % y uno aceptó en el 1.3 % (radio de 300 m, hasta 3 voluntarios) ([2021](https://academic.oup.com/ehjacc/article/11/1/20/6431742)). En EE. UU., el 57 % de los avisos no eran paro ([2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10375779/)) |
| Desconocidas cercanas, verificadas y formadas | SafeUP (red de mujeres "guardianas", Israel) | Verificación por video, curso de ~15 min y videollamada antes de ir. Tiene un equipo propio las 24 h para cuando no hay nadie cerca; tenía ~10 mil guardianas en 39 países ([2022](https://www.afar.com/magazine/the-safeup-app-helps-keep-women-travelers-safe)). El 16-sep-2026 su sitio no respondía |
| Vecinos, con central de por medio | SOSAFE (Chile), alarmas vecinales en México | CDMX puso 14 mil puntos de alerta vecinal (2019): de 220 alertas al día, 6 eran válidas, y se canceló en 2020 ([TV Azteca, 2026](https://www.tvazteca.com/aztecanoticias/alarma-vecinal-descompuesta-afecta-a-vecinos-tlahuac-cdmx)). Botones de auxilio del C5 de CDMX: 60 % de mal uso ([El Universal, 2026](https://www.eluniversal.com.mx/metropoli/mal-uso-de-botones-de-auxilio-alcanza-60-c5-piden-reforzar-cultura-civica-en-cdmx/)). SLP, "En Son de Paz" (2020): 2 mil alarmas personales conectadas al C3 municipal, sin evaluación publicada ([La Silla Rota](https://lasillarota.com/estados/2020/9/30/ponen-en-marcha-en-slp-programa-integral-de-seguridad-vecinal-214685.html)). SOSAFE hoy cobra por una central que verifica por video antes de avisar ([sitio](https://www.sosafeapp.com/)) |
| Usuarios cercanos, sin filtro | Vigilante → Citizen (EE. UU.) | Apple retiró Vigilante en unas 48 h por invitar a intervenir en delitos ([2016](https://techcrunch.com/2016/11/02/controversial-crime-reporting-app-vigilante-banned-from-app-store/)). Ya como Citizen, en 2021 difundió la foto de un inocente con recompensa ([Vice](https://www.vice.com/en/article/lapd-emails-citizen-palisades-wildfire-manhunt/)). Hoy pide no acercarse |
| Un círculo elegido | Circle of 6, bSafe, Hollie Guard, Life360 | Funciona desde la primera persona, pero depende de que contesten. Life360 vendió la ubicación de sus usuarios ([The Markup, 2021](https://themarkup.org/privacy/2021/12/06/the-popular-family-safety-app-life360-is-selling-precise-location-data-on-its-tens-of-millions-of-user)) |
| Una central o el 911 | Noonlight; en SLP, la app municipal "Botón de Ayuda" | La app municipal ya existe para la capital: manda tu geolocalización al centro de control y este despacha unidades ([El Universal SLP, 2024](https://sanluis.eluniversal.com.mx/estado/asi-puedes-descargar-el-boton-de-ayuda-para-situaciones-de-peligro-en-slp/)) |
| El propio teléfono | SOS de iPhone y Android, Check In (iOS 17), WhatsApp | El SOS de iPhone (cinco pulsaciones del botón lateral) llama al 911 y luego manda tu ubicación a tus contactos de emergencia, sin abrir ninguna app ([Apple](https://support.apple.com/guide/personal-safety/emergency-call-text-iphone-apple-watch-ips4f0cd709b/web)) |
| Lugares con personal formado | Luisa ist hier (Alemania, incluye organizaciones culturales), Punto Violeta (España; también en el Corona Capital 2025), Ask for Angela (Reino Unido) | Sin formación falla: la BBC probó 25 locales de Londres y en 13 no respondieron bien ([2024](https://www.gazette-news.co.uk/news/national/24802849.jess-phillips-ask-angela-scheme-found-wanting-undercover-tests/)). Luisa exige ~45 min de formación a todo el personal ([sitio](https://www.luisa-ist-hier.de/)). El Punto Violeta del Corona Capital lo pusieron Casa Gaviota y Fundación OCESA ([2025](https://lacaderadeeva.com/actualidad/corona-capital-2025-que-hacer-si-sufres-acoso-ve-al-punto-violeta/15674)) |
| Testigos formados | Right To Be (las "5D": distraer, delegar, documentar, demorar, dirigir) | La formación aumenta la intervención, pero el efecto ya no es significativo a los 6 meses ([revisión Campbell, 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC8356505/)) |

**La presencia sí ayuda cuando ya hay gente.** En 219 conflictos grabados por cámaras en Lancaster, Ámsterdam y Ciudad del Cabo, alguien intervino en el 91 %, casi siempre para calmar. Más testigos presentes, más probable la intervención ([Philpot et al., 2019](https://www.sciencedaily.com/releases/2019/06/190626125049.htm)). Ojo: son testigos que ya estaban ahí, no gente convocada por un aviso.

## Sección 3 · Qué permite el teléfono

| Capacidad | Web instalada (hoy) | App de iPhone de la tienda (OL-032, por construir) |
|---|---|---|
| Tomar tu ubicación al tocar | Sí. En iPhone, Safari puede volver a pedir permiso en cada sesión ([guía, 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)) | Sí, con permiso "al usar la app" dado una vez (ya hace falta para Cercanos y Estoy aquí) |
| Seguir tu ubicación con la pantalla apagada | No ([W3C](https://www.w3.org/TR/geolocation/), [WebKit](https://bugs.webkit.org/show_bug.cgi?id=193946)) | Solo con permiso de ubicación "siempre", fuera de lo decidido |
| Saber quién está cerca en ese momento | No | No, salvo rastreando a todos |
| Aviso que pase Dormir o No molestar | Solo si la persona permite la app en ese modo ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)) | Sí, como aviso urgente ("Time Sensitive"), si la persona lo permite ([Apple](https://support.apple.com/guide/iphone/allow-or-silence-notifications-for-a-focus-iph21d43af5b/ios)) |
| Aviso que suene con el teléfono en silencio | No | Solo las alertas críticas, que requieren permiso especial de Apple ([Apple](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.usernotifications.critical-alerts)) |
| Entrega garantizada | No ([Apple](https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns)) | No |
| Llamar al 911 | Abre la llamada; la persona confirma | Igual |

- **Reglas de Apple** ([App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)):
  - **5.1.5:** las funciones de ubicación "shouldn't be used to provide emergency services". Hay que presentarlo como "avisar a tu gente", nunca como servicio de emergencia, y no meterlo en el primer envío de la app.
  - **1.4.5:** una app no debe animar a nadie a arriesgarse físicamente. Pedirle a un desconocido que salga puede chocar con eso (lectura mía).
- **Lo técnico es sencillo.** Un aviso de un solo disparo no necesita temporizador: sale al tocar. El borrado a las 24 h cabe en el cron diario que ya existe. Hay que agregar urgencia alta y caducidad corta al envío, que hoy caduca a las 6 h (`src/lib/push.ts`).

## Sección 4 · San Luis Potosí

- **Canales oficiales:**
  - 911, que atiende el C5i2 estatal.
  - La app municipal "Botón de Ayuda" (Sección 2).
  - 089, denuncia anónima.
  - Puerta Violeta, del DIF municipal: Uresti 555, Centro Histórico, abierta las 24 h, con atención psicológica, jurídica y médica y refugio de 72 h ([El Universal SLP, 2024](https://sanluis.eluniversal.com.mx/metropoli/que-es-y-como-funciona-la-puerta-violeta-en-san-luis-potosi/)).
  - Centro de Justicia para las Mujeres ([Semujeres](https://semujeres-publico.slp.gob.mx/violentometro/contacts.php)).
  - Línea de la Vida: 800 911 2000 ([CONASAMA](https://www.gob.mx/conasama/articulos/linea-de-la-vida-800-911-2000)).
  - Los teléfonos de Puerta Violeta y del Código Rosa hay que confirmarlos llamando antes de publicarlos.
- **Violencia de vecinos:**
  - El 6-nov-2025, en la colonia San Luis de la capital, vecinos mataron a golpes a un hombre que intentaba robar una moto ([El Universal SLP](https://sanluis.eluniversal.com.mx/seguridad/muere-presunto-ladron-tras-linchamiento-de-vecinos-en-la-colonia-san-luis-de-la-capital/)).
  - En Puebla, grupos vecinales cuelgan lonas con "Si te agarramos, te linchamos" ([Imagen Poblana, 2025](https://imagenpoblana.com/25/08/03/vecinos-vigilantes--la-respuesta-ciudadana-ante-la-inseguridad)).
  - La CNDH contó 561 personas linchadas entre 2015 y 2018, 121 de ellas muertas ([Expansión, 2019](https://politica.expansion.mx/mexico/2019/05/23/crisis-de-seguridad-e-imparticion-de-justicia-desborda-linchamientos-cndh)).
  - En Acatlán, Puebla, un rumor por WhatsApp terminó con dos hombres quemados vivos ([Proceso, 2018](https://www.proceso.com.mx/reportajes/2018/9/19/en-acatlan-linchamiento-difundido-en-tiempo-real-212316.html)).
- **Riesgo para quien ayuda:**
  - En Chimalhuacán, un hombre murió baleado al intentar frenar el asalto a sus vecinas ([Heraldo, jul-2026](https://heraldodemexico.com.mx/nacional/2026/7/17/video-defiende-sus-vecinos-de-un-violento-asalto-muere-el-caso-que-exige-justicia-851339.html)).
  - En CDMX, una joven tocó un timbre pidiendo ayuda mientras sus cómplices esperaban en motos; la recomendación oficial es no abrir y llamar al 911 ([Cultura Colectiva, 2022](https://culturacolectiva.com/noticias/mexico/nuevo-modus-operandi-criminales-mexico-tocan-puerta-piden-ayuda/)).
- **Ley:**
  - **Datos personales.** La [Ley Federal de Protección de Datos Personales](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf) (2025) pide, para datos cuyo mal uso traiga "un riesgo grave", consentimiento expreso y por escrito con autenticación (art. 8), guardarlos el menor tiempo posible (art. 12) y avisar de filtraciones (art. 19). Con datos sensibles, las multas pueden duplicarse. Lo prudente es tratar así la ubicación de alguien en peligro y la cuadra de quien se ofrece a ayudar.
  - **Código Penal de SLP** ([al 30-jul-2026](https://congresosanluis.gob.mx/sites/default/files/unpload/legislacion/codigos/2026/08/Codigo_Penal_Estado%20(al%2030%20de%20julio%20de%20%202026).pdf)):
    - No hay un deber general de ayudar: la omisión de auxilio del art. 155 es para quien lesionó con un vehículo.
    - Desde mayo de 2026, el art. 28 presume legítima defensa a favor de quien defiende a una mujer de una agresión que percibe con sus sentidos.
  - Las reglas de uso deben decir que el aviso no sustituye al 911 y que nadie está obligado a acudir. Conviene que un abogado revise esa redacción.

## Sección 5 · Por qué los vecinos no pueden ser el primer paso

1. **No habría nadie del otro lado.**
   - **Supuesto:** cada persona inscrita tiene 1 posibilidad en 5 de ver el aviso a tiempo y asomarse de noche. Es un supuesto optimista: en GoodSAM aceptó menos de 1 de cada 5 avisos, y eso con hasta 3 voluntarios cada vez.
   - **A cuántos hay que avisar:** a 8 personas a menos de 200 m, para que 4 de cada 5 avisos tengan al menos a alguien. Con 1 en 10, hacen falta 16.
   - **Cuántas personas inscritas son:** la zona metropolitana tiene 1,243,980 habitantes y 107.4 hab/ha urbanas, unos 116 km² ([Metrópolis de México 2020](https://www.gob.mx/cms/uploads/attachment/file/864736/METRO_POLIS_DE_ME_XICO_2020_18102023_Parte19.pdf)). Eso da **entre 7 mil y 15 mil personas inscritas** para cubrir la ciudad, y **entre 300 y 650** solo para 5 km² del centro y sus barrios.
   - **Hoy hay 3 perfiles.**
2. **De noche casi no suena.**
   - En la web, el aviso respeta el silencio y el modo Dormir.
   - En la app de iPhone puede pasar Dormir, pero no suena con el teléfono en silencio.
   - En cualquier caso, la entrega no está garantizada (Sección 3).
3. **Las falsas alarmas lo apagan.**
   - 6 válidas de cada 220 en las alertas vecinales de CDMX, y 60 % de mal uso en los botones del C5.
   - Cada falsa alarma despierta a los vecinos; tras unas cuantas, nadie se asoma.
4. **Se puede usar en contra.**
   - Un aviso falso puede sacar a alguien de su casa: es el caso del timbre en CDMX.
   - Con nombre y foto, el aviso le dice a quien se inscriba con malas intenciones quién camina sola y dónde.
   - Con avisos repetidos se podría adivinar dónde viven quienes ayudan.
5. **Puede terminar en violencia.** Convocar vecinos contra un "sospechoso" es como empiezan los linchamientos (Sección 4). Quien sale a enfrentar se arriesga a morir.
6. **Choca con reglas vigentes.**
   - [DEFINICION.md](../DEFINICION.md) dice que la ubicación "sirve para ordenar por cercanía, nada más".
   - El aviso de privacidad dice que la ubicación "no se guarda".
   - Las guías 1.4.5 y 5.1.5 de Apple (Sección 3).

## Sección 6 · Propuesta

### 6.1 Principios
- **Se pide la ayuda más segura que funciona:** que te llame tu gente, que se asomen los vecinos, acercarte a donde hay gente y el 911.
- **La pantalla solo afirma lo que puede probar:** a cuántos les llegó, quién lo vio y cuándo. Nunca "ya viene alguien".
- **Tu ubicación sale solo cuando tocas,** una vez y a quien tú elegiste. Se borra a las 24 h.
- **Nadie describe a nadie** y no hay conversación entre quienes reciben el aviso.

### 6.2 Paso 1 · Avisa a tu gente
Funciona desde la primera persona que lo prepara.

**Preparación, una sola vez:**
- **Tu gente:** eliges de 1 a 3 personas, de la plataforma o de tu casa. Cada una acepta con un enlace que les mandas por WhatsApp.
- **Canal de cada quien:** quien tenga la app de iPhone o los avisos activados lo recibe como aviso urgente; quien no, por correo. La pantalla dice quién recibe por correo, que es más lento.
- **Permiso de ubicación:** se pide aquí, con su motivo, no en el momento del peligro.

**Dónde está el botón:** en la ficha del evento del día, con el renglón "De regreso". Abre una pantalla que mantiene el teléfono encendido y deja el botón al alcance del pulgar.

**En el momento:**
1. **Mantienes apretado "Me siento en peligro"** un segundo; el botón se llena y soltarlo antes lo cancela. Se toma tu ubicación y sale el aviso.
2. **Tu gente recibe:** «Ana se siente en peligro · 22:14 · Zaragoza y Reforma · Llámale ya». Al abrirlo ve el punto en el mapa, "Llamar a Ana" y "Llamar al 911 con esta ubicación".
3. **Tu pantalla muestra:**
   - «Avisamos a Luis y a tu mamá · Luis lo vio a las 22:15».
   - "Llamar al 911".
   - "Con gente ahora": eventos en curso a menos de ~800 m, con distancia a pie y hora de cierre. Si no hay, lo dice.
4. **"Ya estoy bien"** cierra el aviso, y tu gente recibe «Ana ya está bien».

**Si nadie lo ve en 2 minutos:** «Nadie lo ha visto todavía. Llama al 911». El mal final también se diseña.

**Toques:** 1 para avisar, 1 para llamar al 911 y 1 para cerrar.

### 6.3 Paso 2 · Los que se asoman
Llega cuando haya gente inscrita suficiente.

- **Quién:**
  - Personas con sesión que se ofrecen.
  - Marcan su cuadra: se guarda redondeada y nunca se muestra.
  - Eligen su horario, de 19:00 a 24:00 si no dicen otro.
  - Leen una guía de 5 minutos.
  - Permiten el aviso urgente.
- **Qué se les pide:** asomarse y encender la luz de afuera. Si ven una agresión, llamar al 911 y dar la dirección. No salir a enfrentar ni perseguir.
- **Qué reciben:** «Alguien que vuelve de un evento se siente en peligro en Zaragoza y Reforma (22:14)», sin nombre ni foto, con los botones "Me asomé" y "Llamé al 911".
- **Qué ve quien pidió ayuda:** «Le llegó a 11 personas cerca · 3 se asomaron». Nunca quiénes son ni dónde viven.
- **Dónde se enciende:** por zona, donde haya al menos 8 personas inscritas a menos de 200 m en ese horario (Sección 5). Antes de salir del evento, "De regreso" dice si en tu camino hay quien se asoma; si no, no se ofrece.
- **Cuidados:**
  - Solo pueden pedir ayuda cuentas con historia (por ejemplo, más de 30 días y al menos un "Voy").
  - Máximo 2 avisos por noche.
  - El aviso caduca a los 30 minutos y se borra a las 24 h.
  - El admin puede suspender cuentas.
  - No hay conversación entre vecinos.
- **Reclutamiento:** empieza en los eventos y centros del Centro Histórico y sus barrios, donde vive y camina la gente de la cultura.

### 6.4 Lo que se puede hacer ya, sin esta función
- **Talleres de intervención de testigos (las 5D) como eventos de la agenda.** Se repiten cada semestre, porque el efecto se pierde a los 6 meses.
- **"Si te sientes en peligro" en Reglas y en Ajustes.** Incluye:
  - el SOS del teléfono (en iPhone, cinco pulsaciones del botón lateral);
  - 911 y la app municipal "Botón de Ayuda";
  - Puerta Violeta (24 h), 089 y Línea de la Vida.
  
  Con los teléfonos confirmados por el founder.
- **Bloquear y reportar personas.** Ya está en la cola de [OL-032](OPEN_LOOPS.md) porque Apple lo exige; conviene sumar el motivo "me hizo sentir insegura/o".
- **Salida en grupo.** Que el lugar la anuncie en la descripción del evento, sin programar nada.

### 6.5 Descartado
- **Ubicación en vivo** (ya la descartaste): la web no puede seguirla con la pantalla apagada, y es el dato más delicado.
- **Botón flotante en toda la app:** multiplica las falsas alarmas.
- **Pedir a desconocidos que salgan o vengan, o un botón "Voy para allá" para vecinos:** riesgo para quien sale, uso para asaltar y guía 1.4.5 de Apple.
- **Nombre, foto o descripción de un "sospechoso":** así se convocan turbas (Citizen, Acatlán).
- **Mapa de zonas peligrosas:** señala colonias enteras y refuerza la idea de que el peligro es un desconocido en la calle ([Bivens y Hasinoff, 2018](https://www.tandfonline.com/doi/abs/10.1080/1369118X.2017.1309444), leído en resumen). Las apps de este tipo bajan más el miedo que el riesgo ([Maxwell et al., 2020](https://pubmed.ncbi.nlm.nih.gov/30854941/)).
- **Avisar solos al 911:** no hay forma pública de hacerlo, y la app municipal ya lo hace con registro.

## Sección 7 · Qué cambia

**Reglas**
- [DEFINICION.md](../DEFINICION.md) y el aviso de privacidad (`src/app/privacidad/page.tsx`) necesitan una excepción explícita: «cuando tú pides ayuda, tu ubicación de ese momento se manda a tu gente y se borra a las 24 h».
- Consentimiento expreso al preparar la función (art. 8).
- Las reglas de uso dicen que no sustituye al 911 y que nadie está obligado.

**Datos**
- **Paso 1:**
  - `gente`: quién, contacto, estado y fechas.
  - `alertas`: quién, punto, precisión, creada y cerrada; se borra a las 24 h.
  - `alertas_vistas`.
- **Paso 2:** `asomadores`, con quién, punto redondeado y horario. Las respuestas se cuentan, sin guardar quién respondió.

**Envío**
- `enviarPush` con urgencia alta y caducidad de 15–30 min.
- Aviso urgente por APNs (el servicio de avisos de Apple) en la app de iPhone.
- Correo por Resend.
- Sin proveedor nuevo. WhatsApp para quien no tiene la app es opcional: trámite con Meta y ~US$0.01 por mensaje ([Meta](https://developers.facebook.com/docs/whatsapp/pricing); precio exacto no verificado).

**Apple:** no va en el primer envío de la app, y se presenta como "avisar a tu gente" (guía 5.1.5).

**Operación**
- El admin ve cuántos avisos hay, no dónde.
- Suspende cuentas y atiende reportes.

**Tamaño:** dos PR para el paso 1 (tu gente; aviso y pantalla) y dos para el paso 2.

## Sección 8 · Tu decisión

1. **¿Entra en lo que hace la plataforma "volver bien de los eventos"?** Cambia la regla de ubicación de DEFINICION y el aviso de privacidad.
2. **¿Por dónde empezamos?** Recomendado: "Avisa a tu gente". La otra opción es "Los que se asoman" en una zona piloto del Centro.
3. **¿Cuándo?** Recomendado: diseñarlo ahora y construirlo después de la app de iPhone (OL-032), porque el aviso urgente solo existe ahí.
4. **¿Por dónde le llega a quien no tiene la app?** Por correo, que ya existe, o por WhatsApp, con trámite y costo.
5. **¿Lo pasamos por council antes de diseñar?** [CLAUDE.md](../../CLAUDE.md) lo pide para decisiones grandes de producto.

## Fuentes principales

- **Miedo y percepción:** [ENVIPE 2026](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/envipe/ENVIPE2026_RR.pdf) · [ENSU 2T-2026](https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/ensu/ENSU2026_07_RR.pdf).
- **Redes que avisan a otros:**
  - [GoodSAM, European Heart Journal: Acute Cardiovascular Care 2021](https://academic.oup.com/ehjacc/article/11/1/20/6431742)
  - [PulsePoint](https://www.pulsepoint.org/pulsepoint-respond)
  - [SafeUP (AFAR)](https://www.afar.com/magazine/the-safeup-app-helps-keep-women-travelers-safe)
  - [Vigilante (TechCrunch)](https://techcrunch.com/2016/11/02/controversial-crime-reporting-app-vigilante-banned-from-app-store/)
  - [Nextdoor y perfilamiento (Fortune)](https://fortune.com/2016/08/30/nextdoor-racist-posts-empathy/)
  - [Circle of 6](https://shapingyouth.org/circle-of-6-campus-safety-app-what-it-is-and-what-it-isnt/)
- **Acompañamiento y lugares:**
  - [Check In de Apple](https://support.apple.com/guide/personal-safety/use-check-in-for-messages-ips56b5bc469/web)
  - [Safety check de Google](https://support.google.com/pixelphone/answer/7055029?hl=en)
  - [Punto Violeta (Ministerio de Igualdad)](https://violenciagenero.igualdad.gob.es/informacion-3/puntovioleta/)
  - [Right To Be](https://righttobe.org/guides/bystander-intervention-training/)
  - [Eisenhut et al. 2020](https://pubmed.ncbi.nlm.nih.gov/32399255/)
  - [Freed et al. 2018](https://dl.acm.org/doi/10.1145/3173574.3174241)
- **Técnica:**
  - [Web push en iOS (WebKit)](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
  - [Web push en navegadores (Apple)](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers)
  - [Cron de Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing)
  - [Cron de Supabase](https://supabase.com/docs/guides/cron/quickstart)
  - [SMS de Twilio a México](https://www.twilio.com/en-us/sms/pricing/mx)
- **Vecinos y presencia:**
  - [Philpot et al. 2019](https://www.sciencedaily.com/releases/2019/06/190626125049.htm)
  - [Resumen de los autores](https://archive.discoversociety.org/2019/06/05/the-helpful-bystander-current-evidence-from-cctv-captured-public-conflicts/)
  - [Vecino Vigilante, Corregidora](https://www.eluniversalqueretaro.mx/metropoli/presentan-programa-vecino-vigilante/)
- **Ley:** [LFPDPPP](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf) · [Código Penal de SLP](https://congresosanluis.gob.mx/sites/default/files/unpload/legislacion/codigos/2026/08/Codigo_Penal_Estado%20(al%2030%20de%20julio%20de%20%202026).pdf) · [Guías de revisión de Apple](https://developer.apple.com/app-store/review/guidelines/).

Verificado a mano el 2026-09-16:
- ENVIPE 2026: 21.6 %, 44.7 %, 30.2 %, 35.4 % y 52.4 %.
- GoodSAM: 4,196 paros, 6.7 % y 1.3 %.
- Botones del C5: 60 %.
- Alertas vecinales de CDMX: 6 de 220.
- Linchamiento en la colonia San Luis.
- App "Botón de Ayuda".
- Guías 1.4.5 y 5.1.5 de Apple.

El resto viene de investigación con fuentes citadas, sin segunda lectura.
