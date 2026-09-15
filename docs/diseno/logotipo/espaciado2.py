"""Espaciado medido sobre el contorno real, con una pieza distinta por posición."""
import numpy as np
from lt import *
from espaciado import perfil, rel, Y0, Y1

class EspaciadorOrden:
    def __init__(self, orden):
        self.base = [ch for ch, _ in orden]
        self.mod = [fn() for _, fn in orden]
        self.Pm = [perfil(p) for p in self.mod]
        self.Po = {ch: perfil(glyph(ch)) for ch in set(self.base)}

    def posiciones(self, contactos=None, track=20, libre=22, cuerpo=34, cuerpo_c=12, libre_c=18):
        contactos = contactos or {}
        xs = [0.0]; notas = []
        for i in range(1, len(self.mod)):
            L, R = self.base[i - 1], self.base[i]
            d_cuerpo = (cuerpo_c if i in contactos else cuerpo) - rel(self.Po[L], self.Po[R], 80, 580)
            if i in contactos:
                y0, y1, g = contactos[i]
                d_c = g - rel(self.Pm[i - 1], self.Pm[i], y0, y1)
                d_fuera = libre_c - min(rel(self.Pm[i - 1], self.Pm[i], Y0, y0 - 1), rel(self.Pm[i - 1], self.Pm[i], y1 + 1, Y1))
                d = max(d_c, d_fuera, d_cuerpo)
                notas.append(f"{L}{R}#{i}: contacto {'sí' if d == d_c else 'no'} d={d:.0f}")
            else:
                d = max(adv(L) + track, libre - rel(self.Pm[i - 1], self.Pm[i], Y0, Y1), d_cuerpo)
                notas.append(f"{L}{R}#{i}: d={d:.0f} (avance {adv(L)})")
            xs.append(xs[-1] + d)
        return xs, notas

    def palabra(self, xs):
        return U(*[xform(p, T(x, 0)) for p, x in zip(self.mod, xs)])
