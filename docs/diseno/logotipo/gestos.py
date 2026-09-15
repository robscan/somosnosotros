"""Manos con dedos independientes: cada dedo tiene base, ángulo, largo, grosor y curvatura.
Marco local: x de -0.5 (lado de la palma/meñique) a +0.5 (lado del pulgar); y desde la muñeca (0) hacia la punta de los dedos."""
import math, random

def _u(v):
    L = math.hypot(*v) or 1.0; return (v[0] / L, v[1] / L)
def _ang(v): return math.degrees(math.atan2(v[1], v[0]))
def _rot(v, deg):
    r = math.radians(deg); c, s = math.cos(r), math.sin(r)
    return (v[0] * c - v[1] * s, v[0] * s + v[1] * c)

def dedo(bx, by, a, L, h, curl=0.0, taper=0.12):
    """a: grados desde +y hacia +x. Devuelve puntos del contorno: base izquierda → punta → base derecha."""
    d = (math.sin(math.radians(a)), math.cos(math.radians(a)))
    dt = _rot(d, -curl)
    B = (bx, by); M = (bx + d[0] * L * 0.5, by + d[1] * L * 0.5); Tp = (bx + dt[0] * L, by + dt[1] * L)
    def P(t): return ((1-t)**2 * B[0] + 2*(1-t)*t * M[0] + t*t * Tp[0], (1-t)**2 * B[1] + 2*(1-t)*t * M[1] + t*t * Tp[1])
    def Tg(t): return _u((2*(1-t) * (M[0]-B[0]) + 2*t * (Tp[0]-M[0]), 2*(1-t) * (M[1]-B[1]) + 2*t * (Tp[1]-M[1])))
    def lado(t, s):
        c = P(t); tg = Tg(t); nl = (-tg[1], tg[0]); hh = h * (1 - taper * t)
        return (c[0] + s * nl[0] * hh, c[1] + s * nl[1] * hh), tg, nl
    if L < 2.2 * h:   # nudillo de dedo doblado
        (l0, tg0, nl0) = lado(0, 1); (r0, _, _) = lado(0, -1)
        c = (B[0] + d[0] * L, B[1] + d[1] * L)
        return [(l0[0], l0[1], 's', _ang(d)), (c[0], c[1], 's', _ang((-nl0[0], -nl0[1]))), (r0[0], r0[1], 's', _ang((-d[0], -d[1])))]
    ts = 1 - (h * 0.95) / L
    out = []
    for t in (0.0, 0.5, ts):
        p, tg, nl = lado(t, 1); out.append((p[0], p[1], 's', _ang(tg)))
    c = P(ts); tg = Tg(ts); nl = (-tg[1], tg[0]); hh = h * (1 - taper * ts)
    out.append((c[0] + tg[0] * hh, c[1] + tg[1] * hh, 's', _ang((-nl[0], -nl[1]))))
    for t in (ts, 0.5, 0.0):
        p, tg, nl = lado(t, -1); out.append((p[0], p[1], 's', _ang((-tg[0], -tg[1]))))
    return out

GROSOR = (0.92, 1.0, 1.07, 1.05, 1.0)

def mano(digitos, inicio=(-0.50, 0.10), extra=(), valle=0.03, semilla=None, azar=0.0, kL=1.0, kb=1.0, kh=1.0):
    """digitos: lista de (bx, by, a, L, h[, curl]) del meñique al pulgar. azar: variación orgánica (0–1)."""
    rnd = random.Random(semilla)
    pts = [inicio]
    prev = None
    for i, f in enumerate(digitos):
        bx, by, a, L, h = f[:5]; curl = f[5] if len(f) > 5 else 0.0
        h *= kh * (GROSOR[i] if len(digitos) == 5 else 1.0)
        if azar:
            L *= 1 + rnd.uniform(-0.06, 0.06) * azar; a += rnd.uniform(-4, 4) * azar
            by += rnd.uniform(-0.015, 0.015) * azar; curl += rnd.uniform(-5, 5) * azar
        if L >= 2.2 * h: L *= kL
        by *= kb
        fp = dedo(bx, by, a, L, h, curl)
        if prev is not None:
            pr = prev[-1]; nx = fp[0]
            pts.append(((pr[0] + nx[0]) / 2, min(pr[1], nx[1]) - valle, 'c'))
        pts += fp; prev = fp
    pts += list(extra)
    return pts

