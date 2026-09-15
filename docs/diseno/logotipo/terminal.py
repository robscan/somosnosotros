"""Manos en línea: el remate se recorta y termina en dedos cortos y un pulgar hacia fuera."""
from lt import *

# x: -0.5 lado palma (interior) … +0.5 lado pulgar (exterior); y: 0 en la línea de recorte, dedos hacia +y
DEDOS = [(-0.505, 0.22), (-0.49, 0.42), (-0.40, 0.56), (-0.29, 0.48), (-0.255, 0.33, 'c'),
         (-0.235, 0.58), (-0.125, 0.68), (-0.02, 0.58), (0.005, 0.36, 'c'),
         (0.03, 0.62), (0.14, 0.72), (0.245, 0.60), (0.27, 0.36, 'c'),
         (0.295, 0.58), (0.40, 0.66), (0.50, 0.50), (0.51, 0.34), (0.50, 0.24, 'c'),
         (0.62, 0.36), (0.76, 0.44), (0.84, 0.34), (0.74, 0.14)]

def mano_linea(A, B, tA, tB, puntos=DEDOS, flex=0.0, escala=1.0):
    """A: punto del lado del pulgar en la línea de recorte; B: lado de la palma. tA, tB: tangentes hacia fuera."""
    O = ((A[0] + B[0]) / 2, (A[1] + B[1]) / 2); W = math.dist(A, B)
    t = unit((tA[0] + tB[0], tA[1] + tB[1]))
    v = (A[0] - O[0], A[1] - O[1]); d = v[0] * t[0] + v[1] * t[1]
    nrm = unit((v[0] - d * t[0], v[1] - d * t[1]))
    if flex:
        r = math.radians(flex); c, s = math.cos(r), math.sin(r)
        # gira el eje de la mano hacia el lado del pulgar
        t2 = (t[0] * c + nrm[0] * s, t[1] * c + nrm[1] * s)
        n2 = (nrm[0] * c - t[0] * s, nrm[1] * c - t[1] * s)
        t, nrm = t2, n2
    def w(x, y):
        return (O[0] + (x * nrm[0] + y * escala * t[0]) * W, O[1] + (x * nrm[1] + y * escala * t[1]) * W)
    ins = 0.08
    bB = (B[0] - tB[0] * 30 + (O[0] - B[0]) * ins, B[1] - tB[1] * 30 + (O[1] - B[1]) * ins)
    bA = (A[0] - tA[0] * 30 + (O[0] - A[0]) * ins, A[1] - tA[1] * 30 + (O[1] - A[1]) * ins)
    ang = lambda v: math.degrees(math.atan2(v[1], v[0]))
    c = [(bB[0], bB[1], 'l'), (B[0], B[1], 's', ang(tB))]
    for p in puntos:
        x, y = w(p[0], p[1])
        if len(p) > 3:
            a = math.radians(p[3]); dx, dy = math.cos(a), math.sin(a)
            wx, wy = dx * nrm[0] + dy * t[0], dx * nrm[1] + dy * t[1]
            c.append((x, y, p[2], math.degrees(math.atan2(wy, wx))))
        else:
            c.append((x, y, p[2]) if len(p) > 2 else (x, y))
    c += [(A[0], A[1], 'l', ang((-tA[0], -tA[1]))), (bA[0], bA[1], 'l')]
    return spline(c)

def terminal_curvo(original, A0, B0, fin_interior, retro, pulgar_fuera=True):
    """Geometría del remate de una letra curva, calculada sobre el contorno original (orden fijo)."""
    pts = flatten(original)[0]; n = len(pts)
    iA0 = nearest(pts, A0); iB0 = nearest(pts, B0); iF = nearest(pts, fin_interior)
    k = iA0; acc = 0.0
    while acc < retro:
        acc += math.dist(pts[k % n], pts[(k - 1) % n]); k -= 1
    kA = k % n; A = pts[kA]
    tA = unit((pts[(kA + 1) % n][0] - pts[(kA - 1) % n][0], pts[(kA + 1) % n][1] - pts[(kA - 1) % n][1]))
    cand = []; j = iB0
    while j != iF:
        cand.append(j); j = (j + 1) % n
    kB = min(cand, key=lambda q: math.dist(pts[q], A)); B = pts[kB]
    tB = unit((pts[(kB - 1) % n][0] - pts[(kB + 1) % n][0], pts[(kB - 1) % n][1] - pts[(kB + 1) % n][1]))
    O = ((A[0] + B[0]) / 2, (A[1] + B[1]) / 2)
    cola = []; j = kA
    while True:
        p = pts[j]; q0 = pts[(j - 1) % n]; q1 = pts[(j + 1) % n]
        tg = unit((q1[0] - q0[0], q1[1] - q0[1])); nn = (-tg[1], tg[0])
        if nn[0] * (p[0] - O[0]) + nn[1] * (p[1] - O[1]) < 0: nn = (-nn[0], -nn[1])
        cola.append((p[0] + nn[0] * 6, p[1] + nn[1] * 6))
        if j == kB: break
        j = (j + 1) % n
    if pulgar_fuera:
        return A, B, tA, tB, poly(cola)
    return B, A, tB, tA, poly(cola)

