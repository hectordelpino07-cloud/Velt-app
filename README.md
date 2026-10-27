# VELT Escolar · app

Primera versión (MVP) de VELT Escolar: la dirección escribe una idea y VELT la convierte en tareas con responsable y fecha; cada persona del equipo la recibe y la confirma.

Un solo código para **web (Chrome)**, **Android** e **iOS**, hecho con Expo (React Native).

## Arrancar

```bash
npm install
npx expo start --web
```

Se abre en http://localhost:8081. Para verlo en el móvil: `npx expo start`, instala **Expo Go** en el móvil y escanea el QR (móvil y PC en la misma wifi).

## Dónde está cada cosa

- `src/app/` pantallas: `index.tsx` (nueva idea), `seguimiento.tsx` (dirección), `mis-tareas.tsx` (personal).
- `src/lib/parser.ts` convierte el texto en tareas (reglas, sin IA, todo en el dispositivo).
- `src/lib/store.tsx` estado de la app (de momento se guarda en el navegador).
- `src/lib/theme.ts` colores y tipografías de la marca.
- `src/data/equipo.ts` equipo de ejemplo (datos inventados).

## Limitaciones de esta versión

- No hay servidor ni inicio de sesión: «Ver como» simula cada perfil y los datos solo viven en este navegador.
- El análisis de la idea es por reglas: entiende «Necesito que X haga Y», «que alguien…», «hay que…», listas con guiones y «Nombre: tarea».
