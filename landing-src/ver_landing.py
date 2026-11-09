"""Captura la landing a 1440 y 390 de ancho para revisarla."""
import asyncio, os, pathlib, sys
from playwright.async_api import async_playwright

raiz = pathlib.Path(__file__).resolve().parent.parent
url = (raiz / 'public' / 'landing' / 'index.html').as_uri()
salida = pathlib.Path(sys.argv[1])
salida.mkdir(parents=True, exist_ok=True)


async def main():
    async with async_playwright() as pw:
        nav = await pw.chromium.launch(channel='msedge')
        for ancho, alto, nombre in ((1440, 900, 'escritorio'), (390, 844, 'movil')):
            p = await nav.new_page(viewport={'width': ancho, 'height': alto}, device_scale_factor=1)
            await p.goto(url, wait_until='networkidle')
            await p.wait_for_timeout(800)
            await p.screenshot(path=str(salida / f'{nombre}.png'), full_page=True)
            h = await p.evaluate('document.documentElement.scrollHeight')
            sobra = await p.evaluate('document.documentElement.scrollWidth > innerWidth')
            print(nombre, 'alto', h, 'desborda' if sobra else 'sin desborde')
        await nav.close()


asyncio.run(main())
