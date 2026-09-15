# 026 · Entrar con motivo y código (2026-09-14)

Rama `entrar`. Primer PR de las pantallas restantes ([11-restantes-flujo-y-estados.md](../../../rediseno/11-restantes-flujo-y-estados.md), decisiones 1 a 4). El founder puso `{{ .Token }}` en la plantilla Magic Link de Supabase antes de empezar y dejó Google para después.

## Qué cambia

- **Motivo en el título** (`lib/entrar.ts`, `motivoEntrar`): "Entra para decir que vas", "Entra para marcar que te interesa", "Entra para seguir a Casa 1100" (busca el nombre del lugar o artista), "Entra para decir que es tu nombre", "Entra para publicar", "Entra para registrar un lugar / un artista", o "Entrar". El regreso de la barra vuelve al origen sin la intención colgada (`?accion=`).
- **Código en vez de enlace**: el correo trae código y enlace; la pantalla pide el código en un solo campo numérico con `autocomplete="one-time-code"` (el iPhone lo ofrece sobre el teclado), entra sola al último dígito, y con error dice "Ese código no es, o ya caducó. Pide otro." Debajo, "¿No llega? Reenviar" (con cuenta atrás de 30 s) y "Usar otro correo". El enlace del correo sigue vivo por `/auth/callback`.
- **Largo del código**: Supabase manda **8 dígitos** en este proyecto, no 6 como decía el diseño; la pantalla lo lee de `NEXT_PUBLIC_LARGO_CODIGO` (8 por defecto; 6–10). Documentos 10, 11 y 25 corregidos.
- **Google solo si `NEXT_PUBLIC_GOOGLE_ACTIVO=1`** (hoy no existe: el botón desaparece).
- Foco automático en el correo; "Mandarme el código"; error específico cuando el correo no se puede entregar ("No pudimos mandarlo a ese correo. Revísalo o usa otro.").

## Verificación

- Pruebas de `motivoEntrar`, `tituloSeguir`, `enmascararCorreo` y `limpiarCodigo` (3 nuevas; 77 en total). Lint, typecheck y build en verde.
- En pantalla (390×844, servidor de desarrollo): "Entra para publicar" con Volver; "Entra para seguir a Casa 1100" con el nombre real; foco en el campo; al mandar a un correo de prueba (`example.com`) Supabase devolvió "Error sending confirmation email" y la pantalla lo dijo en línea.
- **El código de 8 dígitos se probó contra Supabase con el cliente de servicio, no en pantalla**: se generó un código con `generateLink`, `verifyOtp` con `type: "email"` abrió sesión, y un código falso fue rechazado. La fase del código en pantalla no se pudo recorrer porque ningún correo de prueba es entregable; **el recorrido completo lo hace el founder con su correo real en la URL de vista previa del PR** (ese es el gate).
- Revisión de maquetación: la fase del código es un formulario plano (aviso, etiqueta, campo, error, nota, botón, dos enlaces); sin envoltorios.

## Qué sigue

PR 2 (ficha de persona con Editar y Avisos), PR 3 (alta de lugar), PR 4 (ajustes del alta de evento), cuando el founder firme el documento 10.
