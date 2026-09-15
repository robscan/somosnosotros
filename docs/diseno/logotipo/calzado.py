"""Calzado de perfil, apuntando a +x. Marco: asta x∈[-0.5, 0.5], suelo y=0, unidades del grosor del asta."""
from lt import *
import pathops

def ranura(p0, p1, w, flecha=0.0):
    d = unit((p1[0] - p0[0], p1[1] - p0[1])); n = (-d[1], d[0])
    m = ((p0[0] + p1[0]) / 2 + n[0] * flecha, (p0[1] + p1[1]) / 2 + n[1] * flecha)
    return spline([(p0[0] + n[0] * w, p0[1] + n[1] * w), (m[0] + n[0] * w, m[1] + n[1] * w), (p1[0] + n[0] * w, p1[1] + n[1] * w),
                   (p1[0] + d[0] * w, p1[1] + d[1] * w), (p1[0] - n[0] * w, p1[1] - n[1] * w), (m[0] - n[0] * w, m[1] - n[1] * w),
                   (p0[0] - n[0] * w, p0[1] - n[1] * w), (p0[0] - d[0] * w, p0[1] - d[1] * w)])

def _arriba(pierna, top):
    """Puntos de arranque (frente) y cierre (talón) según sea asta recta o pierna inclinada."""
    if pierna:
        return [(0.40, 0.95, 'l'), (0.46, 0.62, 's', -82)], [(-0.556, 0.42, 's', 96), (-0.52, 0.95, 'l')]
    return [(0.5, top, 's', -90)], [(-0.53, 0.52, 's', 90), (-0.5, top + 0.1, 'l'), (-0.5, 3.0, 'l'), (0.5, 3.0, 'l')]

def tenis(L=0.58, bota=False, pierna=False, detalle=True, separar=False):
    tx = 0.5 + L; top = 1.02 if bota else 0.78
    frente, talon = _arriba(pierna, top)
    base = spline(frente + [(0.57, 0.58), (0.5 + 0.42 * L, 0.48), (tx - 0.14, 0.43), (tx - 0.01, 0.33), (tx + 0.05, 0.18),
                            (tx + 0.04, 0.06, 's', -100), (tx - 0.05, 0.0, 'l', 180),
                            (-0.60, 0.0, 's', 180), (-0.66, 0.06, 's', 100), (-0.645, 0.22), (-0.60, 0.36)] + talon)
    if not detalle:
        return base
    # sin líneas horizontales: solo dos trazos de cordón en diagonal, y únicamente si el empeine es largo
    cortes = [ranura((0.60, 0.435), (0.645, 0.51), 0.019), ranura((0.70, 0.375), (0.745, 0.45), 0.019)] if L >= 0.45 else []
    return (base, U(*cortes)) if separar else D(base, U(*cortes))

def zapato(L=0.55, pierna=False, detalle=True, separar=False):
    tx = 0.5 + L
    frente, talon = _arriba(pierna, 0.74)
    base = spline(frente + [(0.60, 0.52), (0.5 + 0.5 * L, 0.37), (tx - 0.08, 0.27), (tx + 0.03, 0.14), (tx - 0.01, 0.04, 's', -120),
                            (tx - 0.07, 0.0, 'l', 180), (0.32, 0.0, 's', 180), (0.20, 0.11, 's', 160), (0.0, 0.155, 's', 180),
                            (-0.20, 0.15, 's', 185), (-0.24, 0.10, 's', 250), (-0.27, 0.0, 'l', -100),
                            (-0.60, 0.0, 's', 180), (-0.635, 0.12), (-0.57, 0.36)] + talon)
    if not detalle:
        return base
    return (base, pathops.Path()) if separar else base

CALZADO = [("tenis", lambda: tenis()), ("tenis de bota", lambda: tenis(bota=True)), ("zapato", lambda: zapato())]
