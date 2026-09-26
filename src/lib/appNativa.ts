/**
 * La app de iPhone (Capacitor, `apps/ios/capacitor.config.ts`: `appendUserAgent: "SomosNosotrosApp"`) carga esta
 * misma web dentro de un WKWebView. Ese sello en el user-agent es la única marca que la app deja sin JavaScript de
 * por medio, así que sirve para poner la clase ".app-nativa" en <html> antes de que React pinte nada (guion
 * `beforeInteractive`, igual que `avisoInstalar.ts`): sin ella, el menú "Copy · Look Up · Translate" al mantener
 * pulsado un texto alcanzaría a destellar en el primer toque (OL-205, auditoría OL-202 problema 4).
 */
export const MARCA_USER_AGENT = "SomosNosotrosApp";

/** Si el user-agent trae el sello que añade Capacitor: solo pasa dentro de la app, nunca en Safari o Chrome. */
export function esAppNativa(userAgent: string): boolean {
  return userAgent.includes(MARCA_USER_AGENT);
}

export const GUION_APP_NATIVA = `if(navigator.userAgent.indexOf(${JSON.stringify(MARCA_USER_AGENT)})!==-1)document.documentElement.classList.add("app-nativa");`;
