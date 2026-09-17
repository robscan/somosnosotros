# 069 · Entrar con Apple y Google (OL-043)

**Fecha:** 2026-09-16 (noche) · **Rama:** `entrar-apple-google`, en su propio árbol de trabajo · **Pedido del founder:** «Mi principal barrera para registro de usuarios sigue siendo envío de código a mail, se ha vuelto muy importante habilitar log in con apple y google, avancemos por favor». El acceso con Apple y Google ya estaba aceptado (OL-020 y OL-031).

## Qué se hizo

- **Entrar tiene tres caminos, con Apple y Google primero:**
  - "Continuar con Apple", "Continuar con Google" y "Continuar con tu correo";
  - al tocar el correo, el campo se abre en su lugar con el teclado arriba y "Mandarme el código" debajo;
  - el paso del código no cambia.
- **Primero el de la casa:**
  - en iPhone, iPad y Mac, Apple va primero y en negro;
  - en Android y computadoras, Google va primero y Apple usa su variante blanca con borde, para que el primero siga siendo el que más pesa;
  - el correo, con borde claro, va siempre al final.
- **Solo lo que funciona:**
  - un botón sale cuando Supabase tiene encendido su proveedor, existe su identificador y la dirección de vuelta está registrada;
  - en las vistas previas de Vercel no sale;
  - Google tampoco sale en el navegador de otra app (Instagram, Facebook, vistas web), donde Google no deja entrar;
  - con todo apagado, Entrar es la pantalla de correo de hoy.
- **Sin llaves que guardar ni renovar:**
  - Apple y Google devuelven a la persona a `somosnosotros.org/auth/apple` o `/auth/google` con su identidad firmada, en un POST (`form_post`);
  - Supabase la verifica con `signInWithIdToken`;
  - el camino habitual de Supabase pedía una llave de Apple que caduca cada 6 meses y hacía que Google dijera "ir a viesox….supabase.co" (su marca no se puede verificar con ese dominio);
  - así no hace falta ni la llave de Apple ni el secreto de Google.
- **La vuelta, paso a paso** (`src/app/auth/[proveedor]`):
  1. la ida guarda estado y nonce en una cookie de 10 minutos que solo lee el servidor;
  2. el POST del proveedor llega sin cookies, así que una página de relevo lo repite desde nuestro dominio;
  3. `/fin` compara el estado, entrega la identidad a Supabase y manda a la persona a donde iba (Voy, Seguir…).
  - Cancelar vuelve a Entrar sin aviso.
  - Un fallo dice "No pudimos entrar con Apple. Intenta otra vez o usa tu correo." y deja la causa en los registros (`entrar con apple: …`).
- **Nombre de Apple:**
  - Apple no pone el nombre en la identidad: lo manda aparte y solo la primera vez;
  - se guarda en la ficha si la ficha sigue con el nombre que puso la base (lo de antes de la @), así nunca pisa uno elegido;
  - Google trae nombre y foto, que ya tomaba la base al crear la cuenta.
- **Logos oficiales** (`ui/LogosEntrar`): el trazo de Apple sale de su propio botón web (`appleid.auth.js`) y la G, del botón de Google (`gsi/client`); copiados tal cual, sin rehacerlos.
  - Colores y proporciones de sus guías: Apple negro o blanco, con el título a ~43 % del alto; Google blanco con borde `#747775` y texto `#1f1f1f`.
- **Se fue** el Google anterior (`signInWithOAuth` tras `NEXT_PUBLIC_GOOGLE_ACTIVO`): ya no se usa esa variable.
- **Documentos:**
  - guía para el founder con los valores exactos: [ENTRAR_CON_APPLE_Y_GOOGLE.md](../../../ops/ENTRAR_CON_APPLE_Y_GOOGLE.md);
  - aviso de privacidad: qué dan Apple y Google, correo oculto y la cookie de 10 minutos;
  - PLAN (Fase 1, con las palabras del founder);
  - decisión 3 de [11](../../../rediseno/11-restantes-flujo-y-estados.md) sustituida.
