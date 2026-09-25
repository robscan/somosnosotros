import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { LIMITES } from "./perfil";
import { rutaSegura } from "./rutas";

/**
 * Entrar con Apple y con Google, sin llaves secretas (bitácora 069). Apple y Google devuelven a la persona a
 * somosnosotros.org con un POST que trae su identidad firmada (id_token) y Supabase la verifica con signInWithIdToken:
 * no hace falta la llave de Apple que caduca cada 6 meses ni el secreto de Google, y la pantalla de Google dice
 * "somosnosotros.org" en vez de la dirección de Supabase. Aquí va la lógica pura; las rutas viven en src/app/auth/[proveedor].
 */

export type Proveedor = "apple" | "google";

export const NOMBRE_PROVEEDOR: Record<Proveedor, string> = { apple: "Apple", google: "Google" };

/**
 * Identificadores de Somos Nosotros en cada proveedor. No son secretos: viajan a la vista en la dirección que abre
 * Apple o Google. Mientras uno sea null su botón no sale. Cómo se crean: docs/ops/ENTRAR_CON_APPLE_Y_GOOGLE.md.
 */
export const CLIENTES: Record<Proveedor, string | null> = {
  apple: "org.somosnosotros.web", // Services ID de Apple
  google: "540749799366-fje7u1fcbkcjaj0cuhfvfo83oerti2ai.apps.googleusercontent.com", // cliente web "somosnosotros.org" del proyecto de Google Cloud somos-nosotros-508902
};

export function esProveedor(valor: unknown): valor is Proveedor {
  return valor === "apple" || valor === "google";
}

/** Los dominios cuya dirección de vuelta está registrada con Apple y con Google (docs/ops/ENTRAR_CON_APPLE_Y_GOOGLE.md). */
export const DOMINIOS_REGISTRADOS = ["somosnosotros.org", "www.somosnosotros.org"];

/**
 * Qué botones salen y en qué orden. Primero el de la casa: Apple en iPhone, iPad y Mac; Google en lo demás. Nada sale
 * donde la vuelta no está registrada (las vistas previas de Vercel), salvo en la computadora de quien programa. Google
 * no deja entrar desde el navegador metido en otra app (Instagram, Facebook, vistas web de Android o de iOS sin Safari):
 * ahí su botón prometería y fallaría, así que no sale. La app instalada en el iPhone sí dice "Safari" (medido en iOS 26.3).
 */
export function botonesProveedor(agente: string, encendidos: Record<Proveedor, boolean>, dominio: string, clientes = CLIENTES): Proveedor[] {
  const sinPuerto = dominio.replace(/:\d+$/, "");
  if (!DOMINIOS_REGISTRADOS.includes(sinPuerto) && sinPuerto !== "localhost" && sinPuerto !== "127.0.0.1") return [];
  const deApple = /iPhone|iPad|iPod|Macintosh/.test(agente);
  const vistaWeb = /Instagram|FBAN|FBAV|FB_IAB|; wv\)/.test(agente) || (/iPhone|iPad|iPod/.test(agente) && !/Safari\//.test(agente));
  const orden: Proveedor[] = deApple ? ["apple", "google"] : ["google", "apple"];
  return orden.filter((p) => encendidos[p] && clientes[p] !== null && !(p === "google" && vistaWeb));
}

/** Lo que Supabase dice encendido en /auth/v1/settings ({ external: { apple: true, … } }). Si no se entiende, nada. */
export function leerEncendidos(ajustes: unknown): Record<Proveedor, boolean> {
  const externos = (ajustes as { external?: Record<string, unknown> } | null)?.external;
  return { apple: externos?.apple === true, google: externos?.google === true };
}

/** La cookie que ata la vuelta a este navegador: el estado frena entradas ajenas y el nonce, identidades robadas. */
export const COOKIE_ENTRAR = "sn_entrar";
export const VIGENCIA_SEGUNDOS = 600;

/**
 * `enApp`: el toque salió del envoltorio de iPhone (apps/ios, OL-194): `EntrarSistemaPlugin.swift` interceptó la
 * ida a esta ruta (`/auth/apple` o `/auth/google`, con `?app=1`) y la abrió en una `ASWebAuthenticationSession`
 * (la ficha del sistema, no el WKWebView de la app) porque Google bloquea su entrada dentro de cualquier vista web
 * embebida. Va en el intento porque la URL de vuelta que registramos con Apple y con Google no puede cambiar; con
 * ella, al terminar, `/auth/[proveedor]/fin` no manda a la persona directo a `siguiente` (ver `urlAppTrasEntrar`).
 */
