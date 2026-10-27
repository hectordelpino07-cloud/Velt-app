// Piezas de interfaz con la marca VELT (esquina cortada, sombras duras, mono)
// y el movimiento de la app (pulsar, pasar el ratón, contadores, barras).
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';
import { color, font } from '../lib/theme';
import { curva } from '../lib/motion';
import { iniciales, persona } from '../data/equipo';

const WEB = Platform.OS === 'web';

// Esquina inferior derecha cortada a 45°. En la web se recorta de verdad
// (clip-path); en el móvil un triángulo del color del fondo tapa la esquina.
export const cortado = (t: number): ViewStyle =>
  (WEB ? { clipPath: `polygon(0 0,100% 0,100% calc(100% - ${t}px),calc(100% - ${t}px) 100%,0 100%)` } : {}) as ViewStyle;

export function Esquina({ tam = 14, fondo = color.crema }: { tam?: number; fondo?: string }) {
  if (WEB) return null;
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

// Sombra dura desplazada (firma visual de VELT), con la misma esquina cortada
function SombraDura({ d, corte, tono }: { d: number; corte: number; tono: string }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tono, transform: [{ translateX: d }, { translateY: d }] }, cortado(corte)]} />;
}

export function Panel({
  children,
  bg = color.tinta,
  fondo = color.crema,
  corte = 18,
  sombra,
  tonoSombra = color.cobalto,
  style,
}: {
  children: ReactNode;
  bg?: string;
  fondo?: string;
  corte?: number;
  sombra?: number;
  tonoSombra?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[sombra ? { marginRight: sombra, marginBottom: sombra } : null, style]}>
      {sombra ? <SombraDura d={sombra} corte={corte} tono={tonoSombra} /> : null}
      <View style={[{ backgroundColor: bg, padding: 20, flexGrow: 1 }, cortado(corte)]}>
        {children}
        <Esquina tam={corte} fondo={fondo} />
      </View>
    </View>
  );
}

export function Logo({ tam = 30, claro = true, texto = true }: { tam?: number; claro?: boolean; texto?: boolean }) {
  const burbuja = claro ? color.crema : color.tinta;
  const v = claro ? color.tinta : color.crema;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Svg width={tam} height={tam} viewBox="300 310 655 670">
        <Polygon points="400,324 860,324 940,408 940,760 850,852 512,852 333,965 386,834 315,758 315,408" fill={burbuja} />
        <Polygon points="384,430 540,430 697,702 622,824" fill={v} />
        <Polygon points="719,430 871,430 716,678 642,550" fill={v} />
      </Svg>
      {texto && <Text style={{ fontFamily: font.display, fontSize: tam * 0.62, color: burbuja, letterSpacing: -0.5 }}>VELT</Text>}
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

type VarianteBoton = 'principal' | 'gris' | 'blanco' | 'tinta' | 'linea' | 'lima';

const VARIANTES: Record<VarianteBoton, { bg: string; texto: string; borde?: string }> = {
  principal: { bg: color.cobalto, texto: color.blanco },
  gris: { bg: '#E7E3D8', texto: color.tinta },
  blanco: { bg: color.crema, texto: color.tinta },
  tinta: { bg: color.tinta, texto: color.lima },
  lima: { bg: color.lima, texto: color.tinta },
  linea: { bg: 'transparent', texto: color.tinta, borde: color.tinta },
};

// Botón con vida: al pasar el ratón se levanta y deja ver su sombra dura;
// al pulsar se hunde en ella. En el móvil, se encoge un poco al tocarlo.
export function Boton({
  children,
  onPress,
  variante = 'principal',
  fondo = color.crema,
  disabled,
  pequeno,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  variante?: VarianteBoton;
  fondo?: string;
  disabled?: boolean;
  pequeno?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = VARIANTES[variante];
  const alto = useSharedValue(0);
  const escala = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: -3 * alto.value }, { translateY: -3 * alto.value }, { scale: escala.value }],
  }));
  const sombraAnim = useAnimatedStyle(() => ({ opacity: alto.value }));
  const tonoSombra = fondo === color.tinta ? color.lima : color.tinta;
  const corte = pequeno ? 8 : 10;

  return (
    <View style={[{ opacity: disabled ? 0.38 : 1 }, style]}>
      {variante !== 'linea' && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tonoSombra }, cortado(corte), sombraAnim]} />
      )}
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        onHoverIn={() => (alto.value = withTiming(1, { duration: 160 }))}
        onHoverOut={() => (alto.value = withTiming(0, { duration: 160 }))}
        onPressIn={() => {
          alto.value = withTiming(0, { duration: 80 });
          escala.value = withTiming(WEB ? 1 : 0.96, { duration: 90 });
        }}
        onPressOut={() => (escala.value = withSpring(1, { damping: 14, stiffness: 260 }))}
      >
        <Animated.View
          style={[
            s.boton,
            pequeno && s.botonPequeno,
            { backgroundColor: v.bg, borderColor: v.borde ?? v.bg },
            variante !== 'linea' && cortado(corte),
            anim,
          ]}
        >
          <Text style={[s.botonTexto, pequeno && { fontSize: 11 }, { color: v.texto }]}>{children}</Text>
          {variante !== 'linea' && <Esquina tam={corte} fondo={fondo} />}
        </Animated.View>
      </Pressable>
    </View>
  );
}