# ---- Repertorio ----
def relajada(semilla=1, azar=1.0, kL=1.0, kb=1.0, kh=1.12):
    return mano([(-0.375, 0.27, -3, 0.44, 0.108, 6), (-0.125, 0.31, -1, 0.54, 0.112, 5),
                 (0.125, 0.32, 1, 0.57, 0.112, 4), (0.37, 0.30, 3, 0.50, 0.11, 3),
                 (0.52, 0.12, 30, 0.30, 0.115, -8)], semilla=semilla, azar=azar, kL=kL, kb=kb, kh=kh)

def alzada(semilla=2, azar=0.6, kL=1.0, kb=1.0, kh=1.12):
    return mano([(-0.375, 0.26, -8, 0.45, 0.108), (-0.125, 0.31, -3, 0.56, 0.112),
                 (0.125, 0.32, 2, 0.59, 0.112), (0.37, 0.29, 7, 0.52, 0.11),
                 (0.52, 0.14, 42, 0.34, 0.118, 8)], semilla=semilla, azar=azar, kL=kL, kb=kb, kh=kh)

def saludo(semilla=3, azar=0.5, kL=1.0, kb=1.0, kh=1.12):
    return mano([(-0.37, 0.24, -26, 0.42, 0.104), (-0.13, 0.30, -10, 0.54, 0.108),
                 (0.11, 0.32, 4, 0.58, 0.108), (0.35, 0.29, 18, 0.50, 0.106),
                 (0.52, 0.12, 52, 0.34, 0.128, 8)], semilla=semilla, azar=azar, kL=kL, kb=kb, kh=kh)

def pulgar_arriba(semilla=4, azar=0.0, kL=1.0, kb=1.0, kh=1.0):
    """Puño de frente: los dedos doblados asoman como cuatro bultos en el lado de la palma y el pulgar sube arriba."""
    return [(-0.50, 0.03, 's', 90),
            (-0.555, 0.075), (-0.56, 0.135), (-0.515, 0.17, 'c'),
            (-0.565, 0.21), (-0.565, 0.275), (-0.52, 0.31, 'c'),
            (-0.565, 0.35), (-0.56, 0.415), (-0.515, 0.45, 'c'),
            (-0.55, 0.49), (-0.44, 0.565), (-0.18, 0.585), (0.00, 0.57, 'c'),
            (0.03, 0.72, 's', 88), (0.07, 0.86), (0.18, 0.925), (0.29, 0.86), (0.32, 0.72, 's', -92), (0.33, 0.60),
            (0.47, 0.50), (0.53, 0.30, 's', -90)]

def senala(semilla=5, azar=0.4, kL=1.0, kb=1.0, kh=1.12):
    return mano([(-0.39, 0.30, -6, 0.12, 0.12), (-0.16, 0.36, -2, 0.13, 0.12), (0.07, 0.38, 0, 0.13, 0.12),
                 (0.31, 0.36, 2, 0.66, 0.115), (0.53, 0.14, 35, 0.22, 0.12)], inicio=(-0.52, 0.10), semilla=semilla, azar=azar, kL=kL, kb=kb, kh=kh)

def paz(semilla=6, azar=0.4, kL=1.0, kb=1.0, kh=1.12):
    return mano([(-0.39, 0.30, -6, 0.12, 0.12), (-0.16, 0.36, -2, 0.13, 0.12),
                 (0.06, 0.37, -7, 0.64, 0.11), (0.30, 0.35, 17, 0.60, 0.11),
                 (0.53, 0.14, 35, 0.22, 0.12)], inicio=(-0.52, 0.10), semilla=semilla, azar=azar, kL=kL, kb=kb, kh=kh)

def te_quiero(semilla=7, azar=0.4, kL=1.0, kb=1.0, kh=1.12):
    return mano([(-0.38, 0.28, -6, 0.44, 0.105), (-0.14, 0.36, -3, 0.13, 0.12), (0.08, 0.38, 0, 0.13, 0.12),
                 (0.31, 0.35, 8, 0.62, 0.11), (0.52, 0.13, 60, 0.38, 0.128, 6)], semilla=semilla, azar=azar, kL=kL, kb=kb, kh=kh)

REPERTORIO = [("relajada", relajada), ("relajada 2", lambda: relajada(11)), ("alzada", alzada), ("saludo", saludo),
              ("pulgar arriba", pulgar_arriba), ("señala", senala), ("paz", paz), ("te quiero", te_quiero)]
