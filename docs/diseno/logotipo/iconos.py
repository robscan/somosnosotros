"""Favicon (SN liso) e iconos de instalación (SN dibujado del logotipo), en tinta sobre el hueso de la app."""
import math, struct, os
import skia
from lt import *
from piezas6 import construir, CONTACTOS
from espaciado2 import EspaciadorOrden

E = EspaciadorOrden(construir(True)); xs, _ = E.posiciones(CONTACTOS)
det = E.mod
SN_LISO = U(glyph("S"), xform(glyph("N"), T(xs[3] - xs[2], 0)))
SN_DIBUJO = U(det[2], xform(det[3], T(xs[3] - xs[2], 0)))
TINTA, HUESO = 0xFF1A1A1A, 0xFFF6F5F1

def lienzo(px, path, relleno=0.12, radio=0.0, seguro=None):
    surf = skia.Surface(px, px); c = surf.getCanvas(); c.clear(0x00000000)
    pb = skia.Paint(AntiAlias=True, Color=HUESO)
    if radio > 0:
        c.drawRRect(skia.RRect.MakeRectXY(skia.Rect.MakeWH(px, px), px * radio, px * radio), pb)
    else:
        c.drawRect(skia.Rect.MakeWH(px, px), pb)
    x0, y0, x1, y1 = path.bounds; w, h = x1 - x0, y1 - y0
    s = seguro * px / math.hypot(w, h) if seguro else min(px * (1 - 2 * relleno) / w, px * (1 - 2 * relleno) / h)
    cy = ((y0 + y1) / 2 + (-12 + 672) / 2) / 2   # centro óptico: entre la caja completa y la altura de las letras
    c.save(); c.translate(px / 2 - (x0 + x1) / 2 * s, px / 2 + cy * s); c.scale(s, -s)
    c.drawPath(skpath(path), skia.Paint(AntiAlias=True, Color=TINTA)); c.restore()
    return surf.makeImageSnapshot()

def png(img, ruta=None):
    datos = bytes(img.encodeToData())
    if ruta:
        open(ruta, "wb").write(datos)
    return datos

os.makedirs("salida", exist_ok=True)
capas = [(t, png(lienzo(t, SN_LISO, relleno=0.08 if t <= 32 else 0.10, radio=0.2))) for t in (16, 32, 48)]
cab = struct.pack("<HHH", 0, 1, len(capas)); off = 6 + 16 * len(capas); ent = b""; dat = b""
for t, d in capas:
    ent += struct.pack("<BBBBHHII", t, t, 0, 0, 1, 32, len(d), off + len(dat)); dat += d
open("salida/favicon.ico", "wb").write(cab + ent + dat)
png(lienzo(180, SN_DIBUJO, relleno=0.16), "salida/apple-touch-icon.png")
png(lienzo(192, SN_DIBUJO, relleno=0.16, radio=0.22), "salida/icono-192.png")
png(lienzo(512, SN_DIBUJO, relleno=0.16, radio=0.22), "salida/icono-512.png")
png(lienzo(512, SN_DIBUJO, seguro=0.76), "salida/icono-maskable-512.png")
for f in sorted(os.listdir("salida")):
    print(f, os.path.getsize("salida/" + f), "bytes")

# Hoja de revisión: pestañas clara y oscura con 16/32 a tamaño real y ampliados; inicio de iPhone; icono adaptable con su círculo seguro
W, H = 1320, 520
surf = skia.Surface(W, H); c = surf.getCanvas(); c.clear(0xFFFFFFFF)
cerca = skia.SamplingOptions(skia.FilterMode.kNearest); suave = skia.SamplingOptions(skia.FilterMode.kLinear)
for k, fondo in enumerate((0xFFDEE1E6, 0xFF35363A)):
    oy = 10 + k * 255
    c.drawRect(skia.Rect.MakeXYWH(10, oy, 300, 245), skia.Paint(Color=fondo))
    x = 24
    for t in (16, 32, 48):
        im = skia.Image.MakeFromEncoded(skia.Data.MakeWithCopy(dict(capas)[t]))
        c.drawImage(im, x, oy + 14)
        c.drawImageRect(im, skia.Rect.MakeXYWH(x, oy + 70, t * 3 if t < 48 else 96, t * 3 if t < 48 else 96), cerca)
        x += (t * 3 if t < 48 else 96) + 16
c.drawRect(skia.Rect.MakeXYWH(330, 10, 560, 500), skia.Paint(Color=0xFF5E7B8C))
apple = skia.Image.MakeFromEncoded(skia.Data.MakeWithCopy(open("salida/apple-touch-icon.png", "rb").read()))
c.save(); c.clipRRect(skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(370, 60, 180, 180), 40, 40), True); c.drawImage(apple, 370, 60); c.restore()
for i in range(4):
    c.save(); c.clipRRect(skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(590 + (i % 2) * 80, 60 + (i // 2) * 80, 60, 60), 13, 13), True)
    if i == 0:
        c.drawImageRect(apple, skia.Rect.MakeXYWH(590, 60, 60, 60), suave)
    else:
        c.drawRect(skia.Rect.MakeXYWH(590 + (i % 2) * 80, 60 + (i // 2) * 80, 60, 60), skia.Paint(Color=[0xFFE9B949, 0xFF3A8D5C, 0xFFD9534F][i - 1]))
    c.restore()
mask = skia.Image.MakeFromEncoded(skia.Data.MakeWithCopy(open("salida/icono-maskable-512.png", "rb").read()))
c.drawImageRect(mask, skia.Rect.MakeXYWH(910, 10, 400, 400), suave)
c.drawCircle(1110, 210, 160, skia.Paint(AntiAlias=True, Color=0xFFB3261E, Style=skia.Paint.kStroke_Style, StrokeWidth=2))
c.save(); c.clipRRect(skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(370, 300, 180, 180), 90, 90), True)
c.drawImageRect(mask, skia.Rect.MakeXYWH(370, 300, 180, 180), suave); c.restore()
surf.makeImageSnapshot().save("iconos-revision.png", skia.kPNG)
print("revisión lista")
