# VELT Escolar · app

Primera versión (MVP) de VELT Escolar: la dirección escribe una idea y VELT la convierte en tareas con responsable y fecha; cada persona del equipo la recibe y la confirma.

Un solo código para **web (Chrome)**, **Android** e **iOS**, hecho con Expo (React Native).

## Arrancar

Doble clic en `abrir_velt.cmd`, o en la terminal:

```bash
npm.cmd install
npx.cmd expo start --web
```

Se abre en http://localhost:8081. En PowerShell hay que usar `npx.cmd` y `npm.cmd` porque este PC tiene bloqueados los scripts `.ps1`.

Para verlo en el móvil: instala **Expo Go** y escanea el QR que sale en la terminal (móvil y PC en la misma red).

## Dónde está cada cosa

- `src/app/` pantallas: `index.tsx` (nueva idea), `seguimiento.tsx` (dirección), `mis-tareas.tsx` (personal).
- `src/lib/parser.ts` convierte el texto en tareas (reglas, sin IA, todo en el dispositivo).
- `src/lib/store.tsx` estado de la app (de momento se guarda en el navegador).
- `src/lib/theme.ts` colores y tipografías de la marca.
- `src/data/equipo.ts` equipo de ejemplo (datos inventados).

## Limitaciones de esta versión

- No hay servidor ni inicio de sesión: «Ver como» simula cada perfil y los datos solo viven en este navegador.
- El análisis de la idea es por reglas: entiende «Necesito que X haga Y», «que alguien…», «hay que…», listas con guiones y «Nombre: tarea».
