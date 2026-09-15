"""Borrador 3: señas distintas, brazos que se doblan, tenis y zapatos. detalle=False da la versión para tamaños chicos."""
from lt import *
from terminal import terminal_curvo, extremidad
import gestos as G
from calzado import tenis, zapato

S_TERM = {"alto": ((388, 447), (249, 429), (204, 555)), "bajo": ((25, 235), (167, 254), (210, 100))}

def construir(detalle=True):
    kh = 1.12 if detalle else 1.35
    K = dict(kL=0.72, kb=0.85, kh=kh)
    def pie(fn, cx, W, **kw):
        M = chain(T(cx, 0), S(W))
        if detalle:
            forma, corte = fn(detalle=True, separar=True, **kw)
            return xform(forma, M), xform(corte, M)
        return xform(fn(detalle=False, **kw), M), None
    def calzar(g, *pies):
        g = U(g, *[f for f, _ in pies])
        cortes = [c for _, c in pies if c is not None]
        return D(g, U(*cortes)) if cortes else g
    def S_con(alto, bajo):
        orig = glyph("S"); g = orig
        for clave, cfg in (("alto", alto), ("bajo", bajo)):
            A0, B0, F = S_TERM[clave]
            A, B, tA, tB, cola = terminal_curvo(orig, A0, B0, F, cfg.get("retro", 40))
            g = U(D(g, cola), extremidad(A, B, tA, tB, cfg["pose"], cfg.get("doblez", 0), cfg.get("largo", 0), cfg.get("muneca", 1.0)))
        return g
    def S1(): return S_con(dict(pose=G.relajada(1, **K), doblez=6, largo=0.15),
                           dict(pose=G.saludo(kL=0.9, kh=kh), retro=55, doblez=46, largo=0.5, muneca=0.9))
    def S2(): return S_con(dict(pose=G.relajada(12, **K), doblez=4, largo=0.12),
                           dict(pose=G.pulgar_arriba(), retro=45, doblez=8, largo=0.15, muneca=0.9))
    def S3(): return S_con(dict(pose=G.relajada(21, **K), doblez=6, largo=0.15),
                           dict(pose=G.alzada(**K), retro=45, doblez=10, largo=0.15, muneca=0.92))
    def S4(): return S_con(dict(pose=G.senala(kh=kh), retro=80, doblez=50, largo=0.7, muneca=0.95),
                           dict(pose=G.te_quiero(kL=0.78, kb=0.85, kh=kh), retro=45, doblez=10, largo=0.15, muneca=0.92))
    def M_(): return calzar(glyph("M"), pie(tenis, 92.5, 145, L=0.30), pie(tenis, 539.5, 145, L=0.52))
    def N_(yt=590):
        g = D(glyph("N"), rect(310, yt, 470, 680))
        g = U(g, extremidad((315, yt), (460, yt), (0, 1), (0, 1), G.paz(kh=kh), doblez=6, largo=0.2))
        return calzar(g, pie(zapato, 93, 146), pie(zapato, 387.5, 145, L=0.50))
    def T_():
        g = U(glyph("T"), rect(370, 535, 400, 660), rect(-25, 535, 5, 660))
        g = U(g, extremidad((-25, 535), (80, 535), (0, -1), (0, -1), G.relajada(31, kL=0.85, kh=kh), doblez=14, largo=0.22),
              extremidad((400, 535), (295, 535), (0, -1), (0, -1), G.relajada(41, kL=0.85, kh=kh), doblez=14, largo=0.22))
        return calzar(g, pie(tenis, 188, 154, L=0.58, bota=True))
    def R_(): return calzar(glyph("R"), pie(tenis, 97, 154, L=0.38), pie(tenis, 338, 152, L=0.48, pierna=True))
    return [("S", S1), ("M", M_), ("S", S2), ("N", N_), ("S", S3), ("T", T_), ("R", R_), ("S", S4)]

CONTACTOS = {3: (380, 470, -3), 5: (420, 560, -3), 6: (420, 560, -3)}
