// Configurar centro: dirección crea las plantas, dice cuántas aulas tiene
// cada una, les pone nombre y rellena los horarios. Pensado para hacerse en
// diez minutos y sin manual: todo se edita en el sitio y se guarda solo.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { TitularRevela } from '../components/motion';
import { Avatar, Boton, cortado, Mono } from '../components/ui';
import { Clase, esClase, esLugar, Espacio, FRANJAS, Hueco, MATERIA, PROFESORADO, TIPOS_ESPACIO } from '../data/centro';
import { CENTRO, persona } from '../data/equipo';
import { useCentro } from '../lib/centro';
import { entra, recoloca, sale, vibra } from '../lib/motion';
import { useVelt } from '../lib/store';
import { useToast } from '../lib/toast';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';

type Pestana = 'espacios' | 'horarios';

export default function Configurar() {
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  const [pestana, setPestana] = useState<Pestana>('espacios');
  const cfg = useCentro();
  const { reiniciar } = useVelt();
  const toast = useToast();

  return (
    <View style={{ maxWidth: 1000 }}>
      <Animated.View entering={entra(0)}>
        <Mono style={{ marginBottom: 14 }}>
          // {CENTRO} · se guarda solo
        </Mono>
      </Animated.View>
      <TitularRevela texto={'Configura\ntu centro.'} tam={ancho ? 76 : 34} />
      <Animated.View entering={entra(2, 120)}>
        <Text style={s.intro}>
          Dos pasos: primero las plantas y sus aulas, después qué hace cada profesor en cada hora. Con eso VELT ya sabe qué aula está libre y dónde está cada
          uno.
        </Text>
      </Animated.View>

      <View style={s.pestanas}>
        {(
          [
            ['espacios', '01 · Plantas y aulas'],
            ['horarios', '02 · Horarios'],
          ] as const
        ).map(([id, texto]) => (
          <Pressable key={id} onPress={() => setPestana(id)} accessibilityRole="tab" style={[s.pestana, pestana === id && s.pestanaOn, cortado(8)]}>
            <Text style={[s.pestanaTexto, pestana === id && { color: color.crema }]}>{texto}</Text>
          </Pressable>
        ))}
      </View>

      {pestana === 'espacios' ? <Espacios /> : <Horarios ancho={ancho} />}

      <View style={s.reinicio}>
        <View style={{ flex: 1, minWidth: 220 }}>
          <Text style={s.reinicioTitulo}>Antes de una demo</Text>
          <Text style={s.reinicioTexto}>Vuelve a dejar el centro, el material y las tareas como al principio, con los datos de ejemplo.</Text>
        </View>
        <Boton
          variante="linea"
          pequeno
          onPress={() => {
            cfg.reiniciarCentro();
            reiniciar();
            vibra('exito');
            toast('Demo reiniciada: centro, material y tareas como al principio.');
          }}
        >
          Reiniciar la demo
        </Boton>
      </View>
    </View>
  );
}

// ——— Paso 1: plantas y aulas ———

function Espacios() {
  const cfg = useCentro();
  return (
    <View style={{ gap: 18 }}>
      {cfg.plantas.map((pl, i) => {
        const suyos = cfg.espacios.filter((e) => e.planta === pl.id);
        const aulas = suyos.filter((e) => e.tipo === 'aula').length;
        return (
          <Animated.View key={pl.id} entering={entra(i, 150)} exiting={sale} layout={recoloca} style={[s.planta, cortado(18)]}>
            <View style={s.plantaCabecera}>
              <TextInput
                value={pl.nombre}
                onChangeText={(t) => cfg.renombrarPlanta(pl.id, t)}
                style={s.plantaNombre}
                accessibilityLabel="Nombre de la planta"
              />
              <View style={s.contador}>
                <Text style={s.contadorEtiqueta}>Aulas de grupo</Text>
                <Pressable onPress={() => cfg.numeroAulas(pl.id, Math.max(0, aulas - 1))} accessibilityLabel="Quitar un aula" style={s.contadorBoton}>
                  <Text style={s.contadorSigno}>−</Text>
                </Pressable>
                <Text style={s.contadorN}>{aulas}</Text>
                <Pressable onPress={() => cfg.numeroAulas(pl.id, aulas + 1)} accessibilityLabel="Añadir un aula" style={s.contadorBoton}>
                  <Text style={s.contadorSigno}>+</Text>
                </Pressable>
              </View>
            </View>

            {suyos.length === 0 && <Text style={s.vacio}>Sin espacios todavía. Sube el número de aulas o añade un espacio abajo.</Text>}
            {suyos.map((e) => (
              <FilaEspacio key={e.id} e={e} />
            ))}

            <View style={s.anadir}>
              <Mono>+ Añadir</Mono>
              {TIPOS_ESPACIO.map((t) => (
                <Pressable key={t.id} onPress={() => cfg.addEspacio(pl.id, t.id)} accessibilityRole="button" style={s.anadirBoton}>
                  {({ hovered }: { hovered?: boolean; pressed: boolean }) => (
                    <Text style={[s.anadirTexto, hovered && { color: color.cobalto }]}>{t.nombre}</Text>
                  )}
                </Pressable>
              ))}
              {cfg.plantas.length > 1 && (
                <Pressable onPress={() => cfg.quitarPlanta(pl.id)} accessibilityRole="button" style={{ marginLeft: 'auto' }}>
                  {({ hovered }: { hovered?: boolean; pressed: boolean }) => (
                    <Text style={[s.quitarPlanta, hovered && { color: color.rojo }]}>Quitar planta</Text>
                  )}
                </Pressable>
              )}
            </View>
          </Animated.View>
        );
      })}
      <Boton variante="principal" onPress={cfg.addPlanta} style={{ alignSelf: 'flex-start' }}>
        + Añadir planta
      </Boton>
    </View>
  );
}

