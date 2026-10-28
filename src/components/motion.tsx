// Piezas con movimiento propio: titulares que suben desde una máscara,
// la entrada de la app con el logo y el control de deslizar para confirmar.
import { useEffect, useRef, useState } from 'react';
import { AccessibilityActionEvent, LayoutChangeEvent, PanResponder, StyleProp, StyleSheet, Text, TextStyle, View } from 'react-native';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { curva, vibra } from '../lib/motion';
import { color, font } from '../lib/theme';
import { cortado, Logo } from './ui';

// Titular que entra línea a línea, subiendo desde detrás de una máscara
export function TitularRevela({
  texto,
  tam = 44,
  retraso = 0,
  style,
}: {
  texto: string;
  tam?: number;
  retraso?: number;
  style?: StyleProp<TextStyle>;
}) {
  const lineas = texto.split('\n');
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={texto.replace(/\n/g, ' ')}>
      {lineas.map((l, i) => (
        <Linea key={`${l}-${i}`} texto={l} tam={tam} retraso={retraso + i * 90} style={style} />
      ))}
    </View>
  );
}

function Linea({ texto, tam, retraso, style }: { texto: string; tam: number; retraso: number; style?: StyleProp<TextStyle> }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(retraso, withTiming(1, { duration: 820, easing: curva }));
  }, [p, retraso]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - p.value) * tam * 1.1 }] }));
  return (
    <View style={{ overflow: 'hidden', paddingBottom: tam * 0.06 }}>
      <Animated.Text
        style={[
          { fontFamily: font.display, fontSize: tam, lineHeight: tam * 0.95, letterSpacing: -tam * 0.025, color: color.tinta, textTransform: 'uppercase' },
          style,
          anim,
        ]}
      >
        {texto}
      </Animated.Text>
    </View>
  );
}

// Entrada de la app: logo, nombre y dos cortinas (tinta y cobalto) que se
// abren hacia arriba. Solo se ve una vez por sesión.
let introVista = false;

export function Intro() {
  const [visible, setVisible] = useState(!introVista);
  const logo = useSharedValue(0);
  const cortina = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    introVista = true;
    logo.value = withTiming(1, { duration: 700, easing: curva });
    cortina.value = withDelay(
      1500,
      withTiming(1, { duration: 750, easing: curva }, (fin) => {
        if (fin) runOnJS(setVisible)(false);
      }),
    );
  }, [visible, logo, cortina]);

  const logoAnim = useAnimatedStyle(() => ({
    opacity: logo.value,
    transform: [{ scale: interpolate(logo.value, [0, 1], [0.7, 1]) }, { translateY: interpolate(cortina.value, [0, 1], [0, -60]) }],
  }));
  const tintaAnim = useAnimatedStyle(() => ({ transform: [{ translateY: `${-cortina.value * 100}%` as `${number}%` }] }));
  const cobaltoAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: `${-interpolate(cortina.value, [0, 0.25, 1], [0, 0, 100])}%` as `${number}%` }],
  }));

  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color.cobalto }, cobaltoAnim]} />
      <Animated.View style={[StyleSheet.absoluteFill, s.intro, tintaAnim]}>
        <Animated.View style={[{ alignItems: 'center' }, logoAnim]}>
          <Logo tam={88} texto={false} />
          <View style={{ marginTop: 26 }}>
            <TitularRevela texto="VELT" tam={56} retraso={250} style={{ color: color.crema, letterSpacing: -1 }} />
          </View>
          <Text style={s.introSub}>// Escolar</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// «Desliza para confirmar»: un gesto que no se hace sin querer y que da
// sensación de cerrar algo. Con lector de pantalla se activa como un botón.
export function Deslizar({
  texto,
  textoHecho,
  onConfirmar,
  tono = color.lima,
}: {
  texto: string;
  textoHecho: string;
  onConfirmar: () => void;
  tono?: string;
}) {
  const ASA = 54;
  const [ancho, setAncho] = useState(0);
  const [hecho, setHecho] = useState(false);
  const x = useSharedValue(0);
  const max = Math.max(0, ancho - ASA - 4);
  const maxRef = useRef(max);
  maxRef.current = max;

  const completar = () => {
    setHecho(true);
    vibra('exito');
    setTimeout(onConfirmar, 380);
  };
  const completarRef = useRef(completar);
  completarRef.current = completar;

  const gesto = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => vibra(),
      onPanResponderMove: (_, g) => {
        x.value = Math.min(maxRef.current, Math.max(0, g.dx));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > maxRef.current * 0.8) {
          x.value = withTiming(maxRef.current, { duration: 160 });
          completarRef.current();
        } else {
          x.value = withSpring(0, { damping: 16, stiffness: 220 });
        }
      },
    }),
  ).current;

  const asaAnim = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const rellenoAnim = useAnimatedStyle(() => ({ width: x.value + ASA }));
  const textoAnim = useAnimatedStyle(() => ({ opacity: max ? 1 - Math.min(1, x.value / (max * 0.6)) : 1 }));

  const accion = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'activate' && !hecho) completar();
  };

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}
      style={[s.pista, cortado(10)]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={texto}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={accion}
    >
      <Animated.View style={[s.relleno, { backgroundColor: tono }, rellenoAnim]} />
      <Animated.Text style={[s.pistaTexto, textoAnim]}>{hecho ? '' : texto}</Animated.Text>
      {hecho && <Text style={[s.pistaTexto, { color: color.tinta }]}>{textoHecho}</Text>}
      <Animated.View {...gesto.panHandlers} style={[s.asa, { width: ASA }, asaAnim, cortado(8)]}>
        <Text style={s.asaTexto}>{hecho ? '✓' : '→'}</Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  intro: { backgroundColor: color.tinta, alignItems: 'center', justifyContent: 'center' },
  introSub: { fontFamily: font.monoBold, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: color.lima, marginTop: 14, textAlign: 'center' },
  pista: { height: 58, backgroundColor: '#1C2030', justifyContent: 'center', overflow: 'hidden' },
  relleno: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  pistaTexto: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: font.monoBold,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: color.grisClaro,
  },
  asa: { position: 'absolute', left: 2, top: 2, bottom: 2, backgroundColor: color.crema, alignItems: 'center', justifyContent: 'center', cursor: 'grab' } as never,
  asaTexto: { fontFamily: font.monoBold, fontSize: 20, color: color.tinta },
});
