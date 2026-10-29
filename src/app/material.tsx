// Material del centro (stock): qué hay, dónde está, quién lo tiene y qué
// está roto. Marcar algo como averiado avisa a conserjería con una tarea.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { TitularRevela } from '../components/motion';
import { Avatar, Boton, Contador, cortado, Mono } from '../components/ui';
import { Material, TipoMaterial, TIPOS_MATERIAL } from '../data/centro';
import { activos, CENTRO, DIRECTOR, persona } from '../data/equipo';
import { useCentro } from '../lib/centro';
import { entra, recoloca, sale, vibra } from '../lib/motion';
import { useVelt } from '../lib/store';
import { useToast } from '../lib/toast';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';

const CONSERJERIA = 'carmen';

export default function MaterialPantalla() {
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  const { materiales } = useCentro();
  const [filtro, setFiltro] = useState<TipoMaterial | 'todo'>('todo');
  const [creando, setCreando] = useState(false);

  const unidades = (xs: Material[]) => xs.reduce((a, m) => a + m.cantidad, 0);
  const enAulas = unidades(materiales.filter((m) => m.espacio && m.estado === 'ok'));
  const almacen = unidades(materiales.filter((m) => !m.espacio && m.estado === 'ok'));
  const prestados = unidades(materiales.filter((m) => m.estado === 'prestado'));
  const averiados = unidades(materiales.filter((m) => m.estado === 'averiado'));
  const visibles = materiales.filter((m) => filtro === 'todo' || m.tipo === filtro);
  const tipos = TIPOS_MATERIAL.filter((t) => visibles.some((m) => m.tipo === t.id));

  return (
    <View style={{ maxWidth: 1100 }}>
      <TitularRevela texto="Material del centro." tam={ancho ? 48 : 30} />
      <Mono style={{ marginTop: 10, fontSize: 14 }}>
        {CENTRO} · {unidades(materiales)} unidades
      </Mono>

      <Animated.View entering={entra(2, 150)} style={[s.resumen, cortado(24), !ancho && { flexDirection: 'column' }]}>
        <Dato n={enAulas} l="En aulas, funcionando" />
        <Dato n={almacen} l="En el almacén, disponibles" acento />
        <Dato n={prestados} l="Prestados" />
        <Dato n={averiados} l="Averiados" alerta={averiados > 0} />
      </Animated.View>

      <View style={s.barra}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flexShrink: 1 }}>
          {[{ id: 'todo' as const, plural: 'Todo' }, ...TIPOS_MATERIAL].map((t) => (
            <Pressable key={t.id} onPress={() => setFiltro(t.id)} accessibilityRole="tab" style={[s.filtro, filtro === t.id && s.filtroOn]}>
              <Text style={[s.filtroTexto, filtro === t.id && { color: color.crema }]}>{t.plural}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Boton pequeno onPress={() => setCreando((c) => !c)}>
          {creando ? 'Cerrar' : '+ Añadir material'}
        </Boton>
      </View>

      {creando && <NuevoMaterial onHecho={() => setCreando(false)} />}

      {tipos.map((t, ti) => {
        const lista = visibles.filter((m) => m.tipo === t.id);
        return (
          <Animated.View key={t.id} layout={recoloca} style={{ marginTop: 26 }}>
            <View style={s.cabecera}>
              <Text style={s.cabTexto}>{t.plural}</Text>
              <Text style={s.cabSub}>{unidades(lista)} unidades</Text>
            </View>
            {lista.map((m) => (
              <FilaMaterial key={m.id} m={m} />
            ))}
          </Animated.View>
        );
      })}
      {visibles.length === 0 && <Text style={s.vacio}>No hay material de este tipo. Añádelo con «+ Añadir material».</Text>}
    </View>
  );
}

function Dato({ n, l, acento, alerta }: { n: number; l: string; acento?: boolean; alerta?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Contador valor={n} style={[s.datoN, acento && { color: color.lima }, alerta && { color: '#FF8A8A' }]} />
      <Text style={s.datoL}>{l}</Text>
    </View>
  );
}

type Panel = null | 'lugar' | 'prestar';

function FilaMaterial({ m }: { m: Material }) {
  const cfg = useCentro();
  const { enviar } = useVelt();
  const toast = useToast();
  const [panel, setPanel] = useState<Panel>(null);
  const quien = m.prestadoA ? persona(m.prestadoA) : undefined;
  const tono =
    m.estado === 'averiado'
      ? { bg: '#F6D4D4', tx: color.rojo, t: 'Averiado' }
      : m.estado === 'prestado'
        ? { bg: color.tinta, tx: color.lima, t: `Lo tiene ${quien?.nombre ?? '—'}` }
        : { bg: color.azulSuave, tx: color.cobalto, t: 'Funciona' };

  const averiado = () => {
    cfg.editarMaterial(m.id, { estado: 'averiado', prestadoA: undefined, nota: m.nota ?? 'Avisado a conserjería' });
    enviar([
      {
        titulo: `Revisar ${m.nombre.toLowerCase()} (${cfg.nombreEspacio(m.espacio)})`,
        responsableId: CONSERJERIA,
        dia: 'Hoy',
        hora: null,
        porque: `Dirección lo ha marcado como averiado en VELT.`,
      },
    ]);
    vibra();
    toast(`${m.nombre} marcado como averiado. Conserjería ya tiene la tarea.`, {
      etiqueta: 'Deshacer',
      fn: () => cfg.editarMaterial(m.id, { estado: 'ok', nota: undefined }),
    });
  };

  return (
    <Animated.View exiting={sale} layout={recoloca} style={[s.fila, m.estado === 'averiado' && { borderLeftColor: color.rojo }]}>
      <View style={s.filaArriba}>
        <View style={{ flex: 1, minWidth: 180 }}>
          <Text style={s.nombre}>
            {m.nombre}
            {m.cantidad > 1 ? <Text style={s.cantidad}> · {m.cantidad} uds.</Text> : null}
          </Text>
          <Pressable onPress={() => setPanel(panel === 'lugar' ? null : 'lugar')} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
            <Text style={s.lugar}>Está en: {cfg.nombreEspacio(m.espacio)} ▾</Text>
          </Pressable>
          {m.estado === 'averiado' && m.nota ? <Text style={s.nota}>{m.nota}</Text> : null}
        </View>
        <Text style={[s.estado, { backgroundColor: tono.bg, color: tono.tx }]}>{tono.t}</Text>
        <View style={s.acciones}>
          {m.estado === 'prestado' ? (
            <Accion
              texto="Devolver"
              onPress={() => {
                cfg.editarMaterial(m.id, { estado: 'ok', prestadoA: undefined });
                toast(`${m.nombre} devuelto.`);
              }}
            />
          ) : m.estado === 'ok' ? (
            <Accion texto="Prestar" onPress={() => setPanel(panel === 'prestar' ? null : 'prestar')} />
          ) : null}
          {m.estado === 'averiado' ? (
            <Accion
              texto="Ya funciona"
              onPress={() => {
                cfg.editarMaterial(m.id, { estado: 'ok', nota: undefined });
                vibra('exito');
                toast(`${m.nombre} reparado.`);
              }}
            />
          ) : (
            <Accion texto="Averiado" peligro onPress={averiado} />
          )}
          <Accion
            texto="✕"
            onPress={() => {
              cfg.quitarMaterial(m.id);
              toast(`${m.nombre} borrado del inventario.`);
            }}
          />
        </View>
      </View>

      {panel === 'lugar' && (
        <Animated.View entering={entra(0)} style={s.elegir}>
          {[{ id: null as string | null, nombre: 'Almacén' }, ...cfg.espacios].map((e) => (
            <Pressable
              key={e.id ?? 'almacen'}
              onPress={() => {
                cfg.editarMaterial(m.id, { espacio: e.id });
                setPanel(null);
              }}
              style={[s.opcion, m.espacio === e.id && s.opcionOn]}
            >
              <Text style={[s.opcionTexto, m.espacio === e.id && { color: color.crema }]}>{e.nombre}</Text>
            </Pressable>
          ))}
        </Animated.View>
      )}
      {panel === 'prestar' && (
        <Animated.View entering={entra(0)} style={s.elegir}>
          <Mono style={{ width: '100%', marginBottom: 4 }}>{'// '}¿A quién se lo prestas?</Mono>
          {activos().filter((p) => p.id !== DIRECTOR.id).map((p) => (
            <Pressable
              key={p.id}
              onPress={() => {
                cfg.editarMaterial(m.id, { estado: 'prestado', prestadoA: p.id });
                setPanel(null);
                vibra();
                toast(`${m.nombre} prestado a ${p.nombre}.`, { etiqueta: 'Deshacer', fn: () => cfg.editarMaterial(m.id, { estado: 'ok', prestadoA: undefined }) });
              }}
              style={[s.opcion, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
            >
              <Avatar id={p.id} tam={20} />
              <Text style={s.opcionTexto}>{p.nombre}</Text>
            </Pressable>
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
}

function Accion({ texto, onPress, peligro }: { texto: string; onPress: () => void; peligro?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={s.accion}>
      {({ hovered }: { hovered?: boolean; pressed: boolean }) => (
        <Text style={[s.accionTexto, hovered && { color: peligro ? color.rojo : color.cobalto }]}>{texto}</Text>
      )}
    </Pressable>
  );
}

function NuevoMaterial({ onHecho }: { onHecho: () => void }) {
  const cfg = useCentro();
  const toast = useToast();
  const [nombre, setNombre] = useState('Proyector');
  const [tipo, setTipo] = useState<TipoMaterial>('proyector');
  const [cuantos, setCuantos] = useState(1);
  const [lote, setLote] = useState(false);
  const [espacio, setEspacio] = useState<string | null>(null);

  const guardar = () => {
    if (!nombre.trim()) return;
    if (lote) cfg.addMaterial({ nombre: nombre.trim(), tipo, cantidad: cuantos, espacio, estado: 'ok' }, 1);
    else cfg.addMaterial({ nombre: nombre.trim(), tipo, cantidad: 1, espacio, estado: 'ok' }, cuantos);
    vibra('exito');
    toast(lote || cuantos === 1 ? `${nombre} añadido.` : `${cuantos} × ${nombre} añadidos, numerados del 1 al ${cuantos}.`);
    onHecho();
  };

  return (
    <Animated.View entering={entra(0)} style={[s.nuevo, cortado(18)]}>
      <Mono style={{ color: color.lima }}>{'// '}Nuevo material</Mono>
      <TextInput value={nombre} onChangeText={setNombre} placeholder="Nombre (p. ej. Proyector Epson)" placeholderTextColor="#6E7385" style={s.nuevoNombre} />
      <View style={s.nuevoFila}>
        {TIPOS_MATERIAL.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => {
              setTipo(t.id);
              if (TIPOS_MATERIAL.some((x) => x.nombre === nombre)) setNombre(t.nombre);
            }}
            style={[s.nuevoChip, tipo === t.id && s.nuevoChipOn]}
          >
            <Text style={[s.nuevoChipTexto, tipo === t.id && { color: color.tinta }]}>{t.nombre}</Text>
          </Pressable>
        ))}
      </View>
      <View style={[s.nuevoFila, { alignItems: 'center' }]}>
        <Text style={s.nuevoEtiqueta}>¿Cuántos?</Text>
        <Pressable onPress={() => setCuantos((c) => Math.max(1, c - 1))} style={s.paso}>
          <Text style={s.pasoTexto}>−</Text>
        </Pressable>
        <Text style={s.cuantos}>{cuantos}</Text>
        <Pressable onPress={() => setCuantos((c) => c + 1)} style={s.paso}>
          <Text style={s.pasoTexto}>+</Text>
        </Pressable>
        {cuantos > 1 && (
          <Pressable onPress={() => setLote((l) => !l)} style={[s.nuevoChip, lote && s.nuevoChipOn, { marginLeft: 8 }]}>
            <Text style={[s.nuevoChipTexto, lote && { color: color.tinta }]}>{lote ? '✓ ' : ''}Es un lote (p. ej. un carro de portátiles)</Text>
          </Pressable>
        )}
      </View>
      <Text style={s.nuevoEtiqueta}>¿Dónde está?</Text>
      <View style={s.nuevoFila}>
        {[{ id: null as string | null, nombre: 'Almacén' }, ...cfg.espacios].map((e) => (
          <Pressable key={e.id ?? 'almacen'} onPress={() => setEspacio(e.id)} style={[s.nuevoChip, espacio === e.id && s.nuevoChipOn]}>
            <Text style={[s.nuevoChipTexto, espacio === e.id && { color: color.tinta }]}>{e.nombre}</Text>
          </Pressable>
        ))}
      </View>
      <Boton variante="lima" fondo={color.tinta} onPress={guardar} disabled={!nombre.trim()} style={{ alignSelf: 'flex-start', marginTop: 16 }}>
        Añadir al inventario
      </Boton>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  resumen: { flexDirection: 'row', gap: 20, backgroundColor: color.tinta, padding: 26, marginTop: 28 },
  datoN: { fontFamily: font.display, fontSize: 48, letterSpacing: -2, color: color.crema },
  datoL: { fontFamily: font.ui, fontSize: 13, color: color.grisClaro, marginTop: 2 },
  barra: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22 },
  filtro: { borderWidth: 1.5, borderColor: color.tinta, paddingVertical: 7, paddingHorizontal: 11 },
  filtroOn: { backgroundColor: color.tinta },
  filtroTexto: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderTopWidth: 3, borderTopColor: color.tinta, paddingTop: 10, marginBottom: 6 },
  cabTexto: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta },
  cabSub: { fontFamily: font.mono, fontSize: 11, color: color.gris },
  vacio: { fontFamily: font.ui, fontSize: 14, color: color.gris, marginTop: 24 },
  fila: { backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, borderLeftWidth: 4, borderLeftColor: color.cobalto, padding: 14, marginTop: 8 },
  filaArriba: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  nombre: { fontFamily: font.uiBold, fontSize: 15, color: color.tinta },
  cantidad: { fontFamily: font.ui, color: color.gris },
  lugar: { fontFamily: font.ui, fontSize: 13, color: color.gris, marginTop: 3 },
  nota: { fontFamily: font.ui, fontSize: 12, color: color.rojo, marginTop: 3 },
  estado: { fontFamily: font.uiBold, fontSize: 12, paddingHorizontal: 8, paddingVertical: 4 },
  acciones: { flexDirection: 'row', gap: 4 },
  accion: { paddingVertical: 6, paddingHorizontal: 8 },
  accionTexto: { fontFamily: font.uiBold, fontSize: 13, color: color.tinta, textDecorationLine: 'underline' },
  elegir: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, padding: 12, backgroundColor: color.crema },
  opcion: { borderWidth: 1, borderColor: color.borde, backgroundColor: color.blanco, paddingVertical: 6, paddingHorizontal: 10 },
  opcionOn: { backgroundColor: color.cobalto, borderColor: color.cobalto },
  opcionTexto: { fontFamily: font.uiMedium, fontSize: 13, color: color.tinta },
  nuevo: { backgroundColor: color.tinta, padding: 22, marginTop: 16 },
  nuevoNombre: { fontFamily: font.displayBold, fontSize: 22, color: color.crema, textTransform: 'uppercase', borderBottomWidth: 2, borderBottomColor: '#2A2E3A', paddingVertical: 8, marginTop: 10, outlineStyle: 'none' } as never,
  nuevoFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  nuevoChip: { borderWidth: 1, borderColor: '#3A3F52', paddingVertical: 6, paddingHorizontal: 10 },
  nuevoChipOn: { backgroundColor: color.lima, borderColor: color.lima },
  nuevoChipTexto: { fontFamily: font.uiMedium, fontSize: 13, color: color.crema },
  nuevoEtiqueta: { fontFamily: font.uiMedium, fontSize: 13, color: color.grisClaro, marginTop: 14, marginRight: 6 },
  paso: { width: 32, height: 32, backgroundColor: color.crema, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  pasoTexto: { fontFamily: font.monoBold, fontSize: 18, color: color.tinta },
  cuantos: { fontFamily: font.display, fontSize: 24, color: color.crema, minWidth: 40, textAlign: 'center', marginTop: 10 },
});
