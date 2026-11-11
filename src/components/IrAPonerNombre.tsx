"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { destinoPedirNombre, marcarPedido, yaSePidio } from "@/lib/pedirNombre";

/**
 * Lleva una sola vez por sesión a quien no tiene nombre a la pantalla de editar su ficha (OL-512, `lib/pedirNombre`). No pinta nada. Solo se
 * monta si a la cuenta con sesión le falta el nombre (`PedirNombre`, en el layout). Con `push`: Atrás la devuelve a donde estaba.
 */
export default function IrAPonerNombre() {
  const ruta = usePathname();
  const consulta = useSearchParams().toString();
  const router = useRouter();
  useEffect(() => {
    const almacen = typeof window === "undefined" ? null : window.sessionStorage;
    const destino = destinoPedirNombre(ruta, consulta, yaSePidio(almacen));
    if (!destino) {
      // Llegó sola a editar su ficha: ya se le pidió.
      if (ruta === "/ajustes/editar") marcarPedido(almacen);
      return;
    }
    marcarPedido(almacen);
    router.push(destino);
  }, [ruta, consulta, router]);
  return null;
}
