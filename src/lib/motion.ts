// Movimiento compartido: mismas curvas y tiempos en toda la app para que
// se sienta como un solo producto. Entradas rápidas (ease-out), nada de rebotes
// exagerados: VELT es para directores, tiene que sentirse firme.
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Easing, FadeIn, FadeInDown, FadeInRight, FadeOut, LinearTransition } from 'react-native-reanimated';

export const curva = Easing.bezier(0.16, 1, 0.3, 1); // expo.out

// Entrada escalonada: el elemento i aparece 70 ms después del anterior
export const entra = (i = 0, base = 0) => FadeInDown.delay(base + i * 70).duration(480).easing(curva);
export const entraLado = (i = 0, base = 0) => FadeInRight.delay(base + i * 90).duration(420).easing(curva);
export const aparece = (retraso = 0) => FadeIn.delay(retraso).duration(320);
export const sale = FadeOut.duration(180);
export const recoloca = LinearTransition.duration(320).easing(curva);

// Vibración suave al confirmar algo en el móvil
export function vibra(tipo: 'suave' | 'exito' = 'suave') {
  if (Platform.OS === 'web') return;
  if (tipo === 'exito') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
