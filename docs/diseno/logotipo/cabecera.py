"""Exporta public/logotipo.svg y public/logotipo-chico.svg: coordenadas enteras y color de tinta fijo."""
import skia
from fontTools.pens.svgPathPen import SVGPathPen
from lt import *
from piezas6 import construir, CONTACTOS
from espaciado2 import EspaciadorOrden

E = EspaciadorOrden(construir(True))
xs, _ = E.posiciones(CONTACTOS)
det = E.mod
chico = [fn() for _, fn in construir(False)]
palabra_det = U(*[xform(p, T(x, 0)) for p, x in zip(det, xs)])
palabra_chico = U(*[xform(p, T(x, 0)) for p, x in zip(chico, xs)])

def d_entero(path):
    sp = SVGPathPen(None, ntos=lambda v: "%d" % round(v)); path.draw(sp); return sp.getCommands()

b = palabra_det.bounds; m = 8
vb = (round(b[0] - m), round(-(b[3] + m)), round(b[2] - b[0] + 2 * m), round(b[3] - b[1] + 2 * m))
for nombre, p in (("logotipo", palabra_det), ("logotipo-chico", palabra_chico)):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]} {vb[1]} {vb[2]} {vb[3]}" width="{vb[2]}" height="{vb[3]}">'
           f'<path transform="scale(1,-1)" fill="#1a1a1a" d="{d_entero(p)}"/></svg>\n')
    open(f"{nombre}.svg", "w").write(svg)
    print(nombre, round(len(svg) / 1024, 1), "KB", "viewBox", vb)

