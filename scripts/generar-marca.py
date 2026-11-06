"""Genera los archivos de marca de .anclaje (SVG con texto en trazos + PNG).

Uso: python scripts/generar-marca.py <Inter-SemiBold.ttf> docs/marca
Necesita fonttools y pymupdf. Inter: https://fonts.google.com/specimen/Inter
"""
import os
import sys

import fitz  # PyMuPDF
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

FONT, OUT = sys.argv[1], sys.argv[2]

GOLD = "#fcc107"
INK = "#426f64"
INK_DARK = "#8fc4b5"
TEXT = "#2a2833"
TEXT_DARK = "#ece8e2"
CREAM = "#faf7f2"
NIGHT = "#16151b"
WHITE = "#ffffff"

font = TTFont(FONT)
gs = font.getGlyphSet()
cmap = font.getBestCmap()
UPM = font["head"].unitsPerEm
XH = font["OS/2"].sxHeight
CAP = font["OS/2"].sCapHeight
DESC = 494  # descender de Inter (para la "j")
TRACK = -0.025 * UPM


def kern_pairs():
    """Kerning simple desde la tabla GPOS (pares de glifos, formato 1 y 2)."""
    pairs = {}
    if "GPOS" not in font:
        return pairs
    gpos = font["GPOS"].table
    for lookup in gpos.LookupList.Lookup:
        if lookup.LookupType not in (2, 9):
            continue
        for st in lookup.SubTable:
            if lookup.LookupType == 9:
                st = st.ExtSubTable
            if getattr(st, "LookupType", 2) != 2 and lookup.LookupType == 9 and st.LookupType != 2:
                continue
            cov = st.Coverage.glyphs
            if st.Format == 1:
                for i, first in enumerate(cov):
                    for pvr in st.PairSet[i].PairValueRecord:
                        v = pvr.Value1.XAdvance if pvr.Value1 and hasattr(pvr.Value1, "XAdvance") else 0
                        if v:
                            pairs.setdefault((first, pvr.SecondGlyph), v)
            elif st.Format == 2:
                c1 = st.ClassDef1.classDefs
                c2 = st.ClassDef2.classDefs
                for first in cov:
                    k1 = c1.get(first, 0)
                    rec = st.Class1Record[k1]
                    for second, k2 in list(c2.items()) + []:
                        v1 = rec.Class2Record[k2].Value1
                        v = v1.XAdvance if v1 and hasattr(v1, "XAdvance") else 0
                        if v:
                            pairs.setdefault((first, second), v)
    return pairs


KERN = kern_pairs()


def text_paths(text, colors):
    """Devuelve [(d, color)] y el ancho, en unidades de fuente (y hacia abajo, base en 0)."""
    x = 0
    out = []
    prev = None
    for ch, color in zip(text, colors):
        g = cmap[ord(ch)]
        if prev:
            x += KERN.get((prev, g), 0)
        pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, (1, 0, 0, -1, x, 0)))
        out.append((pen.getCommands(), color))
        x += gs[g].width + TRACK
        prev = g
    return out, x - TRACK


LH = [
    ('<path d="M26.5 15 L32 9 L37.5 15 Z" fill="{c}" stroke="{c}" stroke-width="1.2" stroke-linejoin="round"/>'),
    ('<circle cx="32" cy="20.2" r="4.6" fill="' + GOLD + '"/>'),
    ('<rect x="24" y="26" width="16" height="2.8" rx="1.4" fill="{c}"/>'),
    ('<path d="M26.6 30.6 H37.4 L38.8 40 H25.2 Z" fill="{c}" stroke="{c}" stroke-width="1" stroke-linejoin="round"/>'),
    ('<path d="M24.7 43.2 H39.3 L40.9 54 H23.1 Z" fill="{c}" stroke="{c}" stroke-width="1" stroke-linejoin="round"/>'),
    ('<path d="M12 58.5 Q17 55.5 22 58.5 T32 58.5 T42 58.5 T52 58.5" fill="none" stroke="{c}" stroke-width="2.6" stroke-linecap="round"/>'),
]


def lighthouse(c, transform=""):
    body = "".join(p.replace("{c}", c) for p in LH)
    return f'<g transform="{transform}">{body}</g>' if transform else body


def svg(w, h, body, bg=None, radius=0):
    rect = f'<rect width="{w:.2f}" height="{h:.2f}" rx="{radius}" fill="{bg}"/>' if bg else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {h:.2f}" '
        f'width="{w:.2f}" height="{h:.2f}">{rect}{body}</svg>'
    )


def wordmark_body(text_color, size, ox, baseline):
    paths, width = text_paths(".anclaje", [GOLD] + [text_color] * 7)
    s = size / UPM
    body = "".join(
        f'<path d="{d}" fill="{c}" transform="translate({ox:.2f} {baseline:.2f}) scale({s:.5f})"/>'
        for d, c in paths
    )
    return body, width * s


