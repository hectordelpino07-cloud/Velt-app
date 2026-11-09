"""Capturas reales de la app para la landing (sin datos de alumnos; equipo de ejemplo inventado).
Uso: python landing-src/capturar_app.py  → guarda PNG en public/landing/img/"""
import asyncio, os
from playwright.async_api import async_playwright

BASE = 'https://hectordelpino07-cloud.github.io/Velt-app'
SALIDA = os.path.join(os.path.dirname(__file__), '..', 'public', 'landing', 'img')
os.makedirs(SALIDA, exist_ok=True)


async def abrir(ctx, ruta):
    p = await ctx.new_page()
    await p.goto(BASE + ruta, wait_until='networkidle')
    await p.wait_for_timeout(2600)  # la entrada animada dura ~2 s
    return p


async def main():
    async with async_playwright() as pw:
        nav = await pw.chromium.launch(channel='msedge')
        esc = await nav.new_context(viewport={'width': 1440, 'height': 1000}, device_scale_factor=2)
        # Datos limpios de ejemplo
        p = await abrir(esc, '/')
        await p.evaluate('localStorage.clear()')
        await p.close()

        p = await abrir(esc, '/')
        await p.screenshot(path=os.path.join(SALIDA, 'hoy.png'))
        await p.close()

        p = await abrir(esc, '/centro')
        await p.screenshot(path=os.path.join(SALIDA, 'mapa.png'))
        await p.close()

        p = await abrir(esc, '/idea')
        await p.get_by_text('Claustro del jueves').click()
        await p.wait_for_timeout(2600)
        await p.screenshot(path=os.path.join(SALIDA, 'idea.png'))
        await p.close()

        p = await abrir(esc, '/material')
        await p.screenshot(path=os.path.join(SALIDA, 'material.png'))
        await p.close()

        movil = await nav.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
        p = await abrir(movil, '/mis-tareas')
        await p.evaluate('localStorage.clear()')
        await p.reload(wait_until='networkidle')
        await p.wait_for_timeout(2600)
        await p.screenshot(path=os.path.join(SALIDA, 'movil-tareas.png'))
        await p.close()
        await nav.close()


asyncio.run(main())
print('ok')
