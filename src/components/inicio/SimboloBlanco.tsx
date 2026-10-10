import { CAJA_SN, TRAZO_SN } from "@/lib/simboloSN";

/**
 * El símbolo SN (`docs/diseno/logotipo/LogoFinal/SN - Symbol.svg`) en línea, del color del texto (`currentColor`): sobre el degradado de un evento
 * sin cartel (círculo e historia de OL-359). Nunca el logotipo SMSNSTRS (founder, 2026-10-09: «pon el símbolo de SN»). Decorativo: el nombre lo
 * dice quien lo contiene.
 */
export default function SimboloBlanco({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${CAJA_SN.ancho} ${CAJA_SN.alto}`} xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <path fill="currentColor" d={TRAZO_SN} />
    </svg>
  );
}
