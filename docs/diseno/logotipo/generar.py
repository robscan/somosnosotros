"""Dibuja SMSNSTRS con manos y pies (borrador 3) y exporta los dos SVG."""
from lt import *
from piezas6 import construir, CONTACTOS
from espaciado2 import EspaciadorOrden

E = EspaciadorOrden(construir(True))
xs, notas = E.posiciones(CONTACTOS)
print(*notas, sep="\n")
det = E.palabra(xs)
chico = U(*[xform(fn(), T(x, 0)) for (_, fn), x in zip(construir(False), xs)])
b = det.bounds; m = 8
vb = f"{b[0] - m:.0f} {-(b[3] + m):.0f} {b[2] - b[0] + 2 * m:.0f} {b[3] - b[1] + 2 * m:.0f}"
for nombre, p in (("smsnstrs", det), ("smsnstrs-chico", chico)):
    open(f"{nombre}.svg", "w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="Somos Nosotros">'
                                     f'<path transform="scale(1,-1)" fill="currentColor" d="{svg_d(p)}"/></svg>\n')
