import { describe, expect, it } from "vitest";
import {
  botonesProveedor,
  codificarIntento,
  decidirVuelta,
  leerCampos,
  leerEncendidos,
  leerIntento,
  nombreDeApple,
  nombrePorDefecto,
  nuevoIntento,
  paginaRelevo,
  sha256hex,
  URL_APP_ERROR,
  urlAppTrasEntrar,
  urlEntrar,
  urlProveedor,
} from "./entrarCon";

const IPHONE_SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1";
const IPHONE_INSTAGRAM = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 312.0.0.32.112";
const IPHONE_OTRA_APP = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const ANDROID_CHROME = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36";
const ANDROID_VISTA_WEB = "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0 Mobile Safari/537.36";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const LOS_DOS = { apple: true, google: true };

describe("botonesProveedor", () => {
  const CON_LOS_DOS = { apple: "org.somosnosotros.web", google: "123.apps.googleusercontent.com" };
  const SN = "somosnosotros.org";
  it("primero el de la casa: Apple en iPhone y Mac, Google en lo demás", () => {
    expect(botonesProveedor(IPHONE_SAFARI, LOS_DOS, SN, CON_LOS_DOS)).toEqual(["apple", "google"]);
    expect(botonesProveedor(MAC, LOS_DOS, SN, CON_LOS_DOS)).toEqual(["apple", "google"]);
    expect(botonesProveedor(ANDROID_CHROME, LOS_DOS, SN, CON_LOS_DOS)).toEqual(["google", "apple"]);
    expect(botonesProveedor(WINDOWS, LOS_DOS, SN, CON_LOS_DOS)).toEqual(["google", "apple"]);
  });
  it("solo lo que Supabase tiene encendido y tiene identificador", () => {
    expect(botonesProveedor(IPHONE_SAFARI, { apple: false, google: false }, SN, CON_LOS_DOS)).toEqual([]);
    expect(botonesProveedor(WINDOWS, { apple: true, google: false }, SN, CON_LOS_DOS)).toEqual(["apple"]);
    expect(botonesProveedor(WINDOWS, LOS_DOS, SN, { apple: "org.somosnosotros.web", google: null })).toEqual(["apple"]);
  });
  it("sin Google donde Google no deja entrar (navegador de otra app)", () => {
    for (const agente of [IPHONE_INSTAGRAM, IPHONE_OTRA_APP, ANDROID_VISTA_WEB]) expect(botonesProveedor(agente, LOS_DOS, SN, CON_LOS_DOS)).toEqual(["apple"]);
  });
  it("nada donde la vuelta no está registrada (vistas previas), sí en www y en la computadora de quien programa", () => {
    expect(botonesProveedor(IPHONE_SAFARI, LOS_DOS, "somosnosotros-git-rama-robscan.vercel.app", CON_LOS_DOS)).toEqual([]);
    expect(botonesProveedor(IPHONE_SAFARI, LOS_DOS, "somosnosotros.org.malo.com", CON_LOS_DOS)).toEqual([]);
    expect(botonesProveedor(IPHONE_SAFARI, LOS_DOS, "www.somosnosotros.org", CON_LOS_DOS)).toHaveLength(2);
    expect(botonesProveedor(IPHONE_SAFARI, LOS_DOS, "localhost:3107", CON_LOS_DOS)).toHaveLength(2);
  });
});

describe("leerEncendidos", () => {
  it("lee /auth/v1/settings y, si no lo entiende, apaga todo", () => {
    expect(leerEncendidos({ external: { apple: true, google: false, email: true } })).toEqual({ apple: true, google: false });
    expect(leerEncendidos(null)).toEqual({ apple: false, google: false });
    expect(leerEncendidos({ external: { apple: "true" } })).toEqual({ apple: false, google: false });
  });
});

describe("intento en la cookie", () => {
  it("va y vuelve igual, con el destino limpio", () => {
    const i = nuevoIntento("apple", "/eventos/abc?accion=voy", 1000);
    expect(leerIntento(codificarIntento(i), 2000)).toEqual(i);
    expect(nuevoIntento("google", "https://malo.com").siguiente).toBe("/perfil");
    expect(i.estado).not.toBe(i.nonce);
    expect(i.estado.length).toBeGreaterThanOrEqual(32);
  });
  it("caduca a los 10 minutos y no se fía de lo que no entiende", () => {
    const i = nuevoIntento("apple", "/", 0);
    expect(leerIntento(codificarIntento(i), 600_000)).not.toBeNull();
    expect(leerIntento(codificarIntento(i), 600_001)).toBeNull();
    expect(leerIntento("no-es-json")).toBeNull();
    expect(leerIntento(undefined)).toBeNull();
    expect(leerIntento(Buffer.from(JSON.stringify({ ...i, p: "facebook" })).toString("base64url"), 1)).toBeNull();
    expect(leerIntento(Buffer.from(JSON.stringify({ ...i, siguiente: "//malo.com" })).toString("base64url"), 1)?.siguiente).toBe("/perfil");
  });
  it("enApp viaja igual que el resto del intento, y por defecto es false (OL-194)", () => {
    expect(nuevoIntento("apple", "/perfil", 0).enApp).toBe(false);
    const i = nuevoIntento("apple", "/perfil", 0, true);
    expect(i.enApp).toBe(true);
    expect(leerIntento(codificarIntento(i), 1)).toEqual(i);
    // un intento viejo, guardado antes de que existiera el campo, no se lee como si viniera de la app
    expect(leerIntento(Buffer.from(JSON.stringify({ p: "apple", estado: "e", nonce: "n", siguiente: "/perfil", desde: 0 })).toString("base64url"), 1)?.enApp).toBe(false);
  });
});

