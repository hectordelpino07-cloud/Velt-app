// Equipo: todas las personas del centro y dónde está cada una ahora mismo.
// Al tocar a alguien se abre su ficha, con su horario y para escribirle.
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { ahoraYLuego, levanta, textoHueco } from '../components/horario';
import { TitularRevela } from '../components/motion';
import { Avatar, Mono } from '../components/ui';
import { esClase } from '../data/centro';
import { activos, CENTRO, nombreCompleto, Persona } from '../data/equipo';
import { useCentro } from '../lib/centro';
import { entra } from '../lib/motion';
import { useYo } from '../lib/store';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';

const GRUPOS: { titulo: string; de: (p: Persona) => boolean }[] = [
  { titulo: 'Dirección y jefatura', de: (p) => p.rol === 'Dirección' || p.rol === 'Jefatura' },
  { titulo: 'Profesorado', de: (p) => p.rol === 'Profesorado' },
  { titulo: 'Conserjería y secretaría', de: (p) => p.rol === 'Conserjería' || p.rol === 'Secretaría' },
];

export default function Equipo() {
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  const cfg = useCentro();
  const { yo } = useYo();
  const gente = activos();

  return (
    <View>
      <TitularRevela texto="Equipo." tam={ancho ? 48 : 30} />
      <Mono style={{ marginTop: 10, fontSize: 14 }}>
        {gente.length} personas · {CENTRO}
      </Mono>

      {GRUPOS.map((g, gi) => {
        const lista = gente.filter(g.de);
        if (!lista.length) return null;
        return (
          <Animated.View key={g.titulo} entering={entra(gi + 1)} style={{ marginTop: 30 }}>
            <View style={s.cab}>
              <Text style={s.cabTexto}>{g.titulo}</Text>
              <Text style={s.cabSub}>{lista.length}</Text>
            </View>
            <View style={s.rejilla}>
              {lista.map((p) => {
                const ausente = cfg.ausentes.includes(p.id);
                const { real, hueco, siguiente, terminado } = ahoraYLuego(cfg.horario[p.id], cfg.franjas);
                const estado = ausente ? 'Ausente hoy' : real ? textoHueco(hueco, cfg.nombreEspacio, p) : siguiente ? `Próxima hora: ${siguiente.inicio}` : terminado ? 'Ha terminado por hoy' : 'Hoy no tiene horario';
                const enClase = real && !ausente && esClase(hueco);
                const guardia = real && !ausente && hueco === 'guardia';
                return (
                  <Pressable key={p.id} onPress={() => router.navigate(`/persona/${p.id}`)} accessibilityRole="link" accessibilityLabel={`Ver la ficha de ${p.nombre}`} style={[s.tarjeta, !ancho && { width: '100%' }]}>
                    {({ hovered }: { hovered?: boolean; pressed: boolean }) => (
                    <View style={[s.dentro, levanta(hovered), hovered && { borderColor: color.tinta }]}>
                      <Avatar id={p.id} tam={40} activo={p.id === yo.id} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.nombre}>
                          {nombreCompleto(p)}
                          {p.id === yo.id ? ' · tú' : ''}
                        </Text>
                        <Text style={s.rol}>{p.materia || p.rol}</Text>
                        <Text
                          style={[s.estado, enClase && { backgroundColor: color.azulSuave, color: color.cobalto }, guardia && { backgroundColor: color.tinta, color: color.lima }, ausente && { backgroundColor: color.rojo, color: color.blanco }]}
                          numberOfLines={1}
                        >
                          {estado}
                        </Text>
                      </View>
                    </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  cab: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderTopWidth: 3, borderTopColor: color.tinta, paddingTop: 10, marginBottom: 14 },
  cabTexto: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta },
  cabSub: { fontFamily: font.mono, fontSize: 11, color: color.gris },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tarjeta: { width: 300 },
  dentro: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, padding: 14 },
  nombre: { fontFamily: font.uiBold, fontSize: 15, color: color.tinta },
  rol: { fontFamily: font.ui, fontSize: 13, color: color.gris, marginTop: 1 },
  estado: { alignSelf: 'flex-start', fontFamily: font.uiMedium, fontSize: 12, color: color.tinta, backgroundColor: '#E7E3D8', paddingHorizontal: 7, paddingVertical: 3, marginTop: 8, maxWidth: '100%' },
});
