# VELT Escolar · app

MVP de VELT Escolar: la capa de coordinación diaria del equipo de un centro educativo (dirección, profesorado, conserjería y secretaría). Complementa a Séneca y PASEN; no guarda datos de alumnos.

Un solo código para **web (Chrome)**, **Android** e **iOS**, hecho con Expo (React Native).

**Versión web publicada:** https://hectordelpino07-cloud.github.io/Velt-app/ (se actualiza sola con cada cambio en `main`).

## Qué hace

- **Hoy:** parte del día de dirección, avisos (clases sin cubrir, material averiado) y lo próximo por fecha.
- **Nueva idea:** dirección escribe una idea y VELT la convierte en tareas con responsable, fecha y hora; solo pregunta lo que falta.
- **Mapa del centro:** qué aula está libre, dónde está cada persona en cada hora, ausencias y guardias, reservas y «reproducir el día».
- **Material:** inventario con ubicación, préstamos y averías (avisa a conserjería).
- **Seguimiento:** estado de las tareas, carga del equipo y respuesta a dudas.
- **Mis tareas:** la vista del personal: recibir, deslizar para confirmar y marcar como hecha.
- **Configurar centro:** plantas y aulas, jornada (mañana, tarde o ambas), personal con su turno y horarios.

## Arrancar en el PC

Doble clic en `abrir_velt.cmd`, o en la terminal:

```bash
npm.cmd install
npx.cmd expo start --web
```

Se abre en http://localhost:8081. En PowerShell hay que usar `npx.cmd` y `npm.cmd` porque este PC tiene bloqueados los scripts `.ps1`. Para verlo en el móvil, instala **Expo Go** y escanea el QR de la terminal (móvil y PC en la misma red).

## Comprobar el código

```bash
npm.cmd run comprobar
```

Ejecuta el revisor de tipos (TypeScript) y el de estilo (ESLint).

## Dónde está cada cosa

- `src/app/` pantallas (cada archivo es una ruta).
- `src/components/` piezas de interfaz (`ui.tsx`) y de movimiento (`motion.tsx`).
- `src/lib/store.tsx` tareas; `src/lib/centro.tsx` configuración del centro (jornada, personal, espacios, horarios, material).
- `src/lib/parser.ts` convierte el texto de una idea en tareas (reglas, sin IA, todo en el dispositivo).
- `src/lib/fechas.ts` fechas reales de las tareas («Hoy», «Jue 30», «Con retraso»).
- `src/data/` datos de ejemplo (inventados).

## Limitaciones de esta versión

- No hay servidor ni inicio de sesión: «Ver como» simula cada perfil y los datos solo viven en cada navegador.
- El análisis de la idea es por reglas: entiende «Necesito que X haga Y», «que alguien…», «hay que…», listas con guiones y «Nombre: tarea».
