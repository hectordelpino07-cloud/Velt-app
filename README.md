# VELT Escolar Â· app

Primera versiÃ³n (MVP) de VELT Escolar: la direcciÃ³n escribe una idea y VELT la convierte en tareas con responsable y fecha; cada persona del equipo la recibe y la confirma.

Un solo cÃ³digo para **web (Chrome)**, **Android** e **iOS**, hecho con Expo (React Native).

## Arrancar

```bash
npm.cmd install
npx.cmd expo start --web
```

O haz doble clic en `abrir_velt.cmd`. Se abre en http://localhost:8081. (En PowerShell usa `npx.cmd`/`npm.cmd`: tu PC tiene bloqueados los scripts `.ps1`.) Para verlo en el mÃ³vil: `npx expo start`, instala **Expo Go** en el mÃ³vil y escanea el QR (mÃ³vil y PC en la misma wifi).

## DÃ³nde estÃ¡ cada cosa

- `src/app/` pantallas: `index.tsx` (nueva idea), `seguimiento.tsx` (direcciÃ³n), `mis-tareas.tsx` (personal).
- `src/lib/parser.ts` convierte el texto en tareas (reglas, sin IA, todo en el dispositivo).
- `src/lib/store.tsx` estado de la app (de momento se guarda en el navegador).
- `src/lib/theme.ts` colores y tipografÃ­as de la marca.
- `src/data/equipo.ts` equipo de ejemplo (datos inventados).

## Limitaciones de esta versiÃ³n

- No hay servidor ni inicio de sesiÃ³n: Â«Ver comoÂ» simula cada perfil y los datos solo viven en este navegador.
- El anÃ¡lisis de la idea es por reglas: entiende Â«Necesito que X haga YÂ», Â«que alguienâ€¦Â», Â«hay queâ€¦Â», listas con guiones y Â«Nombre: tareaÂ».
