"use client";

import { useEffect, useState } from "react";
import { desuscribirPush, estadoPush, suscribirPush, type EstadoPush } from "@/lib/pushCliente";
import { borrarSuscripcionPush, guardarSuscripcionPush } from "./acciones";
import styles from "./FormularioPerfil.module.css";

type Estado = "revisando" | EstadoPush | "trabajando";

/**
 * "Activar avisos en el teléfono": pide permiso y guarda la suscripción de este teléfono.
 * En iPhone solo funciona con la app instalada en inicio; si no, lo dice.
 */
export default function ActivarPush({ llavePublica }: { llavePublica: string }) {
  const [estado, setEstado] = useState<Estado>("revisando");

  useEffect(() => {
    const id = requestAnimationFrame(async () => {
      setEstado(await estadoPush(llavePublica));
    });
    return () => cancelAnimationFrame(id);
  }, [llavePublica]);

  async function activar() {
    setEstado("trabajando");
    try {
      const r = await suscribirPush(llavePublica);
      if (!r.ok) {
        setEstado(r.estado);
        return;
      }
      const ok = await guardarSuscripcionPush(r.sub);
      setEstado(ok ? "encendido" : "apagado");
    } catch {
      setEstado("apagado");
    }
  }

  async function desactivar() {
    setEstado("trabajando");
    try {
      const endpoint = await desuscribirPush();
      if (endpoint) await borrarSuscripcionPush(endpoint);
    } finally {
      setEstado("apagado");
    }
  }

  if (estado === "revisando" || estado === "no-soportado") return null;
  return (
    <div className={styles.push}>
      {estado === "instalar-primero" && <p className={styles.pushNota}>Para recibir avisos en este iPhone, primero instala la app: toca Compartir (abajo, al centro) y elige “Agregar a pantalla de inicio”. Ábrela desde ahí y vuelve aquí.</p>}
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
