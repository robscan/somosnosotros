import { ORIGENES, type Origen } from "@/lib/origen";

type Props = { origen: Origen; className?: string; children?: React.ReactNode };

/** Pie de una ficha tomada de un catálogo externo: de dónde viene y que está por confirmar. */
export default function PieOrigen({ origen, className, children }: Props) {
  const o = ORIGENES[origen];
  return (
    <div className={className}>
      Ficha tomada del{" "}
      <a href={o.url} target="_blank" rel="noreferrer">
        {o.nombre}
      </a>{" "}
      de {o.quien}, por confirmar.
      {children}
    </div>
  );
}
