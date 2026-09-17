"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useTerminar } from "@/components/ui/Atras";
import Boton from "@/components/ui/Boton";
import Campo from "@/components/ui/Campo";
import { IconoCorreo } from "@/components/ui/Iconos";
import { LogoApple, LogoGoogle } from "@/components/ui/LogosEntrar";
import { enmascararCorreo, limpiarCodigo } from "@/lib/entrar";
import { NOMBRE_PROVEEDOR, type Proveedor } from "@/lib/entrarCon";
import { correoValido } from "@/lib/perfil";
import { clienteNavegador } from "@/lib/supabase/navegador";
import Limpiar from "@/components/ui/Limpiar";
import limpiar from "@/components/ui/Limpiar.module.css";
import styles from "./FormularioEntrar.module.css";

type Props = {
  siguiente: string;
  /** Apple y Google encendidos en Supabase, en el orden de este navegador (src/lib/entrarCon.ts). */
  proveedores: Proveedor[];
  /** Dígitos del código que manda Supabase. */
  largo: number;
};
type Fase = "elegir" | "correo" | "codigo" | "entrando";

/** Segundos antes de poder pedir otro código. */
const ESPERA_REENVIO = 30;

/**
 * Sin contraseñas. Con Apple o Google encendidos, entrar es un toque: esos botones van primero y el correo espera detrás
 * del suyo (bitácora 069; el código por correo era la barrera principal para registrarse). El correo trae un código de
 * varios dígitos (8 en este proyecto) y un enlace; aquí se pide el código (el iPhone lo ofrece solo sobre el teclado) y
 * al validarlo la persona vuelve a donde iba con la acción aplicada. Decisión 2 de docs/rediseno/11-restantes-flujo-y-estados.md.
 */
export default function FormularioEntrar({ siguiente, proveedores, largo }: Props) {
  const terminar = useTerminar();
  const [fase, setFase] = useState<Fase>(proveedores.length > 0 ? "elegir" : "correo");
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
    // La pantalla de origen aplica la intención (Voy, Seguir…) al cargar con sesión. Si se vino de ella, se vuelve con el
    // historial en vez de apilar otra copia (el primer Atrás no hacía nada); con sesión nueva, se relee.
    terminar(siguiente, { refrescar: true });
  }

  function alEscribirCodigo(texto: string) {
    const v = limpiarCodigo(texto, largo);
    setCodigo(v);
    setError(null);
    if (v.length === largo) void entrarConCodigo(v); // al último dígito entra solo: un toque menos
  }

  /** El campo aparece y se enfoca dentro del mismo toque: así el iPhone abre el teclado sin un toque más. */
  function abrirCorreo() {
    flushSync(() => setFase("correo"));
    document.getElementById("campo-correo")?.focus();
  }

  if (fase === "elegir" || fase === "correo") {
    const conProveedores = proveedores.length > 0;
    return (
      <>
        {conProveedores && (
          <div className={styles.opciones}>
            {proveedores.map((p, i) => (
              // Enlace normal, no <Link>: la ida pasa por el servidor (/auth/apple) y sale del sitio.
              // Apple negro solo cuando va primero (en sus dispositivos); detrás de Google, su variante blanca, para que el primero siga siendo el que más pesa.
              <a key={p} href={`/auth/${p}?siguiente=${encodeURIComponent(siguiente)}`} className={`${styles.opcion} ${p === "apple" && i > 0 ? styles.appleBlanco : styles[p]}`}>
                {p === "apple" ? <LogoApple className={styles.logo} /> : <LogoGoogle className={styles.logo} />}
                Continuar con {NOMBRE_PROVEEDOR[p]}
              </a>
            ))}
            {fase === "elegir" && (
              <button type="button" className={`${styles.opcion} ${styles.correo}`} onClick={abrirCorreo}>
                <IconoCorreo className={styles.logo} />
                Continuar con tu correo
              </button>
            )}
          </div>
        )}
        {fase === "correo" && (
          <form onSubmit={enviarCorreo} noValidate className={conProveedores ? styles.conProveedores : undefined}>
            {!conProveedores && <p className="subtitulo">Sin contraseñas: te mandamos un código a tu correo.</p>}
            <Campo etiqueta="Tu correo" name="correo" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="nombre@correo.com" value={correo} onChange={(e) => setCorreo(e.target.value)} error={error ?? undefined} autoFocus={!conProveedores} required />
            <Boton type="submit" disabled={ocupado}>
              {ocupado ? "Mandando…" : "Mandarme el código"}
            </Boton>
          </form>
        )}
      </>
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
      <span className={limpiar.caja}>
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
        <Limpiar visible={!!codigo} />
      </span>
      {error && (
        <p id="codigo-error" className={styles.error} role="alert">
          {error}
        </p>
      )}
      <p className={`${styles.nota} ${styles.soloIos}`}>Tecléalo o pégalo; el iPhone lo ofrece solo encima del teclado.</p>
      <p className={`${styles.nota} ${styles.sinIos}`}>Tecléalo o pégalo.</p>
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
            setCodigo("");
            setError(null);
            abrirCorreo();
          }}
        >
          Usar otro correo
        </button>
      </div>
    </form>
  );
}
