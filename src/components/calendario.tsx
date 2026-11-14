// «Tu calendario»: llevar el horario y las tareas al calendario del móvil.
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Persona } from '../data/equipo';
import { descargar, horarioIcs, useEnlaceCalendario } from '../lib/calendario';
import { useCentro } from '../lib/centro';
import { useToast } from '../lib/toast';
import { color, font } from '../lib/theme';
import { Boton, cortado } from './ui';

const abrir = (url: string) => (Platform.OS === 'web' && typeof window !== 'undefined' ? window.open(url, '_blank') : Linking.openURL(url));

export function TuCalendario({ yo }: { yo: Persona }) {
  const cfg = useCentro();
  const toast = useToast();
  const enlace = useEnlaceCalendario();

  const bajarHorario = () => {
    descargar(`horario-${yo.nombre.toLowerCase()}.ics`, horarioIcs(`${yo.nombre} ${yo.apellido}`.trim(), cfg.semana[yo.id], cfg.franjas, cfg.espacios));
    toast('Horario descargado. Ábrelo y elige tu calendario.');
  };

  return (
    <View style={[s.caja, cortado(16)]}>
      <View style={{ flex: 1, minWidth: 220 }}>
        <Text style={s.titulo}>Tu horario y tus tareas, en tu calendario</Text>
        <Text style={s.texto}>
          {enlace.listo
            ? 'Añádelo una vez y te aparecerán solas tus clases, guardias y tareas, con aviso 10 minutos antes de cada clase y el día antes de cada tarea.'
            : 'Descarga tu horario y ábrelo con Google Calendar o el calendario del móvil. Cada clase y cada guardia, con aviso 10 minutos antes.'}
        </Text>
      </View>
      <View style={s.botones}>
        {enlace.listo ? (
          <>
            <Boton variante="lima" fondo={color.tinta} pequeno onPress={() => abrir(enlace.google)}>
              Añadir a Google Calendar
            </Boton>
            <Boton variante="blanco" fondo={color.tinta} pequeno onPress={() => abrir(enlace.webcal)}>
              iPhone u Outlook
            </Boton>
            <Pressable
              onPress={() => {
                try {
                  navigator.clipboard?.writeText(enlace.https);
                  toast('Enlace copiado. En Google Calendar: Otros calendarios → + → Desde URL.');
                } catch {}
              }}
              accessibilityRole="button"
            >
              <Text style={s.enlace}>Copiar enlace</Text>
            </Pressable>
          </>
        ) : (
          <Boton variante="lima" fondo={color.tinta} pequeno onPress={bajarHorario}>
            Descargar mi horario
          </Boton>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  caja: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, backgroundColor: color.tinta, padding: 20, marginTop: 16 },
  titulo: { fontFamily: font.uiBold, fontSize: 15, color: color.crema },
  texto: { fontFamily: font.ui, fontSize: 13, lineHeight: 19, color: color.grisClaro, marginTop: 4, maxWidth: 520 },
  botones: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  enlace: { fontFamily: font.uiBold, fontSize: 13, color: color.grisClaro, textDecorationLine: 'underline', paddingVertical: 6 },
});
