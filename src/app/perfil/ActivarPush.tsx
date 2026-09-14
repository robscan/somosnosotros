"use client";

import { useEffect, useState } from "react";
import { borrarSuscripcionPush, guardarSuscripcionPush } from "./acciones";
import styles from "./FormularioPerfil.module.css";

type Estado = "revisando" | "no-soportado" | "instalar-primero" | "apagado" | "encendido" | "bloqueado" | "trabajando";

function base64AUint8(b64: string): Uint8Array {
  const relleno = "=".repeat((4 - (b64.length % 4)) % 4);
  const s = (b64 + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/**
 * "Activar avisos en el teléfono": pide permiso y guarda la suscripción de este teléfono.
 * En iPhone solo funciona con la app instalada en inicio; si no, lo dice.
 */
export default function ActivarPush({ llavePublica }: { llavePublica: string }) {
  const [estado, setEstado] = useState<Estado>("revisando");

  useEffect(() => {
    const id = requestAnimationFrame(async () => {
      if (!llavePublica || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setEstado("no-soportado");
        return;
      }
      const esIos = /iPhone|iPad/i.test(navigator.userAgent);
      const instalada = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (esIos && !instalada) {
        setEstado("instalar-primero");
        return;
      }
      if (Notification.permission === "denied") {
        setEstado("bloqueado");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setEstado(sub ? "encendido" : "apagado");
    });
    return () => cancelAnimationFrame(id);
  }, [llavePublica]);

  async function activar() {
    setEstado("trabajando");
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "bloqueado" : "apagado");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64AUint8(llavePublica) as BufferSource });
      const json = sub.toJSON();
      const ok = await guardarSuscripcionPush({ endpoint: sub.endpoint, keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" } });
      setEstado(ok ? "encendido" : "apagado");
    } catch {
      setEstado("apagado");
    }
  }

  async function desactivar() {
    setEstado("trabajando");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await borrarSuscripcionPush(sub.endpoint);
        await sub.unsubscribe();
      }
    } finally {
      setEstado("apagado");
    }
  }

  if (estado === "revisando" || estado === "no-soportado") return null;
  return (
    <div className={styles.push}>
      {estado === "instalar-primero" && <p className={styles.pushNota}>Para recibir avisos en este iPhone, primero instala la app: toca Compartir y luego Agregar a inicio. Después vuelve aquí.</p>}
      {estado === "bloqueado" && <p className={styles.pushNota}>Los avisos están bloqueados en este navegador. Actívalos en los ajustes del teléfono para este sitio.</p>}
      {estado === "apagado" && (
        <button type="button" className={styles.pushBoton} onClick={activar}>
          Activar avisos en este teléfono
        </button>
      )}
      {estado === "trabajando" && <p className={styles.pushNota}>Un momento…</p>}
      {estado === "encendido" && (
        <p className={styles.pushNota}>
          Avisos activados en este teléfono.{" "}
          <button type="button" className={styles.pushEnlace} onClick={desactivar}>
            Quitar
          </button>
        </p>
      )}
    </div>
  );
}