def wordmark(text_color, bg=None, size=200):
    pad = size * 0.3
    _, w = wordmark_body(text_color, size, 0, 0)
    asc = CAP / UPM * size  # la "l" llega un poco más que la mayúscula; usamos ascendente aprox.
    asc = 1.08 * asc
    desc = DESC / UPM * size
    W, H = w + 2 * pad, asc + desc + 2 * pad
    body, _ = wordmark_body(text_color, size, pad, pad + asc)
    return svg(W, H, body, bg)


def lockup(text_color, mark_color, bg=None, size=200):
    """Faro (1,45 em) + separación (0,32 em) + nombre, centrados en la altura x."""
    pad = size * 0.35
    mark = 1.45 * size
    gap = 0.32 * size
    _, w = wordmark_body(text_color, size, 0, 0)
    H = mark + 2 * pad
    xh = XH / UPM * size
    baseline = pad + mark / 2 + xh / 2  # centro de la altura x = centro del faro
    # El dibujo del faro ocupa de x=10,7 a x=53,3 en su grilla de 64: la separación se mide desde ahí.
    k = mark / 64
    left, right = 10.7 * k, 53.3 * k
    mx = pad - left
    tx = mx + right + gap
    W = tx + w + pad
    body = lighthouse(mark_color, f"translate({mx:.2f} {pad:.2f}) scale({k:.5f})")
    text, _ = wordmark_body(text_color, size, tx, baseline)
    return svg(W, H, body + text, bg)


def stacked(text_color, mark_color, bg=None, size=200):
    """Faro arriba y nombre abajo, centrados (para perfiles y piezas cuadradas)."""
    _, w = wordmark_body(text_color, size, 0, 0)
    mark = 2.4 * size
    pad = size * 0.45
    asc = 1.08 * CAP / UPM * size
    W = max(w, mark) + 2 * pad
    H = pad + mark + size * 0.25 + asc + DESC / UPM * size + pad
    mx = (W - mark) / 2
    body = lighthouse(mark_color, f"translate({mx:.2f} {pad:.2f}) scale({mark / 64:.5f})")
    text, _ = wordmark_body(text_color, size, (W - w) / 2, pad + mark + size * 0.25 + asc)
    return svg(W, H, body + text, bg)


def isotipo(mark_color, bg=None, radius=0, inset=0.13, size=1024):
    m = size * (1 - 2 * inset)
    o = size * inset
    return svg(size, size, lighthouse(mark_color, f"translate({o:.2f} {o:.2f}) scale({m / 64:.5f})"), bg, radius)


def write(rel, content, png_widths=(1200,)):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path + ".svg", "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
    doc = fitz.open(stream=content.encode("utf-8"), filetype="svg")
    page = doc[0]
    for i, w in enumerate(png_widths):
        zoom = w / page.rect.width
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=True)
        suffix = "" if i == 0 else f"-{w}"
        pix.save(path + suffix + ".png")


VARIANTS = [
    # nombre, texto, faro, fondo
    ("color", TEXT, INK, None),
    ("para-fondo-oscuro", TEXT_DARK, INK_DARK, None),
    ("blanco", WHITE, WHITE, None),
]
BACKGROUNDS = [
    ("sobre-crema", TEXT, INK, CREAM),
    ("sobre-noche", TEXT_DARK, INK_DARK, NIGHT),
    ("sobre-verde", WHITE, WHITE, INK),
]

for name, t, m, bg in VARIANTS + BACKGROUNDS:
    write(f"1-logo-completo/anclaje-logo-{name}", lockup(t, m, bg), (2000, 600))
    write(f"2-logo-vertical/anclaje-logo-vertical-{name}", stacked(t, m, bg), (1200,))
    write(f"3-logotipo-solo-nombre/anclaje-nombre-{name}", wordmark(t, bg), (1600, 400))

for name, m, bg in [
    ("color", INK, None),
    ("para-fondo-oscuro", INK_DARK, None),
    ("blanco", WHITE, None),
]:
    write(f"4-isotipo-faro/anclaje-faro-{name}", isotipo(m, bg, inset=0.04), (1024, 256, 64))

write("5-iconos-y-perfil/icono-app", isotipo(INK, CREAM, radius=225, inset=0.13), (1024, 512, 180))
write("5-iconos-y-perfil/perfil-redes-crema", isotipo(INK, CREAM, inset=0.16), (1080,))
write("5-iconos-y-perfil/perfil-redes-verde", isotipo(WHITE, INK, inset=0.16), (1080,))
write("5-iconos-y-perfil/perfil-redes-noche", isotipo(INK_DARK, NIGHT, inset=0.16), (1080,))
print("listo")
