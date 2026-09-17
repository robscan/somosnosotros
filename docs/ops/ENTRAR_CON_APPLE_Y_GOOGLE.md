# Entrar con Apple y Google — lo que se configura fuera del código

Bitácora [069](../bitacora/2026/09/069-entrar-con-apple-y-google.md) · OL-043.

## Cómo funciona, en corto

La persona toca "Continuar con Apple" (o Google), Apple le pregunta con Face ID y la devuelve a somosnosotros.org con su identidad firmada. Supabase comprueba esa firma y abre la sesión.

**No hay llaves ni secretos que guardar o renovar.** El camino habitual de Supabase pide una llave de Apple que caduca cada 6 meses y hace que Google diga "ir a viesox….supabase.co". Aquí Apple y Google vuelven a nuestro dominio, así que no hace falta nada de eso.

**El interruptor de Supabase manda.** Al encender Apple o Google en Supabase, su botón sale en Entrar en menos de un minuto; al apagarlo, desaparece. No hay que desplegar nada. Si algo falla en producción, se apaga ahí.

Mientras todo esté apagado, Entrar se ve igual que hoy.

## A. Apple (developer.apple.com, cuenta del equipo AT53235M7U)

El identificador de la app `org.somosnosotros.app` ya tiene "Sign In with Apple" desde el 2026-09-16. Falta un **Services ID**, que es el identificador de la web.

1. **Certificates, Identifiers & Profiles › Identifiers ›** botón **+** › **Services IDs** › Continue.
   - Description: `Somos Nosotros` (es el nombre que verá la persona en la hoja de Apple).
   - Identifier: `org.somosnosotros.web` (exacto: el código lo espera así).
   - Continue › Register.
2. Abre `org.somosnosotros.web`, marca **Sign in with Apple** y toca **Configure**:
   - Primary App ID: `org.somosnosotros.app`.
   - Domains and Subdomains: `somosnosotros.org,www.somosnosotros.org`
   - Return URLs: `https://somosnosotros.org/auth/apple,https://www.somosnosotros.org/auth/apple`
   - Next › Done › Continue › **Save**.
3. **Correos a quien oculta su dirección.** En **Services › Sign in with Apple for Email Communication › Configure**, en Email Sources toca **+** y pon `somosnosotros.org,send.somosnosotros.org` › Next › Register.
   - Sin esto, los recordatorios por correo no llegan a quien eligió "Ocultar mi correo".
   - `send.` es el remitente técnico de Resend y ya pasa la comprobación SPF (✓).
   - `somosnosotros.org` es el de la firma DKIM. Sale en rojo en SPF porque el dominio principal no tiene ese registro, y no estorba: Apple mira el SPF de `send.`.
   - Si algún correo a una dirección oculta rebota: TXT `v=spf1 include:amazonses.com ~all` en el dominio principal.

No se crea ninguna llave (Keys): no hace falta.

## G. Google (console.cloud.google.com, con tu cuenta de Google)

1. Crea un proyecto: **Somos Nosotros**.
2. **Google Auth Platform › Get started:**
   - App name: `Somos Nosotros`.
   - User support email: tu correo.
   - Audience: **External**.
   - Contact information: tu correo.
   - Acepta la política › Create.
3. **Branding:**
   - App home page: `https://somosnosotros.org`
   - Privacy policy: `https://somosnosotros.org/privacidad`
   - Terms of service: `https://somosnosotros.org/reglas`
   - Authorized domains: `somosnosotros.org`

   Save. El logo es opcional: si lo subes, Google revisa la marca unos días.
4. **Audience › Publish app** (queda "In production"). Si no, solo entran las cuentas de prueba.
5. **Clients › Create client:**
   - Application type: **Web application**.
   - Name: `somosnosotros.org`.
   - Authorized redirect URIs: `https://somosnosotros.org/auth/google` y `https://www.somosnosotros.org/auth/google`.

   Create.
6. Copia el **Client ID** (termina en `.apps.googleusercontent.com`) y pásamelo: va en una línea del código (`src/lib/entrarCon.ts`). No es secreto.
   - El **Client secret** no se usa: no lo pegues en ningún lado.

Sin verificar la marca, la pantalla de Google dice "ir a somosnosotros.org". Con la marca verificada, dice "Somos Nosotros" con el logo.

## S. Supabase (Authentication › Sign In / Providers)

1. **Apple** › Enable.
   - Client IDs: `org.somosnosotros.web`.
   - Secret Key (for OAuth): **vacío**.
   - Save.
2. **Google** › Enable.
   - Client IDs: el Client ID del paso G6.
   - Client Secret (for OAuth): **vacío**.
   - Skip nonce checks: **apagado**.
   - Save.

## Orden sugerido

1. Mezclar el PR. No cambia nada a la vista mientras Supabase siga apagado.
2. Apple (A1 a A3) y Supabase S1. Probar en el iPhone.
3. Google (G1 a G6). Yo pongo el Client ID en el código y despliego. Luego Supabase S2 y probar.

## Prueba en el iPhone

- **En Safari:** somosnosotros.org › un evento › Voy › Continuar con Apple › Face ID. Debes volver al evento con "Voy" puesto.
- **En la app instalada:** lo mismo desde el icono.
  - La hoja de Apple o Google se abre dentro de la app, con una barra arriba.
  - Al volver, la app sigue en pantalla completa.
- **Cancelar:** con la ✕ de la barra o con "Cancelar" de Apple vuelves a Entrar sin aviso de error.
- **Si falla:** sale "No pudimos entrar con Apple. Intenta otra vez o usa tu correo.". En los registros de Vercel queda una línea `entrar con apple: …` con la causa.

## Qué esperar con las cuentas

- **Mismo correo, misma cuenta.** Si el correo de la cuenta de Apple o de Google ya tiene cuenta aquí, se entra a esa misma cuenta: Supabase las une.
- **Correo oculto en Apple.** Se crea una cuenta nueva con una dirección `@privaterelay.appleid.com`, con el nombre que da Apple. Apple manda el nombre solo la primera vez: el código lo guarda en la ficha si la ficha sigue con el nombre que puso la base.
- **Tus cuentas.**
  - Tu cuenta de administrador es la de me.com: con Apple y "Compartir mi correo" entras a esa.
  - Con Google y robscan@gmail.com se crearía otra cuenta, también de administrador porque ese correo está en `admin_correos`. Para probar Google conviene otra cuenta de Google.
- **Foto.** Google trae la foto de perfil y queda como foto de la ficha, pública en "quién va", como ya decía el plan original. Se cambia en Mi perfil.

## Nota sobre www

`www.somosnosotros.org` sirve el sitio sin redirigir a `somosnosotros.org`. Por eso se registran las dos direcciones de vuelta.

Si en Vercel se hace que `www` redirija al dominio principal, basta con registrar una.
