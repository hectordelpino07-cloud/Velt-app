"""Despieza la landing para el vídeo: página sin piezas (en franjas), cada pieza
[data-layer] sola con fondo transparente y 28 px de margen, y un JSON con posiciones.
Uso: python landing-src/capturar_piezas.py <carpeta_salida>"""
import asyncio, json, pathlib, sys
from playwright.async_api import async_playwright

raiz = pathlib.Path(__file__).resolve().parent.parent
url = (raiz / 'public' / 'landing' / 'index.html').as_uri()
salida = pathlib.Path(sys.argv[1])
salida.mkdir(parents=True, exist_ok=True)
ANCHO, ESCALA, MARGEN, FRANJA = 1440, 2, 28, 1024


async def main():
    async with async_playwright() as pw:
        nav = await pw.chromium.launch(channel='msedge')
        p = await nav.new_page(viewport={'width': ANCHO, 'height': 900}, device_scale_factor=ESCALA)
        await p.goto(url, wait_until='networkidle')
        await p.wait_for_timeout(800)
        alto = await p.evaluate('document.documentElement.scrollHeight')
        piezas = await p.evaluate('''() => [...document.querySelectorAll('[data-layer]')].map((e, i) => {
            e.dataset.idx = i;
            const r = e.getBoundingClientRect();
            return { i, tipo: e.dataset.layer, x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
        })''')

        # Cada pieza sola: todo lo demás invisible y el fondo transparente
        for pz in piezas:
            await p.evaluate('''(i) => {
                document.documentElement.style.background = 'transparent';
                document.body.style.background = 'transparent';
                for (const s of document.querySelectorAll('section, header, footer')) s.style.background = 'transparent';
                for (const e of document.querySelectorAll('body *')) e.style.visibility = 'hidden';
                const el = document.querySelector(`[data-idx="${i}"]`);
                el.style.visibility = 'visible';
                for (const d of el.querySelectorAll('*')) d.style.visibility = 'visible';
            }''', pz['i'])
            clip = {'x': pz['x'] - MARGEN, 'y': pz['y'] - MARGEN, 'width': pz['w'] + 2 * MARGEN, 'height': pz['h'] + 2 * MARGEN}
            nombre = f"pieza_{pz['i']:02d}_{pz['tipo']}.png"
            await p.screenshot(path=str(salida / nombre), clip=clip, full_page=True, omit_background=True)
            pz.update(archivo=nombre, cx=clip['x'], cy=clip['y'], cw=clip['width'], ch=clip['height'])

        # Página sin piezas
        await p.reload(wait_until='networkidle')
        await p.wait_for_timeout(800)
        await p.evaluate("document.querySelectorAll('[data-layer]').forEach(e => e.style.visibility = 'hidden')")
        franjas = []
        y = 0
        while y < alto:
            h = min(FRANJA, alto - y)
            nombre = f'base_{len(franjas):02d}.png'
            await p.screenshot(path=str(salida / nombre), clip={'x': 0, 'y': y, 'width': ANCHO, 'height': h}, full_page=True)
            franjas.append({'archivo': nombre, 'y': y, 'h': h})
            y += h
        await nav.close()

    json.dump({'ancho': ANCHO, 'alto': alto, 'escala': ESCALA, 'margen': MARGEN, 'franjas': franjas, 'piezas': piezas},
              open(salida / 'escena.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('piezas', len(piezas), 'alto', alto)


asyncio.run(main())
