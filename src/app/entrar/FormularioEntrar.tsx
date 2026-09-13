"use client";

import { useState } from "react";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import { correoValido } from "@/lib/perfil";
import { clienteNavegador } from "@/lib/supabase/navegador";
import styles from "./FormularioEntrar.module.css";

type Estado = { fase: "listo" } | { fase: "enviando" } | { fase: "enviado"; correo: string } | { fase: "error"; mensaje: string };

export default function FormularioEntrar({ siguiente }: { siguiente: string }) {
  const [correo, setCorreo] = useState("");
  const [estado, setEstado] = useState<Estado>({ fase: "listo" });

  function urlCallback() {
    return `${window.location.origin}/auth/callback?siguiente=${encodeURIComponent(siguiente)}`;
  }

  async function enviarEnlace(e: React.FormEvent) {
    e.preventDefault();
    const limpio = correo.trim().toLowerCase();
    if (!correoValido(limpio)) {
      setEstado({ fase: "error", mensaje: "Revisa el correo: le falta algo." });
      return;
    }
    const supabase = clienteNavegador();
    if (!supabase) {
      setEstado({ fase: "error", mensaje: "Falta configurar Supabase." });
      return;
    }
    setEstado({ fase: "enviando" });
    const { error } = await supabase.auth.signInWithOtp({
      email: limpio,
      options: { emailRedirectTo: urlCallback() },
    });
    if (error) {
      setEstado({
        fase: "error",
        mensaje: error.status === 429 ? "Demasiados intentos. Espera unos minutos." : "No se pudo enviar el enlace. Intenta de nuevo.",
      });
      return;
    }
    setEstado({ fase: "enviado", correo: limpio });
  }

  async function entrarConGoogle() {
    const supabase = clienteNavegador();
    if (!supabase) return;
    setEstado({ fase: "enviando" });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: urlCallback() },
    });
    if (error) setEstado({ fase: "error", mensaje: "No se pudo abrir Google. Intenta con tu correo." });
  }

  if (estado.fase === "enviado") {
    return (
      <div className="aviso-ok" role="status">
        <p>
          <strong>Revisa tu correo.</strong> Mandamos un enlace a {estado.correo}. Ábrelo desde este mismo teléfono y listo.
        </p>
        <p className={styles.nota}>Si no llega en un par de minutos, mira en spam o pide otro.</p>
        <button type="button" className={styles.enlaceBoton} onClick={() => setEstado({ fase: "listo" })}>
          Usar otro correo
        </button>
      </div>
    );
  }

  const ocupado = estado.fase === "enviando";
  return (
    <form onSubmit={enviarEnlace} noValidate>
      <Campo
        etiqueta="Tu correo"
        name="correo"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        placeholder="nombre@correo.com"
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        error={estado.fase === "error" ? estado.mensaje : undefined}
        required
      />
      <Boton type="submit" disabled={ocupado}>
        {ocupado ? "Enviando…" : "Mandarme el enlace"}
      </Boton>
      <p className={styles.separador}>o</p>
      <Boton type="button" variante="secundario" onClick={entrarConGoogle} disabled={ocupado}>
        Continuar con Google
      </Boton>
    </form>
  );
}
