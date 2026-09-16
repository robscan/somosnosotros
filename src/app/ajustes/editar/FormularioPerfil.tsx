"use client";

import { useActionState, useState } from "react";
import Boton from "@/components/ui/Boton";
import { IconoCamara, IconoCandado, IconoCasa, IconoPersona, IconoTexto } from "@/components/ui/Iconos";
import { LIMITES } from "@/lib/perfil";
import { subirFoto } from "@/lib/subirFoto";
import type { Perfil } from "@/lib/supabase/servidor";
import { guardarPerfil, type ResultadoGuardar } from "@/app/perfil/acciones";
import canon from "@/components/ui/FormularioCanon.module.css";

type Props = { perfil: Perfil; correo: string };
type Renglon = "nombre" | "colonia" | "bio";

/**
 * Los renglones del perfil con el canon: Foto (la cámara como acción), Nombre, Colonia y Sobre ti se abren de uno
 * en uno con el campo dentro; "Entras con" es un renglón con candado y sin acción. Guardar se enciende cuando hay un cambio.
 */
export default function FormularioPerfil({ perfil, correo }: Props) {
  const [resultado, guardar, guardando] = useActionState<ResultadoGuardar | null, FormData>(guardarPerfil, null);
  const errores = resultado && !resultado.ok ? resultado.errores : {};
  const [nombre, setNombre] = useState(perfil.nombre);
  const [colonia, setColonia] = useState(perfil.colonia ?? "");
  const [bio, setBio] = useState(perfil.bio ?? "");
  const [foto, setFoto] = useState<string | null>(perfil.foto);
  const [subiendo, setSubiendo] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<Renglon | null>(null);

  async function alElegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    setErrorFoto(null);
    const r = await subirFoto("perfiles", perfil.id, "foto", archivo);
    if ("error" in r) setErrorFoto(r.error);
    else setFoto(r.url);
    setSubiendo(false);
  }

  const hayCambio = nombre.trim() !== perfil.nombre || colonia.trim() !== (perfil.colonia ?? "") || bio.trim() !== (perfil.bio ?? "") || foto !== perfil.foto;
  const faltaNombre = nombre.trim().length === 0;
  const alternar = (r: Renglon) => setAbierto((a) => (a === r ? null : r));

  /** Un renglón de texto: cerrado muestra el valor; abierto, el campo dentro con foco. El valor viaja siempre (campo escondido si está cerrado). */
  function renglon(clave: Renglon, etiqueta: string, icono: React.ReactNode, valor: string, setValor: (v: string) => void, placeholder: string, maxLength: number, multilinea = false) {
    const estaAbierto = abierto === clave;
    const error = errores[clave];
    return (
      <li className={`${canon.resuelto} ${estaAbierto ? canon.abierta : ""}`}>
        {icono}
        <span className={canon.clave}>{etiqueta}</span>
        <span className={`${canon.valor} ${valor.trim() ? "" : canon.falta}`}>{valor.trim() || "Falta"}</span>
        <button type="button" className={canon.cambiar} onClick={() => alternar(clave)} aria-expanded={estaAbierto}>
          {estaAbierto ? "Listo" : "Cambiar"}
        </button>
        {estaAbierto ? (
          <div className={canon.cuerpo}>
            {multilinea ? (
              <textarea name={clave} value={valor} onChange={(e) => setValor(e.target.value)} maxLength={maxLength} placeholder={placeholder} aria-label={etiqueta} className={canon.entrada} autoFocus />
            ) : (
              <input type="text" name={clave} value={valor} onChange={(e) => setValor(e.target.value)} maxLength={maxLength} placeholder={placeholder} aria-label={etiqueta} className={canon.entrada} autoComplete={clave === "nombre" ? "name" : "off"} autoFocus />
            )}
            {error && (
              <p className={canon.error} role="alert">
                {error}
              </p>
            )}
          </div>
        ) : (
          <>
            <input type="hidden" name={clave} value={valor} />
            {error && (
              <p className={canon.cuerpoNota} role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </li>
    );
  }

  return (
    <form action={guardar} noValidate>
      <ul className={canon.renglones}>
        {/* Foto: la cámara como acción; la foto puesta ocupa el sitio del icono. */}
        <li className={`${canon.resuelto} ${foto ? "" : canon.pendiente}`}>
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
            <img src={foto} alt="" className={canon.miniatura} />
          ) : (
            <IconoCamara width={20} height={20} />
          )}
          <span className={canon.clave}>Foto</span>
          <span className={`${canon.valor} ${foto ? "" : canon.falta}`}>{subiendo ? "Subiendo…" : foto ? "Tu foto" : "Sin foto"}</span>
          <label className={canon.accionIcono} title={foto ? "Cambiar la foto" : "Poner una foto"}>
            <IconoCamara width={22} height={22} />
            <input type="file" accept="image/*" onChange={alElegirFoto} disabled={subiendo} aria-label={foto ? "Cambiar la foto" : "Poner una foto"} />
          </label>
          {(errorFoto || errores.foto) && (
            <p className={canon.cuerpoNota} role="alert">
              {errorFoto ?? errores.foto}
            </p>
          )}
        </li>
        {renglon("nombre", "Nombre", <IconoPersona width={20} height={20} />, nombre, setNombre, "Tu nombre", LIMITES.nombre)}
        {renglon("colonia", "Colonia", <IconoCasa width={20} height={20} />, colonia, setColonia, "Para ordenar lo que te queda cerca", LIMITES.colonia)}
        {renglon("bio", "Sobre ti", <IconoTexto width={20} height={20} />, bio, setBio, `Una línea, hasta ${LIMITES.bio} caracteres`, LIMITES.bio, true)}
        {/* El correo se dice aquí y solo aquí; no se cambia desde la app. */}
        <li className={canon.resuelto}>
          <IconoCandado width={20} height={20} />
          <span className={canon.clave}>Entras con</span>
          <span className={canon.valor}>{correo}</span>
        </li>
      </ul>
      <input type="hidden" name="foto" value={foto ?? ""} />
      {resultado && !resultado.ok && resultado.general && (
        <p className="aviso-error" role="alert">
          {resultado.general}
        </p>
      )}
      {/* Guardar se enciende cuando hay un cambio; dice qué falta si el nombre quedó vacío. */}
      <Boton type="submit" disabled={guardando || subiendo || !hayCambio || faltaNombre}>
        {guardando ? "Guardando…" : "Guardar"}
        {!guardando && faltaNombre && <small className={canon.faltaBoton}>falta el nombre</small>}
      </Boton>
    </form>
  );
}
