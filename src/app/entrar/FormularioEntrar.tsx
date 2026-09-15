"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import { enmascararCorreo, limpiarCodigo } from "@/lib/entrar";
import { correoValido } from "@/lib/perfil";
import { clienteNavegador } from "@/lib/supabase/navegador";
import styles from "./FormularioEntrar.module.css";

type Props = { siguiente: string; google: boolean; /** Dígitos del código que manda Supabase. */ largo: number };
type Fase = "correo" | "codigo" | "entrando";

/** Segundos antes de poder pedir otro código. */
const ESPERA_REENVIO = 30;

/**
 * Sin contraseñas: el correo trae un código de varios dígitos (8 en este proyecto) y un enlace. Aquí se pide el código
 * (el iPhone lo ofrece solo sobre el teclado) y al validarlo la persona vuelve a donde iba con la
 * acción aplicada. Decisión 2 de docs/rediseno/11-restantes-flujo-y-estados.md.
 */
export default function FormularioEntrar({ siguiente, google, largo }: Props) {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>("correo");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [espera, setEspera] = useState(0);
  const campoCodigo = useRef<HTMLInputElement>(null);
  const enviando = useRef(false);

  // Cuenta atrás para "Reenviar": un código por pedido, no uno por toque.
  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  function urlCallback() {
    return `${window.location.origin}/auth/callback?siguiente=${encodeURIComponent(siguiente)}`;
  }

  async function mandarCodigo(): Promise<boolean> {
    const limpio = correo.trim().toLowerCase();
    if (!correoValido(limpio)) {
      setError("Revisa el correo: le falta algo.");
      return false;
    }
    const supabase = clienteNavegador();
    if (!supabase) {
      setError("Falta configurar Supabase.");
      return false;
    }
    setOcupado(true);
    setError(null);
    const { error: e } = await supabase.auth.signInWithOtp({ email: limpio, options: { emailRedirectTo: urlCallback() } });
    setOcupado(false);
    if (e) {
      setError(e.status === 429 ? "Demasiados intentos. Espera unos minutos." : /sending/i.test(e.message) ? "No pudimos mandarlo a ese correo. Revísalo o usa otro." : "No se pudo mandar el código. Intenta de nuevo.");
      return false;
    }
    setCorreo(limpio);
    setEspera(ESPERA_REENVIO);
    return true;
  }

  async function enviarCorreo(e: React.FormEvent) {
    e.preventDefault();
    if (await mandarCodigo()) {
      setCodigo("");
      setFase("codigo");
      requestAnimationFrame(() => campoCodigo.current?.focus());
    }
  }

  async function entrarConCodigo(valor: string) {
    if (enviando.current) return;
    if (valor.length < largo) {
      setError(`Son ${largo} dígitos.`);
      return;
    }
    const supabase = clienteNavegador();
    if (!supabase) return;
    enviando.current = true;
    setFase("entrando");
    setError(null);
    const { error: e } = await supabase.auth.verifyOtp({ email: correo, token: valor, type: "email" });
    enviando.current = false;
    if (e) {
      setFase("codigo");
      setError("Ese código no es, o ya caducó. Pide otro.");
      setCodigo("");
      requestAnimationFrame(() => campoCodigo.current?.focus());
      return;
    }
    router.replace(siguiente); // la pantalla de origen aplica la intención (Voy, Seguir…) al cargar con sesión
    router.refresh();
  }

  function alEscribirCodigo(texto: string) {
    const v = limpiarCodigo(texto, largo);
    setCodigo(v);
    setError(null);
    if (v.length === largo) void entrarConCodigo(v); // al último dígito entra solo: un toque menos
  }

  async function entrarConGoogle() {
    const supabase = clienteNavegador();
    if (!supabase) return;
    setOcupado(true);
    const { error: e } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: urlCallback() } });
    if (e) {
      setOcupado(false);
      setError("No se pudo abrir Google. Intenta con tu correo.");
    }
  }

  if (fase === "correo") {
    return (
      <form onSubmit={enviarCorreo} noValidate>
        <p className="subtitulo">Sin contraseñas: te mandamos un código a tu correo.</p>
        <Campo etiqueta="Tu correo" name="correo" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="nombre@correo.com" value={correo} onChange={(e) => setCorreo(e.target.value)} error={error ?? undefined} autoFocus required />
        <Boton type="submit" disabled={ocupado}>
          {ocupado ? "Mandando…" : "Mandarme el código"}
        </Boton>
        {google && (
          <>
            <p className={styles.separador}>o</p>
            <Boton type="button" variante="secundario" onClick={entrarConGoogle} disabled={ocupado}>
              Continuar con Google
            </Boton>
          </>
        )}
      </form>
    );
  }

  const entrando = fase === "entrando";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void entrarConCodigo(codigo);
      }}
      noValidate
    >
      <div className={styles.enviado} role="status">
        <b>Te mandamos un código a {enmascararCorreo(correo)}</b>
        También trae un enlace, por si prefieres tocarlo.
      </div>
      <label htmlFor="campo-codigo" className={styles.etiqueta}>
        Código de {largo} dígitos
      </label>
      <input
        id="campo-codigo"
        ref={campoCodigo}
        className={`${styles.codigo} ${error ? styles.codigoMal : ""}`}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={largo}
        value={codigo}
        onChange={(e) => alEscribirCodigo(e.target.value)}
        placeholder={"·".repeat(largo)}
        aria-invalid={!!error}
        aria-describedby={error ? "codigo-error" : undefined}
        disabled={entrando}
      />
      {error && (
        <p id="codigo-error" className={styles.error} role="alert">
          {error}
        </p>
      )}
      <p className={styles.nota}>Tecléalo o pégalo; el iPhone lo ofrece solo encima del teclado.</p>
      <Boton type="submit" disabled={entrando || codigo.length < largo}>
        {entrando ? "Entrando…" : "Entrar"}
      </Boton>
      <div className={styles.otras}>
        <button type="button" className={styles.enlaceBoton} onClick={() => void mandarCodigo()} disabled={ocupado || espera > 0}>
          {espera > 0 ? `Reenviar en ${espera} s` : "¿No llega? Reenviar"}
        </button>
        <button
          type="button"
          className={styles.enlaceBoton}
          onClick={() => {
            setFase("correo");
            setCodigo("");
            setError(null);
          }}
        >
          Usar otro correo
        </button>
      </div>
    </form>
  );
}
