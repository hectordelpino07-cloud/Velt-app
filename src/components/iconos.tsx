// Iconos de línea para la navegación (trazos de Lucide, licencia ISC).
// Un solo grosor y tamaño en toda la app; nunca emojis como iconos.
import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type NombreIcono = 'hoy' | 'idea' | 'horarios' | 'mapa' | 'material' | 'seguimiento' | 'tareas' | 'equipo' | 'mas' | 'avisos' | 'ajustes';

const TRAZOS: Record<NombreIcono, (c: string) => ReactNode> = {
  hoy: () => (
    <>
      <Path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <Path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </>
  ),
  idea: () => (
    <>
      <Path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <Path d="M9 18h6" />
      <Path d="M10 22h4" />
    </>
  ),
  horarios: () => (
    <>
      <Rect x={3} y={4} width={18} height={18} rx={2} />
      <Path d="M16 2v4" />
      <Path d="M8 2v4" />
      <Path d="M3 10h18" />
    </>
  ),
  mapa: () => (
    <>
      <Path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
      <Path d="M15 5.764v15" />
      <Path d="M9 3.236v15" />
    </>
  ),
  material: () => (
    <>
      <Path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <Path d="m3.3 7 8.7 5 8.7-5" />
      <Path d="M12 22V12" />
    </>
  ),
  seguimiento: () => <Path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />,
  tareas: () => (
    <>
      <Rect x={3} y={3} width={18} height={18} rx={2} />
      <Path d="m9 12 2 2 4-4" />
    </>
  ),
  equipo: () => (
    <>
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx={9} cy={7} r={4} />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  mas: (c) => (
    <>
      <Circle cx={12} cy={12} r={1} fill={c} />
      <Circle cx={19} cy={12} r={1} fill={c} />
      <Circle cx={5} cy={12} r={1} fill={c} />
    </>
  ),
  avisos: () => (
    <>
      <Path d="M10.268 21a2 2 0 0 0 3.464 0" />
      <Path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
    </>
  ),
  ajustes: () => (
    <>
      <Path d="M21 4h-7" />
      <Path d="M10 4H3" />
      <Path d="M21 12h-9" />
      <Path d="M8 12H3" />
      <Path d="M21 20h-5" />
      <Path d="M12 20H3" />
      <Path d="M14 2v4" />
      <Path d="M8 10v4" />
      <Path d="M16 18v4" />
    </>
  ),
};

// Ruta → icono, para la barra lateral, la barra de abajo y la hoja «Más»
export const ICONO_RUTA: Record<string, NombreIcono> = {
  '/': 'hoy',
  '/idea': 'idea',
  '/horarios': 'horarios',
  '/centro': 'mapa',
  '/material': 'material',
  '/seguimiento': 'seguimiento',
  '/mis-tareas': 'tareas',
  '/equipo': 'equipo',
  '/avisos': 'avisos',
  '/configurar': 'ajustes',
};

export function Icono({ nombre, color, tam = 22 }: { nombre: NombreIcono; color: string; tam?: number }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden importantForAccessibility="no">
      {TRAZOS[nombre](color)}
    </Svg>
  );
}
