"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import Hoja from "@/components/ui/Hoja";
import { IconoChevronDerecha, IconoLapiz } from "@/components/ui/Iconos";
import { LIMITES } from "@/lib/perfil";
import { subirFoto } from "@/lib/subirFoto";
import type { Perfil } from "@/lib/supabase/servidor";
import ajustes from "@/app/ajustes/ajustes.module.css";
import { guardarPerfil, type ResultadoGuardar } from "./acciones";
import styles from "./EditarPerfil.module.css";

type Props = { perfil: Perfil; correo: string };

/**
 * Fila "Editar" de Ajustes: abre una hoja con la foto (tocar para cambiar), Nombre, Colonia y Sobre mí (decisión 6).
 * El correo se dice aquí y solo aquí. Al guardar, la hoja se cierra. `?editar=1` (desde "Completar" en Mi perfil) la abre al llegar.
 */
export default function EditarPerfil({ perfil, correo }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [abierta, setAbierta] = useState(() => params.get("editar") === "1");
  const [resultado, guardar, guardando] = useActionState<ResultadoGuardar | null, FormData>(async (previo, fd) => {
    const r = await guardarPerfil(previo, fd);
    if (r.ok) {
      setAbierta(false);
      router.refresh();
      if (params.get("editar")) router.replace("/ajustes");
    }
    return r;
  }, null);
  const [foto, setFoto] = useState<string | null>(perfil.foto);
  const [subiendo, setSubiendo] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const errores = resultado && !resultado.ok ? resultado.errores : {};

  function cerrar() {
    setAbierta(false);
    if (params.get("editar")) router.replace("/ajustes");
  }
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

  return (
    <li>
      <button type="button" className={ajustes.fila} onClick={() => setAbierta(true)} aria-haspopup="dialog">
        <IconoLapiz width={20} height={20} />
        <b>Editar</b>
        <small>Foto, nombre, colonia, sobre ti</small>
        <span className={ajustes.valor}>
          <IconoChevronDerecha />
        </span>
      </button>
      {abierta && (
        <Hoja etiqueta="Editar perfil" onCerrar={cerrar}>
          <h3 className={styles.titulo}>Editar perfil</h3>
          <form action={guardar} noValidate className={styles.formulario}>
            <label className={styles.fotoFila}>
              <span className={styles.avatar} aria-hidden="true">
                {foto ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage
                  <img src={foto} alt="" />
                ) : (
                  (perfil.nombre || "?").slice(0, 1).toUpperCase()
                )}
              </span>
              <span className={styles.cambiarFoto}>{subiendo ? "Subiendo…" : foto ? "Cambiar la foto" : "Poner una foto"}</span>
              <input type="file" accept="image/*" onChange={alElegirFoto} disabled={subiendo} className={styles.archivo} />
            </label>
            {errorFoto && (
              <p className="aviso-error" role="alert">
                {errorFoto}
              </p>
            )}
            <input type="hidden" name="foto" value={foto ?? ""} />
            <Campo etiqueta="Nombre" name="nombre" defaultValue={perfil.nombre} maxLength={LIMITES.nombre} autoComplete="name" error={errores.nombre} required />
            <Campo etiqueta="Colonia" name="colonia" defaultValue={perfil.colonia ?? ""} maxLength={LIMITES.colonia} placeholder="Para ordenar lo que te queda cerca" error={errores.colonia} />
            <Campo etiqueta="Sobre mí" name="bio" multilinea defaultValue={perfil.bio ?? ""} maxLength={LIMITES.bio} placeholder={`Una línea, hasta ${LIMITES.bio} caracteres`} error={errores.bio} />
            <p className={styles.correo}>Entras con {correo}.</p>
            {resultado && !resultado.ok && resultado.general && (
              <p className="aviso-error" role="alert">
                {resultado.general}
              </p>
            )}
            <Boton type="submit" disabled={guardando || subiendo}>
              {guardando ? "Guardando…" : "Guardar"}
            </Boton>
          </form>
        </Hoja>
      )}
    </li>
  );
}
