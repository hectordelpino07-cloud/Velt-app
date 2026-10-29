// Avisos breves abajo de la pantalla («Tarea hecha · Deshacer»).
import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOutDown, SlideInDown } from 'react-native-reanimated';
import { color, font } from './theme';
import { curva } from './motion';

type Aviso = { id: number; texto: string; accion?: { etiqueta: string; fn: () => void } };
type Ctx = (texto: string, accion?: Aviso['accion']) => void;

const ToastContext = createContext<Ctx>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrar = useCallback<Ctx>((texto, accion) => {
    if (temporizador.current) clearTimeout(temporizador.current);
    setAviso({ id: Date.now(), texto, accion });
    temporizador.current = setTimeout(() => setAviso(null), 4200);
  }, []);

  return (
    <ToastContext.Provider value={mostrar}>
      {children}
      <View pointerEvents="box-none" style={s.capa}>
        {aviso && (
          <Animated.View key={aviso.id} entering={SlideInDown.duration(380).easing(curva)} exiting={FadeOutDown.duration(200)} style={s.toast}>
            <View style={s.punto} />
            <Text style={s.texto}>{aviso.texto}</Text>
            {aviso.accion && (
              <Pressable
                onPress={() => {
                  aviso.accion!.fn();
                  setAviso(null);
                }}
                accessibilityRole="button"
              >
                <Text style={s.accion}>{aviso.accion.etiqueta}</Text>
              </Pressable>
            )}
          </Animated.View>
        )}
      </View>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const s = StyleSheet.create({
  capa: { position: 'absolute', left: 0, right: 0, bottom: 28, alignItems: 'center', paddingHorizontal: 16 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: color.tinta,
    paddingVertical: 14,
    paddingHorizontal: 18,
    maxWidth: 520,
    boxShadow: `6px 6px 0 ${color.cobalto}`,
  },
  punto: { width: 8, height: 8, backgroundColor: color.lima },
  texto: { fontFamily: font.uiMedium, fontSize: 14, color: color.crema, flexShrink: 1 },
  accion: { fontFamily: font.uiBold, fontSize: 13, color: color.lima },
});
