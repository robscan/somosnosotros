import numpy as np
import skia
from lt import *

Y0, Y1, X0, X1 = -60, 780, -250, 950
Y = np.arange(Y0, Y1)

def perfil(path):
    Wp, Hp = X1 - X0, Y1 - Y0
    surf = skia.Surface(Wp, Hp); c = surf.getCanvas(); c.clear(0x00000000)
    c.translate(-X0, Hp + Y0); c.scale(1, -1)
    c.drawPath(skpath(path), skia.Paint(AntiAlias=False, Color=0xFF000000))
    a = surf.makeImageSnapshot().toarray()[:, :, 3] > 0
    izq = np.full(Hp, np.inf); der = np.full(Hp, -np.inf)
    filas = np.nonzero(a.any(axis=1))[0]
    for r in filas:
        cols = np.nonzero(a[r])[0]
        yi = (Hp - 1 - r)
        izq[yi] = X0 + cols[0]; der[yi] = X0 + cols[-1] + 1
    return izq, der

def rel(PL, PR, y0, y1):
    m = (Y >= y0) & (Y <= y1)
    v = PR[0][m] - PL[1][m]; v = v[np.isfinite(v)]
    return v.min() if v.size else np.inf

class Espaciador:
    def __init__(self, piezas, texto="SMSNSTRS"):
        self.texto = texto
        self.mod = {ch: piezas[ch]() for ch in set(texto)}
        self.Pm = {ch: perfil(self.mod[ch]) for ch in self.mod}
        self.Po = {ch: perfil(glyph(ch)) for ch in self.mod}

    def posiciones(self, contactos=None, track=20, libre=16, cuerpo=34, cuerpo_c=12, libre_c=10):
        contactos = contactos or {}
        xs = [0.0]; notas = []
        for i in range(1, len(self.texto)):
            L, R = self.texto[i - 1], self.texto[i]
            d_cuerpo = (cuerpo_c if i in contactos else cuerpo) - rel(self.Po[L], self.Po[R], 80, 580)
            if i in contactos:
                y0, y1, g = contactos[i]
                d_c = g - rel(self.Pm[L], self.Pm[R], y0, y1)
                d_fuera = libre_c - min(rel(self.Pm[L], self.Pm[R], Y0, y0 - 1), rel(self.Pm[L], self.Pm[R], y1 + 1, Y1))
                d = max(d_c, d_fuera, d_cuerpo)
                notas.append(f"{L}{R}#{i}: contacto {'sí' if d == d_c else 'NO (lo impide ' + ('otra zona' if d == d_fuera else 'el cuerpo') + ')'} d={d:.0f} adv={adv(L)}")
            else:
                d = max(adv(L) + track, libre - rel(self.Pm[L], self.Pm[R], Y0, Y1), d_cuerpo)
                notas.append(f"{L}{R}#{i}: d={d:.0f} adv={adv(L)}")
            xs.append(xs[-1] + d)
        return xs, notas

    def palabra(self, xs):
        return U(*[xform(self.mod[ch], T(x, 0)) for ch, x in zip(self.texto, xs)])