def dedos(n=4, largos=(0.50, 0.60, 0.62, 0.56), base=0.26, hueco=0.045, pulgar=1.0):
    """Mano de dedos cortos con lados paralelos y puntas redondas. Orden: palma (-x) → dedos → pulgar (+x)."""
    fw = (1.0 - hueco * (n - 1)) / n; r = fw / 2
    pts = [(-0.50, 0.12)]
    for i in range(n):
        x0 = -0.5 + i * (fw + hueco); x1 = x0 + fw; cx = (x0 + x1) / 2; L = largos[i]
        if i > 0:
            pts.append((x0, base + 0.07, 's', 90))
        pts += [(x0, L - r * 0.95, 's', 90), (cx, L), (x1, L - r * 0.95, 's', -90)]
        if i < n - 1:
            pts += [(x1, base + 0.07, 's', -90), (x1 + hueco / 2, base, 'c')]
    p = pulgar
    pts += [(0.50, base + 0.02, 's', -90), (0.50, 0.20, 'c'),
            (0.50 + 0.10 * p, 0.28), (0.50 + 0.22 * p, 0.31), (0.50 + 0.27 * p, 0.21), (0.50 + 0.17 * p, 0.05)]
    return pts

D4 = dedos(4)
D3 = dedos(3, largos=(0.54, 0.64, 0.58), hueco=0.06)

def dedos2(n=4, largos=(0.50, 0.60, 0.62, 0.56), base=0.26, hueco=0.045):
    """Como dedos(), con el pulgar saliendo de una curva continua (sin escalón)."""
    fw = (1.0 - hueco * (n - 1)) / n; r = fw / 2
    pts = [(-0.50, 0.12)]
    for i in range(n):
        x0 = -0.5 + i * (fw + hueco); x1 = x0 + fw; cx = (x0 + x1) / 2; L = largos[i]
        if i > 0:
            pts.append((x0, base + 0.07, 's', 90))
        pts += [(x0, L - r * 0.95, 's', 90), (cx, L), (x1, L - r * 0.95, 's', -90)]
        if i < n - 1:
            pts += [(x1, base + 0.07, 's', -90), (x1 + hueco / 2, base, 'c')]
    pts += [(0.50, 0.26, 's', -90), (0.535, 0.16, 's', 0), (0.60, 0.22, 's', 55),
            (0.68, 0.34), (0.745, 0.395), (0.805, 0.33), (0.77, 0.17, 's', -110), (0.64, 0.02)]
    return pts

def pulgar(bc=(0.44, -0.02), ang=40, largo=0.30, hb=0.16, rt=0.115):
    """Pulgar como lóbulo grueso: nace bajo el índice, se abre 'ang' grados hacia fuera y termina redondo."""
    a = math.radians(ang); ax = (math.sin(a), math.cos(a)); pe = (math.cos(a), -math.sin(a))
    tc = (bc[0] + ax[0] * largo, bc[1] + ax[1] * largo)
    t_in = (tc[0] - pe[0] * rt, tc[1] - pe[1] * rt)
    t_end = (tc[0] + ax[0] * rt, tc[1] + ax[1] * rt)
    t_out = (tc[0] + pe[0] * rt, tc[1] + pe[1] * rt)
    b_in = (bc[0] - pe[0] * hb, bc[1] - pe[1] * hb)
    b_out = (bc[0] + pe[0] * hb, bc[1] + pe[1] * hb)
    k = (0.5 - b_in[0]) / (t_in[0] - b_in[0]); cy = b_in[1] + k * (t_in[1] - b_in[1])
    eje = math.degrees(math.atan2(ax[1], ax[0]))
    m_in = ((0.5 + t_in[0]) / 2, (cy + t_in[1]) / 2)
    m_out = ((b_out[0] + t_out[0]) / 2, max(0.03, (b_out[1] + t_out[1]) / 2))
    return cy, [(0.5, cy, 'c'), (m_in[0], m_in[1], 's', eje), t_in, t_end, t_out, (m_out[0], m_out[1], 's', eje + 180)]

def dedos3(n=4, largos=(0.50, 0.60, 0.62, 0.56), base=0.26, hueco=0.045, **kw_pulgar):
    fw = (1.0 - hueco * (n - 1)) / n; r = fw / 2
    pts = [(-0.50, 0.12)]
    for i in range(n):
        x0 = -0.5 + i * (fw + hueco); x1 = x0 + fw; cx = (x0 + x1) / 2; L = largos[i]
        if i > 0:
            pts.append((x0, base + 0.07, 's', 90))
        pts += [(x0, L - r * 0.95, 's', 90), (cx, L), (x1, L - r * 0.95, 's', -90)]
        if i < n - 1:
            pts += [(x1, base + 0.07, 's', -90), (x1 + hueco / 2, base, 'c')]
    cy, th = pulgar(**kw_pulgar)
    return pts + th

