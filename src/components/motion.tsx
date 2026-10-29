// Piezas con movimiento propio: titulares que suben desde una máscara,
// la entrada de la app con el logo y el control de deslizar para confirmar.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityActionEvent, LayoutChangeEvent, PanResponder, Platform, StyleProp, StyleSheet, Text, TextStyle, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { curva, vibra } from '../lib/motion';
import { color, font } from '../lib/theme';
import { cortado, Logo } from './ui';

// Titular de pantalla. Con `anima` entra línea a línea desde detrás de una
// máscara: se reserva para el momento de la app (Hoy, Enviado, la entrada).
// En las pantallas de trabajo es estático: se ven muchas veces al día.
export function TitularRevela({
  texto,
  tam = 44,
  retraso = 0,
  anima,
  style,
}: {
  texto: string;
  tam?: number;
  retraso?: number;
  anima?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const lineas = texto.split('\n');
  if (!anima) {
    return (
      <Text accessibilityRole="header" style={[estiloTitular(tam), style]}>
        {texto}
      </Text>
    );
  }
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={texto.replace(/\n/g, ' ')}>
      {lineas.map((l, i) => (
        <Linea key={`${l}-${i}`} texto={l} tam={tam} retraso={retraso + i * 70} style={style} />
      ))}
    </View>
  );
}

const estiloTitular = (tam: number): TextStyle => ({
  fontFamily: font.display,
  fontSize: tam,
  lineHeight: tam * 0.98,
  letterSpacing: -tam * 0.025,
  color: color.tinta,
  textTransform: 'uppercase',
});

function Linea({ texto, tam, retraso, style }: { texto: string; tam: number; retraso: number; style?: StyleProp<TextStyle> }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(retraso, withTiming(1, { duration: 600, easing: curva })));
  }, [p, retraso]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - p.value) * tam * 1.1 }] }));
  return (
    <View style={{ overflow: 'hidden', paddingBottom: tam * 0.06 }}>
      <Animated.Text
        style={[estiloTitular(tam), style, anim]}
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
    logo.set(withTiming(1, { duration: 500, easing: curva }));
    cortina.set(
      withDelay(
        1100,
        withTiming(1, { duration: 600, easing: curva }, (fin) => {
          if (fin) scheduleOnRN(setVisible, false);
        }),
      ),
    );
  }, [visible, logo, cortina]);

  const logoAnim = useAnimatedStyle(() => ({
    opacity: logo.value,
    transform: [{ scale: interpolate(logo.value, [0, 1], [0.92, 1]) }, { translateY: interpolate(cortina.value, [0, 1], [0, -60]) }],
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
            <TitularRevela texto="VELT" tam={56} retraso={180} anima style={{ color: color.crema, letterSpacing: -1 }} />
          </View>
          <Text style={s.introSub}>Escolar</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// «Desliza para confirmar»: un gesto que no se hace sin querer y que da
// sensación de cerrar algo. El arrastre corre en el hilo de la interfaz
// (Gesture Handler + Reanimated); basta con un gesto rápido aunque no llegue
// al final. Con lector de pantalla se activa como un botón.
type PropsDeslizar = { texto: string; textoHecho: string; onConfirmar: () => void; tono?: string };

// En el móvil, el arrastre va con Gesture Handler en el hilo de la interfaz. En
// la web se usa PanResponder, que es el que responde de forma fiable al ratón.
export function Deslizar(props: PropsDeslizar) {
  return Platform.OS === 'web' ? <DeslizarWeb {...props} /> : <DeslizarNativo {...props} />;
}

function DeslizarNativo({
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
  const max = useSharedValue(0);
  useEffect(() => {
    max.set(Math.max(0, ancho - ASA - 4));
  }, [ancho, max]);

  const completar = () => {
    if (hecho) return;
    setHecho(true);
    vibra('exito');
    setTimeout(onConfirmar, 320);
  };

  const gesto = usePanGesture({
    activeOffsetX: [-8, 8],
    failOffsetY: [-12, 12],
    onUpdate: (e) => {
      x.set(Math.min(max.get(), Math.max(0, e.translationX)));
    },
    onDeactivate: (e) => {
      // Llegar al 70 % o lanzar con fuerza hacia la derecha confirma
      if (e.translationX > max.get() * 0.7 || e.velocityX > 800) {
        x.set(withTiming(max.get(), { duration: 160, easing: curva }));
        scheduleOnRN(completar);
      } else {
        x.set(withSpring(0, { duration: 300, dampingRatio: 0.8 }));
      }
    },
  });

  const asaAnim = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  // El relleno ocupa toda la pista y se desplaza: no se anima el ancho
  const rellenoAnim = useAnimatedStyle(() => ({ transform: [{ translateX: x.value + ASA + 2 - ancho }] }));
  const textoAnim = useAnimatedStyle(() => ({ opacity: max.value ? 1 - Math.min(1, x.value / (max.value * 0.6)) : 1 }));

  const accion = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'activate') completar();
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
      <Animated.View style={[s.relleno, { width: ancho, backgroundColor: tono }, rellenoAnim]} />
      <Animated.Text style={[s.pistaTexto, textoAnim]}>{hecho ? '' : texto}</Animated.Text>
      {hecho && <Text style={[s.pistaTexto, { color: color.tinta }]}>{textoHecho}</Text>}
      <GestureDetector gesture={gesto}>
        <Animated.View style={[s.asa, { width: ASA }, asaAnim, cortado(8)]}>
          <Text style={s.asaTexto}>{hecho ? '✓' : '→'}</Text>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function DeslizarWeb({
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
  // El gesto se crea una vez; lee el ancho y la acción actuales a través de refs
  const maxRef = useRef(max);
  const confirmarRef = useRef(onConfirmar);
  useEffect(() => {
    maxRef.current = max;
    confirmarRef.current = onConfirmar;
  }, [max, onConfirmar]);

  const completar = useCallback(() => {
    setHecho(true);
    vibra('exito');
    setTimeout(() => confirmarRef.current(), 380);
  }, []);

  const gesto = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs -- las refs solo se leen al arrastrar, no al pintar
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => vibra(),
        onPanResponderMove: (_, g) => {
          x.set(Math.min(maxRef.current, Math.max(0, g.dx)));
        },
        onPanResponderRelease: (_, g) => {
          if (g.dx > maxRef.current * 0.8) {
            x.set(withTiming(maxRef.current, { duration: 160 }));
            completar();
          } else {
            x.set(withSpring(0, { damping: 16, stiffness: 220 }));
          }
        },
      }),
    [x, completar],
  );

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
    left: 56,
    right: 0,
    textAlign: 'center',
    fontFamily: font.uiBold,
    fontSize: 15,
    color: color.grisClaro,
  },
  asa: { position: 'absolute', left: 2, top: 2, bottom: 2, backgroundColor: color.crema, alignItems: 'center', justifyContent: 'center', cursor: 'grab' } as never,
  asaTexto: { fontFamily: font.monoBold, fontSize: 20, color: color.tinta },
});