describe("urlAppTrasEntrar (OL-194, corrección del gestor: la vuelta al envoltorio de iPhone por un enlace de un solo uso)", () => {
  it("arma el esquema propio con el token_hash y siguiente, codificados", () => {
    expect(urlAppTrasEntrar("/eventos/abc?accion=voy", "el-token")).toBe("somosnosotros://auth?token_hash=el-token&siguiente=%2Feventos%2Fabc%3Faccion%3Dvoy");
  });
  it("URL_APP_ERROR es la señal fija de fallo, sin datos de nadie", () => {
    expect(URL_APP_ERROR).toBe("somosnosotros://auth?error=1");
  });
});

describe("urlProveedor", () => {
  const o = { cliente: "org.somosnosotros.web", vuelta: "https://somosnosotros.org/auth/apple", estado: "e1", nonce: "n1" };
  it("Apple: code id_token por POST, con nombre y correo, y el nonce en SHA-256", () => {
    const url = new URL(urlProveedor("apple", o));
    expect(url.origin + url.pathname).toBe("https://appleid.apple.com/auth/authorize");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "org.somosnosotros.web",
      redirect_uri: "https://somosnosotros.org/auth/apple",
      response_mode: "form_post",
      response_type: "code id_token",
      scope: "name email",
      state: "e1",
      nonce: sha256hex("n1"),
    });
    expect(urlProveedor("apple", o)).toContain("response_type=code%20id_token"); // espacios como %20, no "+"
  });
  it("Google: solo id_token por POST, con perfil", () => {
    const url = new URL(urlProveedor("google", { ...o, cliente: "123.apps.googleusercontent.com", vuelta: "https://somosnosotros.org/auth/google" }));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("response_type")).toBe("id_token");
    expect(url.searchParams.get("response_mode")).toBe("form_post");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("nonce")).toBe(sha256hex("n1"));
  });
  it("sha256hex en hexadecimal, como lo compara Supabase Auth", () => {
    expect(sha256hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("relevo y desenlace", () => {
  it("el relevo solo lleva los campos conocidos y escapados", () => {
    const html = paginaRelevo("/auth/apple/fin", leerCampos(new URLSearchParams({ id_token: 'a"><script>x</script>', state: "s", otro: "no", user: '{"name":{}}' })));
    expect(html).toContain('action="/auth/apple/fin"');
    expect(html).toContain('name="id_token" value="a&quot;&gt;&lt;script&gt;x&lt;/script&gt;"');
    expect(html).toContain('name="user" value="{&quot;name&quot;:{}}"');
    expect(html).not.toContain("otro");
    expect(html.match(/<script>/g)).toHaveLength(1); // solo el que envía el formulario
  });
  it("entra solo con el mismo proveedor, el mismo estado y un id_token", () => {
    const i = nuevoIntento("apple", "/eventos/abc?accion=voy");
    expect(decidirVuelta("apple", i, { state: i.estado, id_token: "tok" })).toEqual({ tipo: "entrar", token: "tok", nonce: i.nonce });
    expect(decidirVuelta("apple", i, { state: "otro", id_token: "tok" }).tipo).toBe("fallo");
    expect(decidirVuelta("google", i, { state: i.estado, id_token: "tok" }).tipo).toBe("fallo");
    expect(decidirVuelta("apple", null, { state: i.estado, id_token: "tok" }).tipo).toBe("fallo");
    expect(decidirVuelta("apple", i, { state: i.estado }).tipo).toBe("fallo");
    expect(decidirVuelta("apple", i, { state: i.estado, error: "invalid_request" }).tipo).toBe("fallo");
  });
  it("cancelar no es un error, ni en Apple ni en Google", () => {
    expect(decidirVuelta("apple", null, { error: "user_cancelled_authorize" })).toEqual({ tipo: "cancelado" });
    expect(decidirVuelta("google", null, { error: "access_denied" })).toEqual({ tipo: "cancelado" });
  });
  it("vuelve a Entrar con el destino y el proveedor que falló", () => {
    expect(urlEntrar("/eventos/abc?accion=voy")).toBe("/entrar?siguiente=%2Feventos%2Fabc%3Faccion%3Dvoy");
    expect(urlEntrar("/perfil", "google")).toBe("/entrar?siguiente=%2Fperfil&error=google");
  });
});

describe("nombre que manda Apple", () => {
  it("une nombre y apellido; sin datos, null", () => {
    expect(nombreDeApple('{"name":{"firstName":"Rosa","lastName":"Pérez"},"email":"x@privaterelay.appleid.com"}')).toBe("Rosa Pérez");
    expect(nombreDeApple('{"name":{"firstName":" Rosa ","lastName":""}}')).toBe("Rosa");
    expect(nombreDeApple('{"email":"x@y.com"}')).toBeNull();
    expect(nombreDeApple("{roto")).toBeNull();
    expect(nombreDeApple(undefined)).toBeNull();
    expect(nombreDeApple(JSON.stringify({ name: { firstName: "A".repeat(80) } }))?.length).toBe(60);
  });
  it("el nombre por defecto es el de la base: lo de antes de la @", () => {
    expect(nombrePorDefecto("qx8r7mbn2k@privaterelay.appleid.com")).toBe("qx8r7mbn2k");
    expect(nombrePorDefecto(null)).toBe("");
  });
});