export type Intento = { p: Proveedor; estado: string; nonce: string; siguiente: string; desde: number; enApp: boolean };

export function nuevoIntento(p: Proveedor, siguiente: string | null, ahora = Date.now(), enApp = false): Intento {
  const azar = () => randomBytes(24).toString("base64url");
  return { p, estado: azar(), nonce: azar(), siguiente: rutaSegura(siguiente, "/perfil"), desde: ahora, enApp };
}

export function codificarIntento(intento: Intento): string {
  return Buffer.from(JSON.stringify(intento)).toString("base64url");
}

/** El intento guardado, o null si no hay, no se entiende o pasaron más de 10 minutos. */
export function leerIntento(valor: string | undefined, ahora = Date.now()): Intento | null {
  if (!valor) return null;
  try {
    const i = JSON.parse(Buffer.from(valor, "base64url").toString("utf8")) as Partial<Intento>;
    if (!esProveedor(i.p) || typeof i.estado !== "string" || typeof i.nonce !== "string" || typeof i.desde !== "number") return null;
    if (ahora - i.desde > VIGENCIA_SEGUNDOS * 1000 || i.desde > ahora + 60_000) return null;
    return { p: i.p, estado: i.estado, nonce: i.nonce, siguiente: rutaSegura(i.siguiente, "/perfil"), desde: i.desde, enApp: i.enApp === true };
  } catch {
    return null;
  }
}

export function sha256hex(texto: string): string {
  return createHash("sha256").update(texto).digest("hex");
}

/** A dónde vuelve la persona: la dirección exacta que se registró con Apple y con Google. */
export function direccionDeVuelta(origen: string, p: Proveedor): string {
  return `${origen}/auth/${p}`;
}

/**
 * La dirección que abre Apple o Google. Los dos devuelven la identidad por POST (form_post) y nada viaja en la dirección
 * de vuelta. Al proveedor va el nonce en SHA-256 y a Supabase el original: así los compara Supabase Auth.
 */
export function urlProveedor(p: Proveedor, o: { cliente: string; vuelta: string; estado: string; nonce: string }): string {
  const comun = { client_id: o.cliente, redirect_uri: o.vuelta, response_mode: "form_post", state: o.estado, nonce: sha256hex(o.nonce) };
  // Apple pide "code id_token" para dar nombre y correo; el code no se canjea (eso exigiría la llave que evitamos).
  const propio = p === "apple" ? { response_type: "code id_token", scope: "name email" } : { response_type: "id_token", scope: "openid email profile" };
  const base = p === "apple" ? "https://appleid.apple.com/auth/authorize" : "https://accounts.google.com/o/oauth2/v2/auth";
  return `${base}?${new URLSearchParams({ ...comun, ...propio }).toString().replace(/\+/g, "%20")}`;
}

/** Lo único que pasa del POST del proveedor al relevo y de ahí al final: ningún campo ajeno. */
export const CAMPOS_VUELTA = ["id_token", "state", "user", "error"] as const;
export type CamposVuelta = Partial<Record<(typeof CAMPOS_VUELTA)[number], string>>;

export function leerCampos(datos: { get(nombre: string): unknown }): CamposVuelta {
  const campos: CamposVuelta = {};
  for (const k of CAMPOS_VUELTA) {
    const v = datos.get(k);
    if (typeof v === "string" && v) campos[k] = v;
  }
  return campos;
}

function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * El relevo. Apple y Google vuelven con un POST desde su dominio, y el navegador no manda en él las cookies
 * SameSite=Lax (ni la del intento ni la sesión). Esta página repite el POST desde somosnosotros.org, y ese sí las lleva.
 * Medido en la app instalada del simulador (iOS 26.3): sin cookies en el primer POST, con ellas en el relevo, y la app
 * sigue en pantalla completa con su mismo almacenamiento.
 */
