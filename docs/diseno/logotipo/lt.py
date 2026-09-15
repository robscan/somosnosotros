"""Herramientas de lettering: glifos reales, curvas suaves, operaciones booleanas y render."""
import math
import pathops
import skia
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.basePen import BasePen
from fontTools.pens.transformPen import TransformPen

FONT = TTFont("bricolage-logo.ttf")
GS = FONT.getGlyphSet()
CMAP = FONT.getBestCmap()
CAP = 660

def glyph(ch):
    p = pathops.Path()
    GS[CMAP[ord(ch)]].draw(p.getPen())
    return p

def adv(ch):
    return GS[CMAP[ord(ch)]].width

# Afines (a, b, c, d, e, f): x' = a x + c y + e ; y' = b x + d y + f
I = (1, 0, 0, 1, 0, 0)
def mul(m, n):
    a, b, c, d, e, f = m; A, B, C, D, E, F = n
    return (a*A + c*B, b*A + d*B, a*C + c*D, b*C + d*D, a*E + c*F + e, b*E + d*F + f)
def chain(*ms):
    out = I
    for m in ms:
        out = mul(out, m)
    return out
def T(dx, dy): return (1, 0, 0, 1, dx, dy)
def S(sx, sy=None): return (sx, 0, 0, sx if sy is None else sy, 0, 0)
def R(deg):
    r = math.radians(deg)
    return (math.cos(r), math.sin(r), -math.sin(r), math.cos(r), 0, 0)
def FX(): return (-1, 0, 0, 1, 0, 0)
def ap(m, x, y):
    a, b, c, d, e, f = m
    return (a*x + c*y + e, b*x + d*y + f)

def xform(path, m):
    out = pathops.Path()
    path.draw(TransformPen(out.getPen(), m))
    return out

def spline(pts, m=I, k=1.15):
    """Contorno cerrado suave. pts: (x, y[, tipo[, angulo]]); tipo 's' suave, 'c' esquina, 'l' recta hasta el siguiente.
    Con un cuarto valor se fuerza la dirección de la tangente (grados)."""
    n = len(pts)
    P = [(p[0], p[1]) for p in pts]
    K = [p[2] if len(p) > 2 else 's' for p in pts]
    A = [p[3] if len(p) > 3 else None for p in pts]
    def unit(dx, dy):
        L = math.hypot(dx, dy) or 1.0
        return (dx / L, dy / L)
    def tan(i):
        if A[i] is not None:
            r = math.radians(A[i]); return (math.cos(r), math.sin(r))
        if K[i] == 'c':
            return None
        pr, nx = P[(i - 1) % n], P[(i + 1) % n]
        if K[(i - 1) % n] == 'l':
            return unit(P[i][0] - pr[0], P[i][1] - pr[1])
        if K[i] == 'l':
            return unit(nx[0] - P[i][0], nx[1] - P[i][1])
        return unit(nx[0] - pr[0], nx[1] - pr[1])
    Tg = [tan(i) for i in range(n)]
    path = pathops.Path()
    path.moveTo(*ap(m, *P[0]))
    for i in range(n):
        j = (i + 1) % n
        p0, p1 = P[i], P[j]
        if K[i] == 'l':
            path.lineTo(*ap(m, *p1)); continue
        L = math.hypot(p1[0] - p0[0], p1[1] - p0[1]) * k / 3
        c1 = p0 if Tg[i] is None else (p0[0] + Tg[i][0] * L, p0[1] + Tg[i][1] * L)
        c2 = p1 if Tg[j] is None else (p1[0] - Tg[j][0] * L, p1[1] - Tg[j][1] * L)
        path.cubicTo(*ap(m, *c1), *ap(m, *c2), *ap(m, *p1))
    path.close()
    return path

def U(*paths):
    out = pathops.Path()
    for p in paths:
        out = pathops.op(out, p, pathops.PathOp.UNION)
    return out
def D(a, b): return pathops.op(a, b, pathops.PathOp.DIFFERENCE)
def X(a, b): return pathops.op(a, b, pathops.PathOp.INTERSECTION)

def rect(x0, y0, x1, y1):
    p = pathops.Path(); p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x1, y1); p.lineTo(x0, y1); p.close(); return p

def poly(pts, m=I):
    p = pathops.Path(); p.moveTo(*ap(m, *pts[0]))
    for q in pts[1:]: p.lineTo(*ap(m, *q))
    p.close(); return p

def svg_d(path):
    sp = SVGPathPen(None)
    path.draw(sp)
    return sp.getCommands()

class _SkPen(BasePen):
    def __init__(self):
        super().__init__(None); self.p = skia.Path()
    def _moveTo(self, pt): self.p.moveTo(*pt)
    def _lineTo(self, pt): self.p.lineTo(*pt)
    def _curveToOne(self, a, b, c): self.p.cubicTo(*a, *b, *c)
    def _qCurveToOne(self, a, b): self.p.quadTo(*a, *b)
    def _closePath(self): self.p.close()
    def _endPath(self): pass

