// Movimiento compartido: mismas curvas y tiempos en toda la app para que
// se sienta como un solo producto. Interfaz por debajo de 300 ms, ease-out
// fuerte, nada aparece desde escala 0 y nada se anima al cambiar de pestaña.
// Las animaciones respetan «reducir movimiento» del sistema (Reanimated lo hace solo).
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Easing, FadeIn, FadeInDown, FadeInRight, FadeOut, Keyframe, LinearTransition } from 'react-native-reanimated';

export const curva = Easing.bezier(0.23, 1, 0.32, 1); // ease-out fuerte

// Entrada escalonada: el elemento i aparece 70 ms después del anterior
// Entrada escalonada corta: 40 ms entre elementos y retrasos base recortados
export const entra = (i = 0, base = 0) => FadeInDown.delay(Math.round(base * 0.5) + i * 40).duration(280).easing(curva);
export const entraLado = (i = 0, base = 0) => FadeInRight.delay(Math.round(base * 0.5) + i * 40).duration(260).easing(curva);
export const aparece = (retraso = 0) => FadeIn.delay(retraso).duration(200);
export const sale = FadeOut.duration(150);
export const recoloca = LinearTransition.duration(240).easing(curva);

// Aparecer con un leve crecimiento: desde 0,95 y transparente, nunca desde 0
export const asoma = (retraso = 0) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.95 }] },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: curva },
  })
    .delay(retraso)
    .duration(220);

// Vibración suave al confirmar algo en el móvil
export function vibra(tipo: 'suave' | 'exito' = 'suave') {
  if (Platform.OS === 'web') return;
  if (tipo === 'exito') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
