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
import { apuntarVuelta, desdeElReferente, haciaDonde, leerAntes, leerDesde } from "@/lib/historial";
import { medicionActivaEnCliente, medirCliente } from "@/lib/medir";
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

/**
 * «Ya dentro» con el código (OL-325). La marca de admin del layout aún no llegó (llega al releer la pantalla): se pregunta el rol de la
 * cuenta recién entrada, sin esperar a nadie, y solo si no es administración se mide. Fuera de producción no se pregunta nada.
 */
function medirEntradaLista(supabase: NonNullable<ReturnType<typeof clienteNavegador>>) {
  // Medir nunca puede cortar la entrada: si algo de aquí lanzara, `entrarConCodigo` no llegaría a llevar a la persona a donde iba.
  try {
    if (!medicionActivaEnCliente()) return medirCliente("entrar", { paso: "listo", metodo: "correo" }); // solo la consola de depurar
    void (async () => {
      try {
        const { data } = await supabase.rpc("mi_perfil");
        if ((data as { rol?: string } | null)?.rol !== "admin") medirCliente("entrar", { paso: "listo", metodo: "correo" });
      } catch {
        // sin respuesta: no se mide
      }
    })();
  } catch {
    // no se mide
  }
}

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
      medirCliente("entrar", { paso: "fallo", metodo: "correo" });
      setError(e.status === 429 ? "Demasiados intentos. Espera unos minutos." : /sending/i.test(e.message) ? "No pudimos mandarlo a ese correo. Revísalo o usa otro." : "No se pudo mandar el código. Intenta de nuevo.");
      return false;
    }
    setCorreo(limpio);
    setEspera(ESPERA_REENVIO);
    medirCliente("entrar", { paso: "pedido", metodo: "correo" });
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
      medirCliente("entrar", { paso: "fallo", metodo: "correo" });
      setFase("codigo");
      setError("Ese código no es, o ya caducó. Pide otro.");
      setCodigo("");
      requestAnimationFrame(() => campoCodigo.current?.focus());
      return;
    }
    medirEntradaLista(supabase);
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

  /**
   * De qué pantalla se vino a Entrar: la que anotó la marca del historial al apilar esta entrada y, si se llegó con una
   * carga completa (un toque antes de que la pantalla responda al dedo, un enlace compartido), la que diga el referente.
   */
  function deDondeVengo(): string | null {
    return leerDesde(window.history.state) ?? desdeElReferente(document.referrer, window.location.origin, window.location.pathname);
  }

  /** Lo que se apunta para el regreso: cuántas entradas tiene el historial y hasta dónde retroceder al volver (`haciaDonde`). */
  function apunte() {
    const desde = deDondeVengo();
    const hacia = haciaDonde(desde, siguiente);
    // La pantalla que debe quedar detrás del destino tras volver: la de antes de la de origen si se vuelve a ella (Voy desde una ficha) o la de origen si no (el «+»).
    const previa = hacia === "origen" ? leerAntes(window.history.state) : desde;
    apuntarVuelta(window.sessionStorage, { siguiente, largo: window.history.length, hacia, detras: desde !== null, cuando: Date.now(), previa });
  }

  /**
   * Se apunta el regreso antes de salir hacia Apple o Google (OL-069 y OL-249). La vuelta del proveedor es una carga completa y deja sus pantallas
   * entre las de la persona y el destino; con el apunte, `Navegacion` retrocede hasta la pantalla de la que se vino y Atrás (o el gesto) lleva a
   * donde estaba la persona antes de la tarea. Se apunta al llegar, no al tocar el botón: así vale aunque el toque llegue antes que el JavaScript.
   */
  useEffect(() => {
    if (proveedores.length === 0) return; // sin botones de Apple o Google no hay salida del sitio que deshacer
    apunte();
    // Solo al llegar a la pantalla; al tocar el botón se refresca la hora por si la persona se quedó un rato.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Al tocar el botón del proveedor, el apunte se refresca: uno viejo caduca a los 10 minutos. */
  function refrescarApunte(e: React.MouseEvent<HTMLAnchorElement>, proveedor: Proveedor) {
    medirCliente("entrar", { paso: "pedido", metodo: proveedor });
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // otra pestaña: su historial es suyo
    apunte();
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
          <>
            <p className="subtitulo">Entras sin contraseña y sin rastreo ni publicidad.</p>
            <div className={styles.opciones}>
              {proveedores.map((p, i) => (
                // Enlace normal, no <Link>: la ida pasa por el servidor (/auth/apple) y sale del sitio.
                // Apple negro solo cuando va primero (en sus dispositivos); detrás de Google, su variante blanca, para que el primero siga siendo el que más pesa.
                <a key={p} href={`/auth/${p}?siguiente=${encodeURIComponent(siguiente)}`} onClick={(e) => refrescarApunte(e, p)} className={`${styles.opcion} ${p === "apple" && i > 0 ? styles.appleBlanco : styles[p]}`}>
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
          </>
        )}
        {fase === "correo" && (
          <form onSubmit={enviarCorreo} noValidate className={conProveedores ? styles.conProveedores : undefined}>
            {!conProveedores && <p className="subtitulo">Sin contraseña ni rastreo: te mandamos un código a tu correo.</p>}
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
