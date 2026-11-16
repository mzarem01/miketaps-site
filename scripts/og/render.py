"""Render the link-preview images (public/og/*.jpg, 1200x630).

These are the pictures that show up when someone pastes a miketaps.com link into
LinkedIn, Discord, iMessage and so on. They only change when a section's name or
blurb changes, so they're committed rather than built on every release.

Run from the repo root after `npm run build` (needs Python with Playwright, Chromium and Pillow):
    python scripts/og/render.py
"""
import http.server
import json
import re
import socketserver
import threading
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / "dist"
OUT = ROOT / "public" / "og"

# Kept in step with src/data/sections.ts by reading it.
src = (ROOT / "src" / "data" / "sections.ts").read_text(encoding="utf-8")
SECTIONS = []
for block in re.findall(r"\{[^{}]*slug: '[^{}]*\}", src):
    get = lambda k: re.search(rf"{k}:\s*'((?:[^'\\]|\\.)*)'", block).group(1).replace("\\'", "'")
    SECTIONS.append({"slug": get("slug"), "name": get("name"), "blurb": get("blurb"), "accent": get("accent")})

MONO = """<svg viewBox="-42 -40 84 84" width="96" height="96">
<path d="M-38,35H38" stroke="#a3364a" stroke-width="3" stroke-linecap="round"/>
<polyline points="-34,24 -34,-26 -17,0 0,-26 0,24" fill="none" stroke="#d4ad5a" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M0,-26H36M18,-26V24" fill="none" stroke="#d4ad5a" stroke-width="5.5" stroke-linecap="round"/>
<g fill="#6e1e28" stroke="#d4ad5a" stroke-width="2.2"><circle cx="-34" cy="24" r="5"/><circle cx="0" cy="24" r="5"/><circle cx="18" cy="24" r="5"/><circle cx="36" cy="-26" r="5"/></g></svg>"""


def font(name):
    return next(DIST.glob(f"_astro/{name}-latin-wght-normal.*.woff2")).name


CARD = """<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:F;src:url(/_astro/%(fraunces)s);font-weight:100 900}
@font-face{font-family:S;src:url(/_astro/%(sans)s);font-weight:200 900}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:radial-gradient(ellipse at 75%% 20%%,#3a1c21 0,#161112 65%%);color:#f2e9dc;font-family:S;padding:72px 84px;display:flex;flex-direction:column;position:relative;overflow:hidden}
.top{display:flex;align-items:center;gap:22px}
.brand{font-family:F;font-weight:600;font-size:44px}
.eyebrow{margin-top:auto;font-family:ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;font-size:22px;color:#c7baac}
h1{font-family:F;font-weight:600;font-size:104px;line-height:1;margin:14px 0 22px}
p{font-size:34px;line-height:1.3;color:#c7baac;max-width:960px}
.bar{position:absolute;left:0;right:0;bottom:0;height:14px;background:linear-gradient(90deg,#6e1e28 0 70%%,#c29b45 70%% 100%%)}
.dot{display:inline-block;width:14px;height:14px;border-radius:50%%;background:%(accent)s;margin-right:12px;vertical-align:middle}
</style></head><body>
<div class="top">%(mono)s<span class="brand">MikeTaps</span></div>
<div class="eyebrow"><span class="dot"></span>miketaps.com/%(slug)s</div>
<h1>%(name)s</h1><p>%(blurb)s</p><div class="bar"></div></body></html>"""


class Quiet(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(DIST), **kw)

    def log_message(self, *a):
        pass


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    httpd = socketserver.TCPServer(("127.0.0.1", 0), Quiet)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{port}"
    tmp = DIST / "_og-card.html"
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            page = b.new_page(viewport={"width": 1200, "height": 630})
            for s in SECTIONS:
                tmp.write_text(CARD % {**s, "mono": MONO, "fraunces": font("fraunces"), "sans": font("source-sans-3")}, encoding="utf-8")
                page.goto(f"{base}/_og-card.html?{s['slug']}")
                page.evaluate("document.fonts.ready")
                shot = OUT / f"{s['slug']}.png"
                page.screenshot(path=str(shot))
                Image.open(shot).convert("RGB").save(OUT / f"{s['slug']}.jpg", quality=86, optimize=True)
                shot.unlink()
                print("wrote", s["slug"])
            # Homepage: the room itself, at night, cropped to fill the card.
            page = b.new_page(viewport={"width": 1400, "height": 1000}, device_scale_factor=2, color_scheme="dark")
            page.goto(f"{base}/")
            page.evaluate("document.fonts.ready")
            page.wait_for_timeout(800)
            shot = OUT / "home.png"
            page.locator(".scene").first.screenshot(path=str(shot))
            room = Image.open(shot).convert("RGB")
            w = 1200
            h = round(room.height * w / room.width)
            room = room.resize((w, h), Image.LANCZOS)
            top = max(0, (h - 630) // 2)
            room.crop((0, top, w, top + 630)).save(OUT / "home.jpg", quality=86, optimize=True)
            shot.unlink()
            print("wrote home")
            b.close()
    finally:
        tmp.unlink(missing_ok=True)
        httpd.shutdown()


if __name__ == "__main__":
    main()
