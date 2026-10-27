// Piezas de interfaz con la marca VELT (esquina cortada, sombras duras, mono).
import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { color, font } from '../lib/theme';
import { iniciales, persona } from '../data/equipo';

// Esquina inferior derecha cortada a 45°: un triángulo del color del fondo
// tapa la esquina. Funciona igual en web, iOS y Android.
export function Esquina({ tam = 14, fondo = color.crema }: { tam?: number; fondo?: string }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        borderLeftWidth: tam,
        borderBottomWidth: tam,
        borderLeftColor: 'transparent',
        borderBottomColor: fondo,
      }}
    />
  );
}

export function Panel({
  children,
  bg = color.tinta,
  fondo = color.crema,
  corte = 18,
  style,
}: {
  children: ReactNode;
  bg?: string;
  fondo?: string;
  corte?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ backgroundColor: bg, padding: 20 }, style]}>
      {children}
      <Esquina tam={corte} fondo={fondo} />
    </View>
  );
}

export function Logo({ tam = 30, claro = true }: { tam?: number; claro?: boolean }) {
  const burbuja = claro ? color.crema : color.tinta;
  const v = claro ? color.tinta : color.crema;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Svg width={tam} height={tam} viewBox="300 310 655 670">
        <Polygon points="400,324 860,324 940,408 940,760 850,852 512,852 333,965 386,834 315,758 315,408" fill={burbuja} />
        <Polygon points="384,430 540,430 697,702 622,824" fill={v} />
        <Polygon points="719,430 871,430 716,678 642,550" fill={v} />
      </Svg>
      <Text style={{ fontFamily: font.display, fontSize: tam * 0.62, color: burbuja, letterSpacing: -0.5 }}>VELT</Text>
    </View>
  );
}

export function Titular({ children, tam = 44, style }: { children: ReactNode; tam?: number; style?: StyleProp<TextStyle> }) {
  return (
    <Text
      style={[
        { fontFamily: font.display, fontSize: tam, lineHeight: tam * 0.95, letterSpacing: -tam * 0.025, color: color.tinta, textTransform: 'uppercase' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Mono({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.mono, style]}>{children}</Text>;
}

type VarianteBoton = 'principal' | 'gris' | 'blanco' | 'tinta' | 'linea';

export function Boton({
  children,
  onPress,
  variante = 'principal',
  fondo = color.crema,
  disabled,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  variante?: VarianteBoton;
  fondo?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = VARIANTES[variante];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.boton,
        { backgroundColor: v.bg, borderColor: v.borde ?? v.bg, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Text style={[s.botonTexto, { color: v.texto }]}>{children}</Text>
      {variante !== 'linea' && <Esquina tam={10} fondo={fondo} />}
    </Pressable>
  );
}

const VARIANTES: Record<VarianteBoton, { bg: string; texto: string; borde?: string }> = {
  principal: { bg: color.cobalto, texto: color.blanco },
  gris: { bg: '#E7E3D8', texto: color.tinta },
  blanco: { bg: color.crema, texto: color.tinta },
  tinta: { bg: color.tinta, texto: color.lima },
  linea: { bg: 'transparent', texto: color.tinta, borde: color.tinta },
};

export function Chip({ etiqueta, detalle, activo, onPress }: { etiqueta: string; detalle?: string; activo?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[s.chip, activo && { backgroundColor: color.tinta }]}>
      <Text style={[s.chipTexto, activo && { color: color.lima }]}>{etiqueta}</Text>
      {detalle ? <Text style={[s.chipDetalle, activo && { color: color.grisClaro }]}>{detalle}</Text> : null}
    </Pressable>
  );
}

export function Etiqueta({ dia, hora, acento }: { dia: string | null; hora: string | null; acento?: boolean }) {
  const texto = [dia, hora].filter(Boolean).join(' ') || 'Sin fecha';
  return (
    <View style={[s.tag, acento && { backgroundColor: color.lima }]}>
      <Text style={[s.tagTexto, acento && { color: color.tinta }]}>{texto}</Text>
      <Esquina tam={6} fondo={color.blanco} />
    </View>
  );
}

export function Avatar({ id, tam = 34 }: { id: string | null; tam?: number }) {
  const p = id ? persona(id) : undefined;
  return (
    <View style={[s.avatar, { width: tam, height: tam, borderRadius: tam / 2 }, !p && { backgroundColor: color.lima }]}>
      <Text style={[s.avatarTexto, !p && { color: color.tinta }]}>{p ? iniciales(p) : '?'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  mono: { fontFamily: font.mono, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: color.gris },
  boton: { paddingVertical: 14, paddingHorizontal: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  botonTexto: { fontFamily: font.monoBold, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' },
  chip: { borderWidth: 2, borderColor: color.tinta, paddingVertical: 8, paddingHorizontal: 12, minWidth: 64 },
  chipTexto: { fontFamily: font.monoBold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: color.tinta },
  chipDetalle: { fontFamily: font.ui, fontSize: 11, color: color.gris, marginTop: 2 },
  tag: { backgroundColor: color.azulSuave, paddingVertical: 4, paddingHorizontal: 9, alignSelf: 'flex-start' },
  tagTexto: { fontFamily: font.monoBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: color.cobalto },
  avatar: { backgroundColor: color.azulSuave, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontFamily: font.monoBold, fontSize: 11, color: color.cobalto },
});
