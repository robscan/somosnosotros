# 019 · Consentimiento de avisos por canal (2026-09-14)

Rama `avisos-consentimiento`. Cierra OL-008 en código. Motivo (decisión 10 de [02-inicio-flujo-y-estados.md](../../../rediseno/02-inicio-flujo-y-estados.md)): el correo de aviso salía a quien decía "Voy" sin pedirlo; un correo no pedido se marca como spam y con un dominio nuevo eso bloquea la entrega a todos. Ahora cada canal se pide una vez y se guarda con fecha.

## Qué quedó

- **Base (migración 0009, aplicada):** `perfiles.avisos_correo`, `avisos_push` (default falso), `avisos_correo_desde`, `avisos_push_desde`, `avisos_correo_motivo` (baja · rebote · queja) y `avisos_preguntado`. La columna vieja `avisos` queda obsoleta y se quita en una migración posterior.
- **Pregunta tras el primer "Voy"** (`ConsentimientoAvisos` en la ficha): "Vas a X. ¿Te recordamos ese día?" con Por correo · En el teléfono · No, gracias. Al elegir uno, confirmación con evidencia ("✓ Te escribimos a ro…@gmail.com ese día") y la oferta del otro canal una sola vez; cierre en una línea ("Te avisamos por correo y en el teléfono ese día. Se cambia en Mi perfil"). "No, gracias" se recuerda: `avisos_preguntado` evita volver a preguntar. En el teléfono: si es iPhone sin instalar, emerge `HojaInstalar` (dos toques con los glifos de iOS, "Agregar a pantalla de inicio" citado tal cual, el icono resultante y "Después: al abrirla, acepta los avisos"); en cualquier otro caso se pide el permiso y se suscribe el teléfono en el momento.
- **Envíos por canal** (`lib/avisos.ts`): push solo con `avisos_push`, correo solo con `avisos_correo`.
- **Baja de un toque sin sesión:** `/avisos/baja?t=<token>` firmado con HMAC de la llave de servicio (`lib/baja.ts`, con pruebas); GET desde el enlace del correo y POST para el botón de Gmail/Yahoo. Cada correo lleva las cabeceras `List-Unsubscribe` y `List-Unsubscribe-Post` y un pie que dice por qué llega y cómo darse de baja.
- **Webhook de Resend** (`/api/resend`): verifica la firma (Svix) con `RESEND_WEBHOOK_SECRET`; `email.bounced` y `email.complained` apagan el correo de esa persona con el motivo. Sin secreto responde 503.
- **Mi perfil:** la casilla pasa a ser el consentimiento de correo (con fecha al activar); activar o quitar los avisos del teléfono también escribe `avisos_push`.
- `lib/pushCliente.ts` concentra la lógica del navegador (estado, suscribir, desuscribir) que usan el perfil y la ficha.

## Verificación (servidor local, base real, usuario desechable borrado)

- Voy → aparece la pregunta; "Por correo" → `avisos_correo = true`, `avisos_preguntado = true` en la base y la tarjeta ofrece el teléfono; "No" → cierre en una línea ("Te avisamos por correo ese día. Se cambia en Mi perfil"). La página no se mueve de la ficha en ningún paso (comprobado 16 s después del Voy).
- `GET /avisos/baja?t=<token>` → 200 y `avisos_correo = false` con motivo `baja`; token alterado → 400.
- `POST /api/resend` sin secreto → 503.
- Lint, typecheck, 59 pruebas y build en verde.

## Corrección de maquetación señalada por el founder

En producción (PR #16) quedaba un hueco gris entre la barra superior y la cabecera de filtros: el margen inferior de la barra se colapsaba fuera de su caja blanca y dejaba ver el tono del contenido. Corregido en `Barra.module.css`: en pantallas raíz la barra no lleva margen (el aire solo aplica en pantallas interiores, antes del título) y la cabecera pegajosa arranca a 56 px, pegada. Medido en el DOM: hueco 0 px.

## Pendiente del founder

1. Resend → Webhooks → `https://somosnosotros.org/api/resend`, eventos `email.bounced` y `email.complained`; el secreto va en Vercel como `RESEND_WEBHOOK_SECRET`.
2. Nadie tiene consentimiento todavía (default apagado): activar el suyo en Mi perfil y en la app instalada antes de probar la Fase 5.