export function Chip({
  etiqueta,
  detalle,
  activo,
  destacado,
  onPress,
}: {
  etiqueta: string;
  detalle?: string;
  activo?: boolean;
  destacado?: boolean;
  onPress: () => void;
}) {
  const escala = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      onPressIn={() => (escala.value = withTiming(0.95, { duration: 80 }))}
      onPressOut={() => (escala.value = withSpring(1, { damping: 12, stiffness: 280 }))}
    >
      {({ hovered }: { hovered?: boolean; pressed: boolean }) => (
        <Animated.View style={[s.chip, (hovered || activo) && { backgroundColor: color.tinta }, anim]}>
          <Text style={[s.chipTexto, (hovered || activo) && { color: color.lima }]}>{etiqueta}</Text>
          {detalle ? (
            <Text style={[s.chipDetalle, destacado && { color: color.tinta, fontFamily: font.uiBold }, (hovered || activo) && { color: color.grisClaro }]}>
              {detalle}
            </Text>
          ) : null}
        </Animated.View>
      )}
    </Pressable>
  );
}

export function Etiqueta({ dia, hora, acento, fondo = color.blanco }: { dia: string | null; hora: string | null; acento?: boolean; fondo?: string }) {
  const texto = [dia, hora].filter(Boolean).join(' ') || 'Sin fecha';
  return (
    <View style={[s.tag, acento && { backgroundColor: color.lima }, cortado(6)]}>
      <Text style={[s.tagTexto, acento && { color: color.tinta }]}>{texto}</Text>
      <Esquina tam={6} fondo={fondo} />
    </View>
  );
}

export function Avatar({ id, tam = 34, activo }: { id: string | null; tam?: number; activo?: boolean }) {
  const p = id ? persona(id) : undefined;
  return (
    <View
      style={[
        s.avatar,
        { width: tam, height: tam, borderRadius: tam / 2 },
        !p && { backgroundColor: color.lima },
        activo && { backgroundColor: color.cobalto },
      ]}
    >
      <Text style={[s.avatarTexto, { fontSize: tam * 0.32 }, !p && { color: color.tinta }, activo && { color: color.blanco }]}>
        {p ? iniciales(p) : '?'}
      </Text>
    </View>
  );
}

// Número que sube hasta su valor (como los paneles de Linear o Stripe)
export function Contador({ valor, style }: { valor: number; style?: StyleProp<TextStyle> }) {
  const [v, setV] = useState(0);
  const anterior = useRef(0);
  useEffect(() => {
    const desde = anterior.current;
    const inicio = Date.now();
    let marco: number;
    const paso = () => {
      const p = Math.min(1, (Date.now() - inicio) / 650);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(desde + (valor - desde) * e));
      if (p < 1) marco = requestAnimationFrame(paso);
      else anterior.current = valor;
    };
    marco = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(marco);
  }, [valor]);
  return <Text style={style}>{v}</Text>;
}

// Barra de progreso por tramos que crecen al aparecer o al cambiar
export function Barra({ tramos, total, alto = 10, vacio = '#E2DDD0' }: { tramos: { valor: number; color: string }[]; total: number; alto?: number; vacio?: string }) {
  const usado = tramos.reduce((a, t) => a + t.valor, 0);
  return (
    <View style={{ flexDirection: 'row', height: alto, backgroundColor: vacio, overflow: 'hidden' }}>
      {tramos.map((t, i) => (
        <Tramo key={i} valor={total ? t.valor / total : 0} color={t.color} retraso={i * 120} />
      ))}
      <View style={{ flexGrow: Math.max(0, total - usado) / (total || 1), flexBasis: 0 }} />
    </View>
  );
}

function Tramo({ valor, color: c, retraso }: { valor: number; color: string; retraso: number }) {
  const f = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => (f.value = withTiming(valor, { duration: 700, easing: curva })), retraso);
    return () => clearTimeout(t);
  }, [valor, retraso, f]);
  const anim = useAnimatedStyle(() => ({ flexGrow: f.value }));
  return <Animated.View style={[{ flexBasis: 0, backgroundColor: c }, anim]} />;
}

const s = StyleSheet.create({
  mono: { fontFamily: font.mono, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: color.gris },
  boton: { paddingVertical: 14, paddingHorizontal: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  botonPequeno: { paddingVertical: 9, paddingHorizontal: 13 },
  botonTexto: { fontFamily: font.monoBold, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' },
  chip: { borderWidth: 2, borderColor: color.tinta, paddingVertical: 8, paddingHorizontal: 12, minWidth: 64 },
  chipTexto: { fontFamily: font.monoBold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: color.tinta },
  chipDetalle: { fontFamily: font.ui, fontSize: 11, color: color.gris, marginTop: 2 },
  tag: { backgroundColor: color.azulSuave, paddingVertical: 4, paddingHorizontal: 9, alignSelf: 'flex-start' },
  tagTexto: { fontFamily: font.monoBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: color.cobalto },
  avatar: { backgroundColor: color.azulSuave, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontFamily: font.monoBold, color: color.cobalto },
});