export function paginaRelevo(accion: string, campos: CamposVuelta): string {
  const ocultos = CAMPOS_VUELTA.filter((k) => campos[k])
    .map((k) => `<input type="hidden" name="${k}" value="${escapar(campos[k] as string)}">`)
    .join("");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Entrando…</title><style>html,body{height:100%;margin:0;background:#fff;color:#5c5c5c;font:17px -apple-system,BlinkMacSystemFont,system-ui,sans-serif}body{display:grid;place-items:center}</style></head><body><form method="post" action="${escapar(accion)}">${ocultos}<noscript><button type="submit">Continuar</button></noscript></form><p>Entrando…</p><script>document.forms[0].submit()</script></body></html>`;
}

export type Desenlace = { tipo: "entrar"; token: string; nonce: string } | { tipo: "cancelado" } | { tipo: "fallo"; motivo: string };

/** Qué hacer con la vuelta, ya en el relevo con la cookie a la mano. Cancelar no es un error: se vuelve a Entrar sin aviso. */
export function decidirVuelta(p: Proveedor, intento: Intento | null, campos: CamposVuelta): Desenlace {
  if (campos.error && /cancel|access_denied/i.test(campos.error)) return { tipo: "cancelado" };
  if (!intento || intento.p !== p) return { tipo: "fallo", motivo: "sin intento o vencido" };
  const esperado = Buffer.from(intento.estado);
  const recibido = Buffer.from(campos.state ?? "");
  if (esperado.length !== recibido.length || !timingSafeEqual(esperado, recibido)) return { tipo: "fallo", motivo: "estado distinto" };
  if (campos.error) return { tipo: "fallo", motivo: campos.error };
  if (!campos.id_token) return { tipo: "fallo", motivo: "sin id_token" };
  return { tipo: "entrar", token: campos.id_token, nonce: intento.nonce };
}

/** Entrar con el destino intacto y, si falló, con qué proveedor ("No pudimos entrar con Apple"). */
export function urlEntrar(siguiente: string, fallo?: Proveedor): string {
  const q = new URLSearchParams({ siguiente });
  if (fallo) q.set("error", fallo);
  return `/entrar?${q}`;
}

/**
 * A dónde manda `/auth/[proveedor]/fin` al envoltorio de iPhone cuando entrar salió bien y el intento venía de la
 * app (OL-194). La sesión que Supabase acaba de poner queda en las cookies de la `ASWebAuthenticationSession` (las
 * comparte con Safari), no en el WKWebView de la app: en vez de mandar ahí, se manda un enlace de un solo uso (el
 * `token_hash` de un enlace mágico, generado sin enviarlo por correo) por el esquema propio "somosnosotros://".
 * `ASWebAuthenticationSession` entrega esa dirección directo a `EntrarSistemaPlugin.swift` sin volver a mostrar
 * nada en pantalla (coincide con `callbackURLScheme`), que carga `/auth/app-vuelta?token_hash=…&siguiente=…` ya en
 * el WKWebView de la app: ahí `verifyOtp` deja la sesión en el almacenamiento propio de la app. Nunca lleva un
 * access_token ni un refresh_token, solo el token de un enlace mágico de un solo uso, con la misma vigencia.
 */
export function urlAppTrasEntrar(siguiente: string, tokenHash: string): string {
  return `somosnosotros://auth?${new URLSearchParams({ token_hash: tokenHash, siguiente }).toString()}`;
}

/** Cuando no se pudo generar el enlace de un solo uso: `EntrarSistemaPlugin.swift` lo entiende como fallo y deja la pantalla de Entrar tal cual. */
export const URL_APP_ERROR = "somosnosotros://auth?error=1";

/** El nombre que Apple manda solo la primera vez, en el campo "user": {"name":{"firstName":"Rosa","lastName":"Pérez"}}. */
export function nombreDeApple(user: string | undefined): string | null {
  if (!user) return null;
  try {
    const n = (JSON.parse(user) as { name?: { firstName?: unknown; lastName?: unknown } }).name;
    const partes = [n?.firstName, n?.lastName].filter((x): x is string => typeof x === "string" && x.trim() !== "");
    const nombre = partes.map((x) => x.trim()).join(" ");
    return nombre ? nombre.slice(0, LIMITES.nombre) : null;
  } catch {
    return null;
  }
}

/** El nombre que pone la base al crear la cuenta cuando nadie dio uno: lo de antes de la @ (función crear_perfil). */
export function nombrePorDefecto(correo: string | null | undefined): string {
  return (correo ?? "").split("@")[0].slice(0, 60);
}
