"use client";

import { useActionState, useState } from "react";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import { LIMITES } from "@/lib/perfil";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { reducirImagen } from "@/lib/imagen";
import type { Perfil } from "@/lib/supabase/servidor";
import ActivarPush from "./ActivarPush";
import { borrarMiCuenta, cerrarSesion, guardarPerfil, type ResultadoGuardar } from "./acciones";
import styles from "./FormularioPerfil.module.css";

export default function FormularioPerfil({ perfil, llavePush = "" }: { perfil: Perfil; llavePush?: string }) {
  const [resultado, guardar, guardando] = useActionState<ResultadoGuardar | null, FormData>(guardarPerfil, null);
  const [foto, setFoto] = useState<string | null>(perfil.foto);
  const [subiendo, setSubiendo] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const errores = resultado && !resultado.ok ? resultado.errores : {};

  async function subirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const supabase = clienteNavegador();
    if (!supabase) return;
    if (archivo.size > 5 * 1024 * 1024) {
      setErrorFoto("La foto pesa más de 5 MB. Elige otra.");
      return;
    }
    setSubiendo(true);
    setErrorFoto(null);
    const listo = await reducirImagen(archivo); // menos peso y menos espera: se reduce en el teléfono antes de subir
    const extension = (listo.name.split(".").pop() || "jpg").toLowerCase();
    const ruta = `perfiles/${perfil.id}/foto-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("fotos").upload(ruta, listo, { upsert: true, contentType: listo.type || undefined });
    if (error) {
      setErrorFoto("No se pudo subir la foto. Intenta con otra.");
    } else {
      setFoto(supabase.storage.from("fotos").getPublicUrl(ruta).data.publicUrl);
    }
    setSubiendo(false);
  }

  return (
    <>
      <form action={guardar} noValidate>
        <div className={styles.fotoFila}>
          <div className={styles.avatar} aria-hidden="true">
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage, sin optimizador
              <img src={foto} alt="" />
            ) : (
              <span>{(perfil.nombre || "?").slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <label className={styles.subir}>
            <input type="file" accept="image/*" onChange={subirFoto} disabled={subiendo} />
            {subiendo ? "Subiendo…" : foto ? "Cambiar foto" : "Poner una foto (opcional)"}
          </label>
        </div>
        {errorFoto && (
          <p className="aviso-error" role="alert">
            {errorFoto}
          </p>
        )}
        <input type="hidden" name="foto" value={foto ?? ""} />

        <Campo etiqueta="Nombre" name="nombre" defaultValue={perfil.nombre} maxLength={LIMITES.nombre} autoComplete="name" error={errores.nombre} required />
        <Campo etiqueta="Colonia (opcional)" name="colonia" defaultValue={perfil.colonia ?? ""} maxLength={LIMITES.colonia} error={errores.colonia} ayuda="Para ordenar lo que te queda cerca." />
        <Campo etiqueta="Sobre mí (opcional)" name="bio" multilinea defaultValue={perfil.bio ?? ""} maxLength={LIMITES.bio} error={errores.bio} ayuda={`Una línea, hasta ${LIMITES.bio} caracteres.`} />
        <ActivarPush llavePublica={llavePush} />
        <label className={styles.casilla}>
          <input type="checkbox" name="avisos" value="si" defaultChecked={perfil.avisos !== false} /> Avisarme por correo cuando haya un evento nuevo en un lugar que sigo, y el día de un evento al que voy.
        </label>

        {resultado && !resultado.ok && resultado.general && (
          <p className="aviso-error" role="alert">
            {resultado.general}
          </p>
        )}
        {resultado?.ok && (
          <p className="aviso-ok" role="status">
            Guardado.
          </p>
        )}
        <Boton type="submit" disabled={guardando || subiendo}>
          {guardando ? "Guardando…" : "Guardar"}
        </Boton>
      </form>

      <div className={styles.acciones}>
        <form action={cerrarSesion}>
          <Boton type="submit" variante="secundario">
            Cerrar sesión
          </Boton>
        </form>
        {confirmarBorrar ? (
          <form action={borrarMiCuenta} className={styles.confirmar}>
            <p>Se borra tu cuenta y tu perfil. Lo que publicaste se queda, sin tu nombre. No se puede deshacer.</p>
            <Boton type="submit" variante="peligro">
              Sí, borrar mi cuenta
            </Boton>
            <Boton type="button" variante="secundario" onClick={() => setConfirmarBorrar(false)}>
              Cancelar
            </Boton>
          </form>
        ) : (
          <button type="button" className={styles.enlaceBorrar} onClick={() => setConfirmarBorrar(true)}>
            Borrar mi cuenta
          </button>
        )}
      </div>
    </>
  );
}