- Sin migración y sin variables de entorno nuevas.

## Antes de construir: medido en el simulador (iOS 26.3, app instalada)

Un reporte de 2023 decía que, en la app instalada del iPhone, abrir appleid.apple.com mandaba a la App Store, y Google bloquea los navegadores "incrustados". Se probó antes de escribir código, con una página instalable propia en el simulador SE: el 15 Pro lo usaba otro chat.

- **Dentro de la app.** La salida a Apple, a Google y a otro dominio se abre dentro de la app, con una barra y ✕ arriba.
  - Apple mostró su página (con un identificador inventado, "invalid_client").
  - Google mostró su pantalla de entrar, sin bloqueo.
  - El agente de la app instalada dice "Safari", igual que Safari.
- **La vuelta.** Al volver con un POST, la app recupera la pantalla completa con el mismo almacenamiento.
- **Las cookies en el POST.** El POST de otro dominio llega **sin** nuestras cookies (SameSite=Lax). El relevo desde nuestra página **sí** las lleva. Por eso existe el relevo.
- **Google acepta `form_post`.** Su documento OpenID lo declara (`response_modes_supported: query, fragment, form_post`) y su servidor acepta `response_type=id_token&response_mode=form_post`.
- **Supabase Auth.** Su código (`token_oidc.go`) compara el nonce en SHA-256 hexadecimal, toma como audiencia la lista de Client IDs de cada proveedor y exige el proveedor encendido.

## Verificación