def extremidad(A, B, tA, tB, pose, doblez=0.0, largo=0.0, muneca=1.0):
    """Brazo que nace en la línea A–B, se curva 'doblez' grados hacia el lado del pulgar a lo largo de 'largo' anchos
    y termina en la mano 'pose' (lista de puntos, o (puntos, cortes) con tajos en coordenadas locales)."""
    from calzado import ranura
    pts, cortes = pose if isinstance(pose, tuple) else (pose, [])
    ang = lambda v: math.degrees(math.atan2(v[1], v[0]))
    O = ((A[0] + B[0]) / 2, (A[1] + B[1]) / 2); W0 = math.dist(A, B)
    t0 = unit((tA[0] + tB[0], tA[1] + tB[1]))
    v = (A[0] - O[0], A[1] - O[1]); dd = v[0] * t0[0] + v[1] * t0[1]
    n0 = unit((v[0] - dd * t0[0], v[1] - dd * t0[1]))
    beta = math.radians(doblez); s = largo * W0
    if s > 0 and abs(beta) > 1e-6:
        Rr = s / beta
        O1 = (O[0] + t0[0] * Rr * math.sin(beta) + n0[0] * Rr * (1 - math.cos(beta)),
              O[1] + t0[1] * Rr * math.sin(beta) + n0[1] * Rr * (1 - math.cos(beta)))
    else:
        O1 = (O[0] + t0[0] * s, O[1] + t0[1] * s)
    t1 = (t0[0] * math.cos(beta) + n0[0] * math.sin(beta), t0[1] * math.cos(beta) + n0[1] * math.sin(beta))
    n1 = (n0[0] * math.cos(beta) - t0[0] * math.sin(beta), n0[1] * math.cos(beta) - t0[1] * math.sin(beta))
    W1 = W0 * muneca
    P1 = (O[0] + t0[0] * s / 3, O[1] + t0[1] * s / 3); P2 = (O1[0] - t1[0] * s / 3, O1[1] - t1[1] * s / 3)
    def C(u): return tuple((1-u)**3 * O[k] + 3*(1-u)**2*u * P1[k] + 3*(1-u)*u*u * P2[k] + u**3 * O1[k] for k in (0, 1))
    def Tg(u): return unit(tuple(3*(1-u)**2 * (P1[k]-O[k]) + 6*(1-u)*u * (P2[k]-P1[k]) + 3*u*u * (O1[k]-P2[k]) for k in (0, 1)))
    sg = 1 if (t0[0] * n0[1] - t0[1] * n0[0]) > 0 else -1
    def Nn(tg): return (-tg[1] * sg, tg[0] * sg)
    ladoB, ladoA = [], []
    if s > 0:
        for u in (0.35, 0.7):
            c = C(u); tg = Tg(u); nn = Nn(tg); w = W0 + (W1 - W0) * u
            ladoB.append((c[0] - nn[0] * w / 2, c[1] - nn[1] * w / 2, 's', ang(tg)))
            ladoA.append((c[0] + nn[0] * w / 2, c[1] + nn[1] * w / 2, 's', ang((-tg[0], -tg[1]))))
    def w(x, y): return (O1[0] + (x * n1[0] + y * t1[0]) * W1, O1[1] + (x * n1[1] + y * t1[1]) * W1)
    ins = 0.08
    bB = (B[0] - tB[0] * 30 + (O[0] - B[0]) * ins, B[1] - tB[1] * 30 + (O[1] - B[1]) * ins)
    bA = (A[0] - tA[0] * 30 + (O[0] - A[0]) * ins, A[1] - tA[1] * 30 + (O[1] - A[1]) * ins)
    c = [(bB[0], bB[1], 'l'), (B[0], B[1], 's', ang(tB))] + ladoB
    if s > 0:
        B1 = w(-0.5, 0); c.append((B1[0], B1[1], 's', ang(t1)))
    for p in pts:
        x, y = w(p[0], p[1])
        if len(p) > 3:
            a = math.radians(p[3]); dx, dy = math.cos(a), math.sin(a)
            c.append((x, y, p[2], ang((dx * n1[0] + dy * t1[0], dx * n1[1] + dy * t1[1]))))
        else:
            c.append((x, y, p[2]) if len(p) > 2 else (x, y))
    if s > 0:
        A1 = w(0.5, 0); c.append((A1[0], A1[1], 's', ang((-t1[0], -t1[1]))))
    c += list(reversed(ladoA)) + [(A[0], A[1], 'l', ang((-tA[0], -tA[1]))), (bA[0], bA[1], 'l')]
    forma = spline(c)
    for p0, p1, ww in cortes:
        forma = D(forma, ranura(w(*p0), w(*p1), ww * W1))
    return forma