def skpath(path):
    pen = _SkPen(); path.draw(pen); return pen.p

def render(items, out, px_h=700, pad=30, grid=None, bbox=None, bg=0xFFFFFFFF, marks=(), max_w=None, guides=True):
    """items: [(pathops.Path, color)]; marks: [(x, y, etiqueta)] en unidades."""
    if bbox is None:
        bs = [p.bounds for p, _ in items if p.bounds]
        bbox = (min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs))
    x0, y0, x1, y1 = bbox
    s = (px_h - 2 * pad) / (y1 - y0)
    Wpx = int((x1 - x0) * s + 2 * pad)
    if max_w and Wpx > max_w:
        s = (max_w - 2 * pad) / (x1 - x0); Wpx = max_w; px_h = int((y1 - y0) * s + 2 * pad)
    surf = skia.Surface(Wpx, px_h)
    c = surf.getCanvas(); c.clear(bg)
    c.save(); c.translate(pad - x0 * s, px_h - pad + y0 * s); c.scale(s, -s)
    thin = skia.Paint(AntiAlias=True, Color=0xFFDDDDDD, StrokeWidth=1 / s, Style=skia.Paint.kStroke_Style)
    if grid:
        gx = math.floor(x0 / grid) * grid
        while gx <= x1:
            c.drawLine(gx, y0, gx, y1, thin); gx += grid
        gy = math.floor(y0 / grid) * grid
        while gy <= y1:
            c.drawLine(x0, gy, x1, gy, thin); gy += grid
    if guides:
        g = skia.Paint(AntiAlias=True, Color=0xFFB3261E, StrokeWidth=1.2 / s, Style=skia.Paint.kStroke_Style)
        c.drawLine(x0, 0, x1, 0, g); c.drawLine(x0, CAP, x1, CAP, g)
    for p, col in items:
        c.drawPath(skpath(p), skia.Paint(AntiAlias=True, Color=col))
    c.restore()
    if marks:
        font = skia.Font(None, 13)
        dot = skia.Paint(AntiAlias=True, Color=0xFF1F6FEB)
        for x, y, lab in marks:
            px = pad + (x - x0) * s; py = px_h - pad - (y - y0) * s
            c.drawCircle(px, py, 3.5, dot)
            c.drawString(str(lab), px + 5, py - 5, font, dot)
    surf.makeImageSnapshot().save(out, skia.kPNG)
    return s

class _Flat(BasePen):
    def __init__(self, step=3.0):
        super().__init__(None); self.contours = []; self.cur = None; self.step = step
    def _add(self, fn, n):
        for i in range(1, n + 1):
            self.cur.append(fn(i / n))
    def _moveTo(self, p):
        self.cur = [tuple(p)]; self.contours.append(self.cur)
    def _lineTo(self, p):
        a = self.cur[-1]; n = max(1, int(math.dist(a, p) / self.step))
        self._add(lambda t: (a[0] + (p[0] - a[0]) * t, a[1] + (p[1] - a[1]) * t), n)
    def _qCurveToOne(self, c, p):
        a = self.cur[-1]; n = max(2, int((math.dist(a, c) + math.dist(c, p)) / self.step))
        self._add(lambda t: ((1-t)**2*a[0] + 2*(1-t)*t*c[0] + t*t*p[0], (1-t)**2*a[1] + 2*(1-t)*t*c[1] + t*t*p[1]), n)
    def _curveToOne(self, c1, c2, p):
        a = self.cur[-1]; n = max(3, int((math.dist(a, c1) + math.dist(c1, c2) + math.dist(c2, p)) / self.step))
        self._add(lambda t: ((1-t)**3*a[0] + 3*(1-t)**2*t*c1[0] + 3*(1-t)*t*t*c2[0] + t**3*p[0],
                             (1-t)**3*a[1] + 3*(1-t)**2*t*c1[1] + 3*(1-t)*t*t*c2[1] + t**3*p[1]), n)
    def _closePath(self):
        a = self.cur[-1]; p = self.cur[0]
        n = max(1, int(math.dist(a, p) / self.step))
        for i in range(1, n):
            t = i / n; self.cur.append((a[0] + (p[0] - a[0]) * t, a[1] + (p[1] - a[1]) * t))
    def _endPath(self): pass

def flatten(path, step=3.0):
    f = _Flat(step); path.draw(f); return f.contours

def unit(v):
    L = math.hypot(*v) or 1.0; return (v[0] / L, v[1] / L)
def nearest(pts, q, lo=0, hi=None):
    hi = len(pts) if hi is None else hi
    return min(range(lo, hi), key=lambda k: math.dist(pts[k], q))