- `npm run lint` (0 errores; el único aviso es de `iconos-sn.mjs`, del PR #70), `npm run typecheck`, `npm test` (222 pruebas, 16 nuevas en `entrarCon.test.ts`) y `npm run build`: en verde.
- **Build de la rama en local**, con un intermediario de solo lectura hacia Supabase (bitácora 063). El intermediario responde qué proveedores están encendidos y bloquea toda escritura.
  - **Nada encendido:** la pantalla de correo de siempre, idéntica.
  - **Los dos encendidos,** con un identificador de Google de prueba que se quitó antes del commit:
    - a 390×844 con agente Android: Google, Apple blanco y el correo;
    - en el Safari del simulador (iPhone): Apple negro, Google y el correo.
  - **Código final (Google sin identificador):** Apple y el correo.
  - **"Continuar con tu correo":** el campo aparece con el foco.
  - **El aviso de error** sale en rojo bajo el título.
- **Rutas con peticiones reales:**
  - la ida: 303 a Apple con `code%20id_token`, `form_post` y el nonce en SHA-256; cookie `HttpOnly`, `Path=/auth`, 10 minutos;
  - el relevo solo reenvía `id_token`, `state` y `user`;
  - cancelar vuelve a Entrar sin error;
  - un estado ajeno o sin cookie vuelve con error;
  - un token falso llega hasta `POST /auth/v1/token` de Supabase, que el intermediario bloqueó: nada tocó producción;
  - un POST mal formado no rompe.
- **Por comprobar con el founder** (exige sus cuentas): la entrada completa con Face ID en Safari y en la app instalada, el nombre de Apple la primera vez, y Google con su identificador.

## Configuración hecha por encargo del founder («haz los pasos tu», 2026-09-16, noche)

Desde el navegador de la app, con la sesión del founder.

- **Apple (guía, A1 a A3), hecho:**
  - Services ID `org.somosnosotros.web`, "Somos Nosotros";
  - Sign In with Apple activado con App ID principal `org.somosnosotros.app`;
  - dominios `somosnosotros.org` y `www.somosnosotros.org`;
  - vueltas `https://somosnosotros.org/auth/apple` y `https://www.somosnosotros.org/auth/apple` (leídas de nuevo tras guardar).
- **Orígenes de correo registrados:** `send.somosnosotros.org` pasa SPF (✓). `somosnosotros.org` sale en rojo porque el dominio principal no tiene registro SPF.
  - No estorba: Apple mira el SPF del remitente técnico (`send.`, el Return-Path de Resend) y la firma DKIM del dominio del From (`somosnosotros.org`, que Resend firma).
  - Si algún correo a una dirección oculta rebota, el remedio es un TXT `v=spf1 include:amazonses.com ~all` en el dominio principal.
- **Durante la escritura, la página de Apple escribió en el portapapeles del founder:** avisado.
- **Google Cloud y Supabase, desde el Chrome del founder.** El navegador de la app no muestra la validación con huella de Google (llaves de acceso con Touch ID); el founder pidió seguir en su Chrome («sigue entonces con Chrome») y aceptó los textos legales («y si a aceptar textos»).
- **Google (guía, G1 a G6), hecho con la cuenta robscan@gmail.com:**
  - proyecto "Somos Nosotros" (`somos-nosotros-508902`, sin organización);
  - Google Auth Platform: app "Somos Nosotros", usuarios externos, contacto robscan@gmail.com, Política de Datos del Usuario aceptada;
  - marca: inicio `https://somosnosotros.org`, privacidad `/privacidad`, condiciones `/reglas`, dominio autorizado `somosnosotros.org`;
  - publicada: "En producción" (sin logotipo ni permisos sensibles, así que no pide verificación);
  - cliente web "somosnosotros.org" con vueltas `https://somosnosotros.org/auth/google` y `https://www.somosnosotros.org/auth/google`; su ID va en `CLIENTES.google`;
  - el secreto del cliente no se copió ni se guardó: no se usa.
  - Google avisa que un cliente nuevo puede tardar de 5 minutos a unas horas en funcionar.
- **Supabase (guía, S1 y S2), hecho:**
  - Apple encendido con Client IDs `org.somosnosotros.web`;
  - Google encendido con el Client ID del cliente web;
  - sin secretos y con "Skip nonce checks" apagado;
  - comprobado en `/auth/v1/settings`: `apple: true`, `google: true`.
  - Producción no cambia hasta mezclar la rama: el código de hoy no enseña esos botones.
  - Tropiezo: la tecla Escape cierra el panel de Supabase sin guardar; se repitió el alta de Google y se guardó con su botón.

## Pendiente del founder

1. ~~Crear en Apple el Services ID `org.somosnosotros.web` con sus dos direcciones de vuelta y registrar los orígenes de correo (guía, A).~~ Hecho (arriba).
2. ~~Iniciar sesión en Google Cloud y en Supabase para los pasos G y S.~~ Hecho desde su Chrome (arriba).
3. Decir si se hace push, se abre el PR y se mezcla. Con Supabase ya encendido, **al desplegar salen Apple y Google en Entrar**.
4. ~~Decidir si la foto de Google se queda como foto pública de la ficha.~~ **Decidido por el founder (2026-09-16, noche):** «de acuerdo en que se use la foto de perfil». Así estaba diseñado desde la Fase 1 y el aviso de privacidad ya lo dice.

## Notas

- **Cuentas.** Mismo correo, misma cuenta: Supabase une Apple o Google con la cuenta de correo existente.
  - Con "Ocultar mi correo" de Apple nace otra cuenta.
  - Con Google y robscan@gmail.com nacería una segunda cuenta de administrador (ese correo está en `admin_correos`).
- **Riesgo que queda: la vuelta en el iPhone real.** No se pudo medir en local con cookies `Secure` y un proveedor de verdad.
  - Si en el iPhone la vuelta llegara sin sesión, lo primero a revisar es el relevo.
  - Mientras tanto, el interruptor de Supabase apaga los botones sin desplegar.
- **www.** `www.somosnosotros.org` responde sin redirigir al dominio principal. Por eso se registran las dos direcciones de vuelta.
- **Limpieza.** La app de prueba del simulador SE se borró y el simulador quedó apagado como estaba. El servidor de prueba, el intermediario, `.env` y `.env.local` del árbol se quitaron.