function FilaEspacio({ e }: { e: Espacio }) {
  const cfg = useCentro();
  return (
    <Animated.View entering={entra(0)} exiting={sale} layout={recoloca} style={s.espacio}>
      <TextInput value={e.nombre} onChangeText={(t) => cfg.editarEspacio(e.id, { nombre: t })} style={s.espacioNombre} accessibilityLabel="Nombre del espacio" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }} style={{ flexGrow: 0 }}>
        {TIPOS_ESPACIO.map((t) => (
          <Pressable key={t.id} onPress={() => cfg.editarEspacio(e.id, { tipo: t.id })} style={[s.tipo, e.tipo === t.id && s.tipoOn]}>
            <Text style={[s.tipoTexto, e.tipo === t.id && { color: color.crema }]}>{t.nombre}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable
        onPress={() => cfg.editarEspacio(e.id, { cerrado: e.cerrado ? undefined : 'Cerrada por mantenimiento' })}
        accessibilityRole="button"
        style={[s.tipo, e.cerrado && { backgroundColor: '#E7E3D8', borderColor: color.gris }]}
      >
        <Text style={s.tipoTexto}>{e.cerrado ? 'Cerrada · abrir' : 'Cerrar'}</Text>
      </Pressable>
      <Pressable onPress={() => cfg.quitarEspacio(e.id)} accessibilityLabel={`Borrar ${e.nombre}`} style={s.borrar}>
        {({ hovered }: { hovered?: boolean; pressed: boolean }) => <Text style={[s.borrarTexto, hovered && { color: color.rojo }]}>✕</Text>}
      </Pressable>
    </Animated.View>
  );
}

// ——— Paso 2: horarios ———

function Horarios({ ancho }: { ancho: boolean }) {
  const cfg = useCentro();
  const [quien, setQuien] = useState(PROFESORADO[0]);
  const [eligiendo, setEligiendo] = useState<number | null>(null);
  const huecos = cfg.horario[quien] ?? FRANJAS.map(() => 'libre' as Hueco);
  const lugaresClase = cfg.espacios.filter((e) => e.tipo !== 'oficina');

  // ¿Alguien más da clase en ese espacio a esa hora?
  const choque = (franja: number, espacioId: string) =>
    Object.entries(cfg.horario).find(([p, hs]) => p !== quien && esClase(hs[franja]) && (hs[franja] as Clase).espacio === espacioId)?.[0];

  const ponerClase = (franja: number) => {
    const libre = lugaresClase.find((e) => !choque(franja, e.id)) ?? lugaresClase[0];
    if (!libre) return;
    cfg.ponerHueco(quien, franja, {
      espacio: libre.id,
      grupo: libre.tipo === 'aula' ? libre.nombre : '',
      materia: (MATERIA[quien] ?? '').split(' · ')[0],
    });
    setEligiendo(franja);
  };

  return (
    <View>
      <Mono style={{ marginBottom: 10 }}>// Elige a un profesor</Mono>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 4 }}>
        {PROFESORADO.map((id) => {
          const p = persona(id)!;
          const on = id === quien;
          return (
            <Pressable
              key={id}
              onPress={() => {
                setQuien(id);
                setEligiendo(null);
              }}
              accessibilityRole="button"
              style={[s.profe, on && s.profeOn, cortado(8)]}
            >
              <Avatar id={id} tam={28} activo={on} />
              <View>
                <Text style={[s.profeNombre, on && { color: color.crema }]}>{p.nombre}</Text>
                <Text style={[s.profeMateria, on && { color: color.grisClaro }]}>{MATERIA[id]}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[s.horario, cortado(18)]}>
        {FRANJAS.map((f) => {
          const h = huecos[f.id];
          const tipo = esClase(h) ? 'clase' : esLugar(h) ? 'fijo' : h;
          const conflicto = esClase(h) ? choque(f.id, h.espacio) : undefined;
          return (
            <Animated.View key={`${quien}-${f.id}`} entering={entra(f.id, 60)} layout={recoloca} style={[s.franja, f.recreo && { backgroundColor: '#FAF8F3' }]}>
              <View style={[s.franjaFila, !ancho && { flexDirection: 'column', alignItems: 'flex-start' }]}>
                <View style={{ width: 92 }}>
                  <Text style={s.franjaHora}>{f.inicio}</Text>
                  <Text style={s.franjaNombre}>{f.nombre}</Text>
                </View>
                <View style={s.segmentos}>
                  <Segmento on={tipo === 'clase'} texto="Clase" onPress={() => (tipo === 'clase' ? setEligiendo(eligiendo === f.id ? null : f.id) : ponerClase(f.id))} />
                  <Segmento on={tipo === 'guardia'} texto="Guardia" onPress={() => cfg.ponerHueco(quien, f.id, 'guardia')} />
                  <Segmento on={tipo === 'libre'} texto="Libre" onPress={() => cfg.ponerHueco(quien, f.id, 'libre')} />
                  {esLugar(h) && <Segmento on texto={h.motivo} onPress={() => {}} />}
                </View>
                {esClase(h) && (
                  <View style={s.claseResumen}>
                    <Pressable onPress={() => setEligiendo(eligiendo === f.id ? null : f.id)} style={[s.aulaElegida, conflicto && { borderColor: color.rojo }]}>
                      <Text style={s.aulaElegidaTexto}>{cfg.nombreEspacio(h.espacio)} ▾</Text>
                    </Pressable>
                    <TextInput
                      value={h.grupo}
                      placeholder="Grupo"
                      placeholderTextColor="#9A9DA8"
                      onChangeText={(t) => cfg.ponerHueco(quien, f.id, { ...h, grupo: t })}
                      style={[s.campo, { width: 110 }]}
                    />
                    <TextInput
                      value={h.materia}
                      placeholder="Asignatura"
                      placeholderTextColor="#9A9DA8"
                      onChangeText={(t) => cfg.ponerHueco(quien, f.id, { ...h, materia: t })}
                      style={[s.campo, { flex: 1, minWidth: 120 }]}
                    />
                  </View>
                )}
              </View>
              {conflicto && esClase(h) && (
                <Text style={s.conflicto}>
                  Choque: coincide con {persona(conflicto)?.nombre}: a esta hora ya da clase en {cfg.nombreEspacio(h.espacio)}.
                </Text>
              )}
              {eligiendo === f.id && esClase(h) && (
                <Animated.View entering={entra(0)} style={s.elegir}>
                  {lugaresClase.map((e) => {
                    const ocupado = choque(f.id, e.id);
                    const on = e.id === h.espacio;
                    return (
                      <Pressable
                        key={e.id}
                        onPress={() => {
                          cfg.ponerHueco(quien, f.id, { ...h, espacio: e.id, grupo: e.tipo === 'aula' && (!h.grupo || h.grupo === cfg.nombreEspacio(h.espacio)) ? e.nombre : h.grupo });
                          setEligiendo(null);
                        }}
                        style={[s.opcion, on && s.opcionOn, ocupado && !on && { opacity: 0.45 }]}
                      >
                        <Text style={[s.opcionTexto, on && { color: color.crema }]}>{e.nombre}</Text>
                        {ocupado && <Text style={s.opcionOcupada}>{persona(ocupado)?.nombre}</Text>}
                      </Pressable>
                    );
                  })}
                </Animated.View>
              )}
            </Animated.View>
          );
        })}
      </View>
      <Text style={s.notaHorario}>
        El resto del personal (dirección, conserjería, secretaría) tiene un sitio fijo. Los nombres son solo de personal del centro: VELT no guarda datos de
        alumnos.
      </Text>
    </View>
  );
}

function Segmento({ on, texto, onPress }: { on: boolean; texto: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[s.segmento, on && s.segmentoOn]}>
      <Text style={[s.segmentoTexto, on && { color: color.lima }]} numberOfLines={1}>
        {texto}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  intro: { fontFamily: font.ui, fontSize: 16, lineHeight: 24, color: color.gris, marginTop: 16, maxWidth: 640 },
  pestanas: { flexDirection: 'row', gap: 6, marginTop: 26, marginBottom: 18, flexWrap: 'wrap' },
  pestana: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#E7E3D8' },
  pestanaOn: { backgroundColor: color.tinta },
  pestanaTexto: { fontFamily: font.monoBold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: color.tinta },
  planta: { backgroundColor: color.blanco, padding: 20, borderWidth: 1, borderColor: color.borde },
  plantaCabecera: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  plantaNombre: { fontFamily: font.display, fontSize: 24, textTransform: 'uppercase', color: color.tinta, minWidth: 180, flex: 1, outlineStyle: 'none', paddingVertical: 4 } as never,
  contador: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contadorEtiqueta: { fontFamily: font.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: color.gris, marginRight: 4 },
  contadorBoton: { width: 34, height: 34, backgroundColor: color.tinta, alignItems: 'center', justifyContent: 'center' },
  contadorSigno: { fontFamily: font.monoBold, fontSize: 18, color: color.lima },
  contadorN: { fontFamily: font.display, fontSize: 24, color: color.tinta, minWidth: 34, textAlign: 'center' },
  vacio: { fontFamily: font.ui, fontSize: 14, color: color.gris, paddingVertical: 8 },
  espacio: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: color.borde, flexWrap: 'wrap' },
  espacioNombre: { fontFamily: font.uiBold, fontSize: 15, color: color.tinta, minWidth: 150, flex: 1, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'transparent', outlineStyle: 'none' } as never,
  tipo: { borderWidth: 1, borderColor: color.borde, paddingVertical: 5, paddingHorizontal: 8 },
  tipoOn: { backgroundColor: color.tinta, borderColor: color.tinta },
  tipoTexto: { fontFamily: font.mono, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: color.tinta },
  borrar: { paddingHorizontal: 8, paddingVertical: 4 },
  borrarTexto: { fontFamily: font.monoBold, fontSize: 14, color: color.gris },
  anadir: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: color.borde },
  anadirBoton: { paddingVertical: 4 },
  anadirTexto: { fontFamily: font.monoBold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: color.tinta, textDecorationLine: 'underline' },
  quitarPlanta: { fontFamily: font.mono, fontSize: 11, textTransform: 'uppercase', color: color.gris, textDecorationLine: 'underline' },
  profe: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingLeft: 8, paddingRight: 16, backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde },
  profeOn: { backgroundColor: color.tinta, borderColor: color.tinta },
  profeNombre: { fontFamily: font.uiBold, fontSize: 14, color: color.tinta },
  profeMateria: { fontFamily: font.ui, fontSize: 11, color: color.gris },
  horario: { backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, marginTop: 14 },
  franja: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: color.borde },
  franjaFila: { flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  franjaHora: { fontFamily: font.monoBold, fontSize: 15, color: color.tinta },
  franjaNombre: { fontFamily: font.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: color.gris },
  segmentos: { flexDirection: 'row' },
  segmento: { borderWidth: 1.5, borderColor: color.tinta, paddingVertical: 6, paddingHorizontal: 10, marginLeft: -1.5, maxWidth: 170 },
  segmentoOn: { backgroundColor: color.tinta },
  segmentoTexto: { fontFamily: font.monoBold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: color.tinta },
  claseResumen: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' },
  aulaElegida: { borderWidth: 1.5, borderColor: color.cobalto, backgroundColor: color.azulSuave, paddingVertical: 6, paddingHorizontal: 10 },
  aulaElegidaTexto: { fontFamily: font.uiBold, fontSize: 13, color: color.cobalto },
  campo: { fontFamily: font.ui, fontSize: 14, color: color.tinta, borderBottomWidth: 1.5, borderBottomColor: color.borde, paddingVertical: 6, outlineStyle: 'none' } as never,
  conflicto: { fontFamily: font.uiMedium, fontSize: 13, color: color.rojo, marginTop: 8 },
  elegir: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, padding: 12, backgroundColor: color.crema },
  opcion: { borderWidth: 1, borderColor: color.borde, backgroundColor: color.blanco, paddingVertical: 6, paddingHorizontal: 10 },
  opcionOn: { backgroundColor: color.cobalto, borderColor: color.cobalto },
  opcionTexto: { fontFamily: font.uiMedium, fontSize: 13, color: color.tinta },
  opcionOcupada: { fontFamily: font.mono, fontSize: 9, textTransform: 'uppercase', color: color.rojo, marginTop: 1 },
  notaHorario: { fontFamily: font.ui, fontSize: 12, lineHeight: 18, color: color.gris, marginTop: 12 },
  reinicio: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginTop: 40, paddingTop: 18, borderTopWidth: 3, borderTopColor: color.tinta },
  reinicioTitulo: { fontFamily: font.uiBold, fontSize: 15, color: color.tinta },
  reinicioTexto: { fontFamily: font.ui, fontSize: 13, color: color.gris, marginTop: 2 },
});
