import type { ReactNode } from "react";
import { MARCA_ROL } from "@/lib/medir";
import { usuarioDeLaBarra } from "./usuarioDeLaBarra";

/**
 * La medición arranca cuando se sabe quién mira (OL-325; F10 de OL-327). En el layout va dentro de `Suspense`: hasta que la sesión
 * resuelve no pinta nada, y sin la marca nada se mide (`sinMedirEnPantalla`). Al resolver pinta la marca escondida con el rol
 * (`admin` u `otro`; nada más: ni quién es ni su id) y, solo si NO es administración, la analítica (`children`): Vercel, Google y
 * `app_instalada` se montan entonces, así que la primera vista sale con el rol ya sabido; para un admin no se montan nunca. Usa la
 * misma lectura de la sesión que la barra (`usuarioDeLaBarra`, una por petición): no suma consultas.
 */
export default async function MarcaAdmin({ children }: { children?: ReactNode }) {
  const actual = await usuarioDeLaBarra();
  const admin = actual?.perfil.rol === "admin";
  return (
    <>
      <i hidden {...{ [MARCA_ROL]: admin ? "admin" : "otro" }} />
      {!admin && children}
    </>
  );
}
