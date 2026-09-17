# 058 · Pedir ayuda al volver de un evento: análisis y propuesta

**Fecha:** 2026-09-16 (noche) · **Base:** dos pedidos del founder.
1. Que la app sirva para decir "estoy en peligro", con ubicación en tiempo real y un aviso a otros usuarios para que ayuden.
2. Precisión: regresando a pie de un evento, un aviso con la ubicación de ese momento para que quien esté cerca o en su casa se asome o salga a acompañar.

## Qué se hizo
- **Estado de la app** (solo lectura):
  - `src/lib/push.ts`: avisos web con caducidad de 6 h.
  - `public/sw.js`.
  - `src/lib/ubicacion.ts`: la ubicación se pide una vez y no se guarda.
  - Cron diario de Vercel.
  - Motivos de reporte de perfiles sin acoso ni bloqueo.
  - "Quién va" público.
- **Conteo en producción** (solo lectura): 3 perfiles, 2 personas con avisos en el teléfono y 1 persona que ha dicho "Voy".
- **Cinco investigaciones en paralelo:**
  - redes que avisan a otras personas;
  - acompañamiento y lugares seguros;
  - México y San Luis Potosí (canales oficiales, linchamientos, ley);
  - límites técnicos de la web instalada;
  - alarmas vecinales, emergencias fingidas, testigos y densidad de la ciudad.
- **Verificado a mano:**
  - ENVIPE 2026 (21.6 % dejó de ir al cine o al teatro por miedo; 35.4 % de las mujeres se siente segura caminando sola de noche).
  - GoodSAM en Londres (se avisó en el 6.7 % de 4,196 paros; un voluntario aceptó en el 1.3 %).
  - Botones del C5 de CDMX con 60 % de mal uso.
  - Alertas vecinales de CDMX: 6 válidas de 220 al día.
  - Linchamiento en la colonia San Luis (6-nov-2025).
  - App municipal "Botón de Ayuda".
  - Guías 1.4.5 y 5.1.5 de Apple.
  - Avisos urgentes ("Time Sensitive") de iOS.
- **Informe:** [PEDIR_AYUDA_AL_VOLVER_2026-09-16.md](../../../ops/PEDIR_AYUDA_AL_VOLVER_2026-09-16.md).

## Recomendación entregada
**Paso 1 · "Avisa a tu gente":**
- Mantener apretado "Me siento en peligro".
- Tu ubicación de ese momento les llega a 1–3 personas que eligiste y aceptaron, con «Llámale ya».
- En tu pantalla: quién lo vio, el 911 y los eventos en curso cerca.

**Paso 2 · "Los que se asoman":**
- Vecinos inscritos con su cuadra redondeada y su horario, a los que solo se les pide asomarse, encender la luz y llamar al 911.
- Sin nombre ni foto.
- Se enciende por zona cuando haya al menos 8 inscritos a menos de 200 m.

**Descartado:**
- ubicación en vivo;
- botón flotante;
- pedir a desconocidos que salgan;
- describir sospechosos;
- mapa de zonas peligrosas.

## Hallazgos que cambian el diseño
- **La app de iPhone decidida esta noche** ([OL-032](../../../ops/OPEN_LOOPS.md), bitácora [057](057-app-de-iphone-en-la-tienda.md)) permite avisos urgentes que pasan el modo Dormir. La web no puede. Conviene construir esto después de la app.
- **La guía 5.1.5 de Apple** dice que la ubicación no debe usarse para dar "servicios de emergencia". Se presenta como "avisar a tu gente" y no entra en el primer envío.
- **Chocan dos textos vigentes:** la regla de ubicación de [DEFINICION.md](../../../DEFINICION.md) ("sirve para ordenar por cercanía, nada más") y el aviso de privacidad ("no se guarda").
- **Para que el aviso a vecinos tenga a alguien del otro lado** harían falta entre 7 mil y 15 mil inscritos en la ciudad, o entre 300 y 650 en 5 km² del centro.
- **Bloquear y reportar personas ya está en la cola de OL-032.** Conviene sumar el motivo "me hizo sentir insegura/o".

## Decisión del founder
«Se mantiene sin cambios, se posterga hasta hacer entrevistas y confirmar necesidad.»
- Nada se construye, nada cambia en DEFINICION ni en el aviso de privacidad, y nada pasa a la cola de OL-032.
- OL-033 queda en "Después", con lo que conviene confirmar en las entrevistas.

Sin cambios de código, sin migraciones, sin commit.
