// Mapa del centro: qué espacio está ocupado y dónde está cada persona en
// cada franja. Se puede «reproducir el día» para ver cómo se mueve el centro,
// marcar una ausencia y cubrir su clase con quien está de guardia.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { TitularRevela } from '../components/motion';
import { Avatar, Boton, Contador, cortado, Mono } from '../components/ui';
import {
  Clase,
  esClase,
  esLugar,
  ESPACIOS,
  FRANJAS,
  franjaActual,
  HORARIO,
  MATERIA,
  PASILLO,
  PLANTAS,
  RESERVAS_INICIALES,
} from '../data/centro';
import { CENTRO, EQUIPO, persona } from '../data/equipo';
import { entra, recoloca, vibra } from '../lib/motion';
import { useVelt } from '../lib/store';
import { useToast } from '../lib/toast';
import { ANCHO_ESCRITORIO, color, font } from '../lib/theme';

type Estado = 'ocupada' | 'libre' | 'reservada' | 'mantenimiento' | 'sinprofe' | 'cubierta';

type Celda = { estado: Estado; titulo: string; detalle: string; personas: string[] };

const ESTILO: Record<Estado, { bg: string; borde: string; etiqueta: string; texto: string; acento: string }> = {
  ocupada: { bg: color.azulSuave, borde: color.cobalto, etiqueta: 'Ocupada', texto: color.cobalto, acento: color.cobalto },
  libre: { bg: 'transparent', borde: '#C9C3B4', etiqueta: 'Libre', texto: color.tinta, acento: color.gris },
  reservada: { bg: color.lima, borde: color.lima, etiqueta: 'Reservada', texto: color.tinta, acento: color.tinta },
  mantenimiento: { bg: '#E7E3D8', borde: '#C9C3B4', etiqueta: 'Mantenimiento', texto: color.tinta, acento: color.gris },
  sinprofe: { bg: color.rojo, borde: color.rojo, etiqueta: 'Sin profesor', texto: color.blanco, acento: color.blanco },
  cubierta: { bg: color.tinta, borde: color.tinta, etiqueta: 'Guardia', texto: color.lima, acento: color.lima },
};

export default function Centro() {
  const { width } = useWindowDimensions();
  const ancho = width >= ANCHO_ESCRITORIO;
  const lado = width >= 1300;
  const { enviar } = useVelt();
  const toast = useToast();

  const ahora = useMemo(() => franjaActual(), []);
  const [franja, setFranja] = useState(ahora.franja);
  const [planta, setPlanta] = useState('p1');
  const [reproduciendo, setReproduciendo] = useState(false);
  const [ausentes, setAusentes] = useState<string[]>([]);
  const [cubiertas, setCubiertas] = useState<Record<string, string>>({}); // 'f:espacio' → id de quien cubre
  const [reservas, setReservas] = useState<Record<string, string>>(RESERVAS_INICIALES);
  const [foco, setFoco] = useState<string | null>(null);
  const reloj = useRef<ReturnType<typeof setInterval> | null>(null);

  // «Reproducir el día»: avanza una franja cada 1,6 s y vuelve a empezar al final
  useEffect(() => {
    if (!reproduciendo) return;
    reloj.current = setInterval(() => {
      setFranja((f) => {
        if (f >= FRANJAS.length - 1) {
          setReproduciendo(false);
          return f;
        }
        return f + 1;
      });
    }, 1600);
    return () => {
      if (reloj.current) clearInterval(reloj.current);
    };
  }, [reproduciendo]);

  // Dónde está cada persona en la franja elegida
  const ubicaciones = useMemo(() => {
    const r: Record<string, { espacio: string | null; texto: string; tipo: 'clase' | 'guardia' | 'libre' | 'fijo' | 'ausente' | 'cubre' }> = {};
    for (const p of EQUIPO) {
      const h = HORARIO[p.id]?.[franja];
      const cubre = Object.entries(cubiertas).find(([k, quien]) => quien === p.id && k.startsWith(`${franja}:`));
      if (ausentes.includes(p.id)) r[p.id] = { espacio: null, texto: 'Ausente hoy', tipo: 'ausente' };
      else if (cubre) r[p.id] = { espacio: cubre[0].split(':')[1], texto: `Cubre ${ESPACIOS[cubre[0].split(':')[1]].nombre}`, tipo: 'cubre' };
      else if (!h) r[p.id] = { espacio: null, texto: '—', tipo: 'libre' };
      else if (esClase(h)) r[p.id] = { espacio: h.espacio, texto: ESPACIOS[h.espacio].tipo === 'aula' ? h.grupo : `${ESPACIOS[h.espacio].nombre} · ${h.grupo}`, tipo: 'clase' };
      else if (esLugar(h)) r[p.id] = { espacio: h.lugar, texto: h.motivo === ESPACIOS[h.lugar].nombre ? h.motivo : `${ESPACIOS[h.lugar].nombre} · ${h.motivo}`, tipo: 'fijo' };
      else if (h === 'guardia') r[p.id] = { espacio: null, texto: `Guardia · ${PASILLO}`, tipo: 'guardia' };
      else r[p.id] = { espacio: 'SALA', texto: 'Sala de profesores', tipo: 'libre' };
    }
    return r;
  }, [franja, ausentes, cubiertas]);

  // Estado de cada espacio en la franja elegida
  const celdas = useMemo(() => {
    const r: Record<string, Celda> = {};
    for (const e of Object.values(ESPACIOS)) {
      const clase = Object.entries(HORARIO).find(([, hs]) => esClase(hs[franja]) && (hs[franja] as Clase).espacio === e.id);
      const presentes = EQUIPO.filter((p) => ubicaciones[p.id].espacio === e.id).map((p) => p.id);
      const reserva = reservas[`${franja}:${e.id}`];
      const cubre = cubiertas[`${franja}:${e.id}`];
      if (e.incidencia) r[e.id] = { estado: 'mantenimiento', titulo: e.nombre, detalle: e.incidencia, personas: [] };
      else if (clase) {
        const [profe, hs] = clase;
        const k = hs[franja] as Clase;
        const nombre = persona(profe)!.nombre;
        if (ausentes.includes(profe) && cubre) r[e.id] = { estado: 'cubierta', titulo: k.grupo, detalle: `${k.materia} · cubre ${persona(cubre)!.nombre}`, personas: [cubre] };
        else if (ausentes.includes(profe)) r[e.id] = { estado: 'sinprofe', titulo: k.grupo, detalle: `${k.materia} · falta ${nombre}`, personas: [] };
        else r[e.id] = { estado: 'ocupada', titulo: e.tipo === 'aula' ? k.grupo : e.nombre, detalle: e.tipo === 'aula' ? `${k.materia} · ${nombre}` : `${k.materia} ${k.grupo} · ${nombre}`, personas: [profe] };
      } else if (reserva) r[e.id] = { estado: 'reservada', titulo: e.nombre, detalle: reserva, personas: presentes };
      else if (presentes.length && e.tipo !== 'aula') {
        r[e.id] = {
          estado: 'ocupada',
          titulo: e.nombre,
          detalle: presentes.length > 1 ? `${presentes.length} personas` : persona(presentes[0])!.nombre,
          personas: presentes,
        };
      } else r[e.id] = { estado: 'libre', titulo: e.nombre, detalle: FRANJAS[franja].recreo ? 'Recreo' : 'Sin clase', personas: [] };
    }
    return r;
  }, [franja, ubicaciones, reservas, ausentes, cubiertas]);

  const aulas = Object.values(ESPACIOS).filter((e) => e.tipo === 'aula' || e.tipo === 'especial');
  const ocupadas = aulas.filter((e) => ['ocupada', 'sinprofe', 'cubierta', 'reservada'].includes(celdas[e.id].estado)).length;
  const libres = aulas.filter((e) => celdas[e.id].estado === 'libre');
  const sinProfe = Object.values(ESPACIOS).filter((e) => celdas[e.id].estado === 'sinprofe');
  const deGuardia = EQUIPO.filter((p) => ubicaciones[p.id].tipo === 'guardia');
  const enSala = EQUIPO.filter((p) => ubicaciones[p.id].tipo === 'libre' && HORARIO[p.id]?.[franja] === 'libre');

  // Ocupación por franja, para el gráfico de abajo
  const ocupacionDia = FRANJAS.map((f) => aulas.filter((e) => Object.values(HORARIO).some((hs) => esClase(hs[f.id]) && (hs[f.id] as Clase).espacio === e.id)).length);

  const marcarAusente = (id: string) => {
    vibra();
    if (ausentes.includes(id)) {
      setAusentes((a) => a.filter((x) => x !== id));
      setCubiertas((c) => Object.fromEntries(Object.entries(c).filter(([k]) => !HORARIO[id].some((h, f) => esClase(h) && k === `${f}:${h.espacio}`))));
      toast(`${persona(id)!.nombre} ya no está ausente.`);
    } else {
      setAusentes((a) => [...a, id]);
      const clases = HORARIO[id].filter(esClase).length;
      toast(`${persona(id)!.nombre} ausente hoy: ${clases} clases sin profesor. VELT te propone guardias.`);
    }
  };

  const cubrir = (espacioId: string, quien: string) => {
    const k = Object.entries(HORARIO).find(([, hs]) => esClase(hs[franja]) && (hs[franja] as Clase).espacio === espacioId)!;
    const clase = k[1][franja] as Clase;
    setCubiertas((c) => ({ ...c, [`${franja}:${espacioId}`]: quien }));
    enviar([
      {
        id: `guardia-${franja}-${espacioId}-${Date.now()}`,
        titulo: `Cubrir ${clase.materia} con ${clase.grupo} (${FRANJAS[franja].nombre})`,
        responsableId: quien,
        dia: 'Hoy',
        hora: FRANJAS[franja].inicio,
        porque: `${persona(k[0])!.nombre} está ausente hoy. Aula ${ESPACIOS[espacioId].nombre}.`,
      },
    ]);
    vibra('exito');
    toast(`Guardia enviada a ${persona(quien)!.nombre}. Ya lo tiene en su móvil.`);
  };

  const reservar = (espacioId: string) => {
    setReservas((r) => ({ ...r, [`${franja}:${espacioId}`]: 'Reservada por dirección' }));
    vibra();
    toast(`${ESPACIOS[espacioId].nombre} reservada a ${FRANJAS[franja].nombre} (${FRANJAS[franja].inicio}).`, {
      etiqueta: 'Deshacer',
      fn: () => setReservas((r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== `${franja}:${espacioId}`))),
    });
  };

  const f = FRANJAS[franja];
  const p = PLANTAS.find((x) => x.id === planta)!;

  return (
    <View>
      <Animated.View entering={entra(0)}>
        <Mono style={{ marginBottom: 14 }}>
          // {CENTRO} · 3 plantas · {Object.keys(ESPACIOS).length} espacios
        </Mono>
      </Animated.View>
      <TitularRevela texto={'Mapa\ndel centro.'} tam={ancho ? 76 : 44} />

      {/* Franjas: la línea del día. Al tocar una, el centro se mueve. */}
      <Animated.View entering={entra(2, 150)} style={{ marginTop: 26 }}>
        <View style={s.franjas}>
          {FRANJAS.map((x) => {
            const on = x.id === franja;
            return (
              <Pressable
                key={x.id}
                onPress={() => {
                  setReproduciendo(false);
                  setFranja(x.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${x.nombre}, ${x.inicio}`}
                style={[s.franja, on && s.franjaOn, x.recreo && !on && { borderStyle: 'dashed' }]}
              >
                <Text style={[s.franjaHora, on && { color: color.lima }]}>{x.inicio}</Text>
                <Text style={[s.franjaNombre, on && { color: color.grisClaro }]}>{x.nombre}</Text>
                {x.id === ahora.franja && ahora.real && <View style={s.ahoraPunto} />}
              </Pressable>
            );
          })}
        </View>
        <View style={s.controles}>
          <Boton
            variante={reproduciendo ? 'tinta' : 'principal'}
            pequeno
            onPress={() => {
              if (!reproduciendo && franja >= FRANJAS.length - 1) setFranja(0);
              setReproduciendo((r) => !r);
            }}
          >
            {reproduciendo ? '❚❚  Pausa' : '▶  Reproducir el día'}
          </Boton>
          <Mono>
            {f.nombre} · {f.inicio}–{f.fin}
            {ahora.real ? (franja === ahora.franja ? ' · ahora' : '') : ' · simulado'}
          </Mono>
        </View>
      </Animated.View>

      <View style={[s.cuerpo, !lado && { flexDirection: 'column' }]}>
        {/* Mapa */}
        <View style={lado ? { flex: 1.6 } : undefined}>
          <View style={s.plantas}>
            {PLANTAS.map((x) => (
              <Pressable key={x.id} onPress={() => setPlanta(x.id)} accessibilityRole="tab" style={[s.planta, x.id === planta && s.plantaOn, cortado(6)]}>
                <Text style={[s.plantaTexto, x.id === planta && { color: color.crema }]}>{x.nombre}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.mapa}>
            {p.filas.map((fila, i) => (
              <View key={i}>
                {i > 0 && (
                  <View style={s.pasillo}>
                    <View style={s.pasilloLinea} />
                    <Text style={s.pasilloTexto}>Pasillo</Text>
                    <View style={s.pasilloLinea} />
                  </View>
                )}
                <View style={s.fila}>
                  {fila.map((id, j) => (
                    <CeldaMapa
                      key={id}
                      id={id}
                      c={celdas[id]}
                      franja={franja}
                      orden={i * 4 + j}
                      foco={!!foco && celdas[id].personas.includes(foco)}
                      movil={!ancho}
                    />
                  ))}
                </View>
              </View>
            ))}
            <View style={s.leyenda}>
              {(['ocupada', 'libre', 'reservada', 'mantenimiento', 'sinprofe'] as Estado[]).map((e) => (
                <View key={e} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[s.leyendaCuadro, { backgroundColor: ESTILO[e].bg === 'transparent' ? color.crema : ESTILO[e].bg, borderColor: ESTILO[e].borde }]} />
                  <Text style={s.leyendaTexto}>{ESTILO[e].etiqueta}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Ocupación del día: cada barra lleva a su franja */}
          <View style={[s.ocupacion, cortado(16)]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <Text style={s.ocupacionTitulo}>Ocupación del día</Text>
              <Mono>Aulas ocupadas por franja</Mono>
            </View>
            <View style={s.barras}>
              {ocupacionDia.map((n, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    setReproduciendo(false);
                    setFranja(i);
                  }}
                  style={{ flex: 1, alignItems: 'center', gap: 6 }}
                  accessibilityLabel={`${FRANJAS[i].nombre}: ${n} aulas`}
                >
                  <View style={s.barraHueco}>
                    <Animated.View
                      layout={recoloca}
                      style={[s.barra, { height: `${(n / aulas.length) * 100}%` }, i === franja ? { backgroundColor: color.cobalto } : null]}
                    />
                  </View>
                  <Text style={[s.barraEtiqueta, i === franja && { color: color.cobalto }]}>{FRANJAS[i].inicio.slice(0, 2)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Panel lateral: ahora, ausencias y personal */}
        <View style={lado ? { flex: 1 } : undefined}>
          <View style={[s.ahora, cortado(22)]}>
            <Mono style={{ color: color.lima }}>
              // {franja === ahora.franja && ahora.real ? 'Ahora' : f.nombre} · {f.inicio}
            </Mono>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
              <Contador valor={ocupadas} style={s.ahoraN} />
              <Text style={s.ahoraDe}>de {aulas.length} aulas ocupadas</Text>
            </View>

            {sinProfe.length > 0 && (
              <Animated.View entering={FadeIn.duration(260)} style={s.alerta}>
                <Text style={s.alertaTitulo}>
                  {sinProfe.length} {sinProfe.length === 1 ? 'clase sin profesor' : 'clases sin profesor'}
                </Text>
                {sinProfe.map((e) => (
                  <View key={e.id} style={{ marginTop: 10 }}>
                    <Text style={s.alertaTexto}>
                      {celdas[e.id].titulo} · {celdas[e.id].detalle}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {(deGuardia.length ? deGuardia : enSala).slice(0, 3).map((x) => (
                        <Boton key={x.id} variante="lima" fondo={color.tinta} pequeno onPress={() => cubrir(e.id, x.id)}>
                          {`Cubrir con ${x.nombre}${deGuardia.length ? ' · guardia' : ''}`}
                        </Boton>
                      ))}
                      {!deGuardia.length && !enSala.length && <Text style={s.alertaTexto}>No hay nadie libre en esta franja.</Text>}
                    </View>
                  </View>
                ))}
              </Animated.View>
            )}

            <Text style={s.ahoraSub}>Libres</Text>
            <Text style={s.ahoraTexto}>{libres.length ? libres.map((e) => e.nombre).join(' · ') : 'Ninguna aula libre en esta franja.'}</Text>
            {libres.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {libres.slice(0, 3).map((e) => (
                  <Boton key={e.id} variante="blanco" fondo={color.tinta} pequeno onPress={() => reservar(e.id)}>
                    {`Reservar ${e.nombre}`}
                  </Boton>
                ))}
              </View>
            )}

            <Text style={s.ahoraSub}>Incidencia</Text>
            <Text style={s.ahoraTexto}>Informática: {ESPACIOS.INF.incidencia?.toLowerCase()}. Mantenimiento ya tiene la tarea.</Text>
          </View>

          <View style={s.personal}>
            <View style={s.cabecera}>
              <Text style={s.cabTexto}>Dónde está el personal</Text>
              <Mono>{f.inicio}</Mono>
            </View>
            {EQUIPO.map((x, i) => {
              const u = ubicaciones[x.id];
              const tono =
                u.tipo === 'ausente'
                  ? { bg: color.rojo, tx: color.blanco }
                  : u.tipo === 'guardia' || u.tipo === 'cubre'
                    ? { bg: color.tinta, tx: color.lima }
                    : u.tipo === 'clase'
                      ? { bg: color.azulSuave, tx: color.cobalto }
                      : { bg: '#E7E3D8', tx: color.tinta };
              return (
                <Animated.View key={x.id} entering={entra(i, 300)} layout={recoloca}>
                  <Pressable
                    onPress={() => setFoco((fo) => (fo === x.id ? null : x.id))}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver a ${x.nombre} en el mapa`}
                    style={[s.persona, foco === x.id && { backgroundColor: color.blanco }]}
                  >
                    <Avatar id={x.id} tam={32} activo={foco === x.id} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.personaNombre, u.tipo === 'ausente' && { textDecorationLine: 'line-through', color: color.gris }]}>
                        {x.nombre} {x.apellido}
                      </Text>
                      <Text style={s.personaRol}>{MATERIA[x.id] ?? x.rol}</Text>
                    </View>
                    <Animated.View key={`${x.id}-${u.texto}`} entering={ZoomIn.duration(240)}>
                      <Text style={[s.lugar, { backgroundColor: tono.bg, color: tono.tx }]}>{u.texto}</Text>
                    </Animated.View>
                  </Pressable>
                  {MATERIA[x.id] && (
                    <Pressable onPress={() => marcarAusente(x.id)} accessibilityRole="button" style={s.ausenteBoton}>
                      {({ hovered }: { hovered?: boolean; pressed: boolean }) => (
                        <Text style={[s.ausenteTexto, (hovered || ausentes.includes(x.id)) && { color: color.rojo }]}>
                          {ausentes.includes(x.id) ? 'Quitar ausencia' : 'Marcar ausente hoy'}
                        </Text>
                      )}
                    </Pressable>
                  )}
                </Animated.View>
              );
            })}
            <Text style={s.nota}>Toca a una persona para verla en el mapa. Si marcas a alguien ausente, VELT te dice qué clases quedan sin profesor y quién puede cubrirlas.</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function CeldaMapa({ id, c, franja, orden, foco, movil }: { id: string; c: Celda; franja: number; orden: number; foco: boolean; movil: boolean }) {
  const e = ESTILO[c.estado];
  return (
    <View style={[s.celda, movil && { minWidth: '46%' }, foco && s.celdaFoco]}>
      {/* La clave cambia con la franja: cada celda vuelve a entrar, en ola */}
      <Animated.View
        key={`${id}-${franja}-${c.estado}-${c.titulo}`}
        entering={FadeIn.delay(orden * 45).duration(320)}
        style={[
          s.celdaDentro,
          { backgroundColor: e.bg, borderColor: e.borde },
          c.estado === 'libre' && { borderStyle: 'dashed' },
        ]}
      >
        <Text style={[s.celdaEstado, { color: e.acento }]}>{e.etiqueta}</Text>
        <Text style={[s.celdaTitulo, { color: e.texto }]}>{c.titulo}</Text>
        <Text style={[s.celdaDetalle, { color: c.estado === 'sinprofe' || c.estado === 'cubierta' ? e.texto : color.gris }]} numberOfLines={2}>
          {c.detalle}
        </Text>      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  franjas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  franja: { borderWidth: 1.5, borderColor: color.tinta, paddingVertical: 8, paddingHorizontal: 12, minWidth: 82 },
  franjaOn: { backgroundColor: color.tinta },
  franjaHora: { fontFamily: font.monoBold, fontSize: 14, color: color.tinta },
  franjaNombre: { fontFamily: font.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: color.gris, marginTop: 2 },
  ahoraPunto: { position: 'absolute', top: 6, right: 6, width: 7, height: 7, backgroundColor: color.lima },
  controles: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14, flexWrap: 'wrap' },
  cuerpo: { flexDirection: 'row', gap: 28, marginTop: 28, alignItems: 'flex-start' },
  plantas: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  planta: { paddingVertical: 7, paddingHorizontal: 12, backgroundColor: '#E7E3D8' },
  plantaOn: { backgroundColor: color.tinta },
  plantaTexto: { fontFamily: font.monoBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: color.tinta },
  mapa: { backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, padding: 18 },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pasillo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 },
  pasilloLinea: { flex: 1, borderTopWidth: 1, borderTopColor: color.borde, borderStyle: 'dashed' },
  pasilloTexto: { fontFamily: font.mono, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: color.gris },
  celda: { flex: 1, minWidth: 130, minHeight: 112 },
  celdaFoco: { transform: [{ translateY: -3 }], boxShadow: `4px 4px 0 ${color.tinta}` },
  celdaDentro: { flex: 1, borderWidth: 1.5, padding: 11 },
  celdaEstado: { fontFamily: font.monoBold, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  celdaTitulo: { fontFamily: font.uiBold, fontSize: 15, marginTop: 14 },
  celdaDetalle: { fontFamily: font.ui, fontSize: 12, lineHeight: 16, marginTop: 3 },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 16 },
  leyendaCuadro: { width: 11, height: 11, borderWidth: 1.5 },
  leyendaTexto: { fontFamily: font.ui, fontSize: 12, color: color.gris },
  ocupacion: { backgroundColor: color.blanco, borderWidth: 1, borderColor: color.borde, padding: 18, marginTop: 14 },
  ocupacionTitulo: { fontFamily: font.display, fontSize: 18, textTransform: 'uppercase', color: color.tinta },
  barras: { flexDirection: 'row', gap: 8, height: 120 },
  barraHueco: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  barra: { width: '100%', backgroundColor: color.azulSuave },
  barraEtiqueta: { fontFamily: font.mono, fontSize: 11, color: color.gris },
  ahora: { backgroundColor: color.tinta, padding: 24 },
  ahoraN: { fontFamily: font.display, fontSize: 64, color: color.crema, letterSpacing: -2 },
  ahoraDe: { fontFamily: font.uiMedium, fontSize: 15, color: color.grisClaro },
  ahoraSub: { fontFamily: font.uiBold, fontSize: 15, color: color.crema, marginTop: 20 },
  ahoraTexto: { fontFamily: font.ui, fontSize: 14, lineHeight: 20, color: color.grisClaro, marginTop: 4 },
  alerta: { backgroundColor: '#3A1416', borderLeftWidth: 4, borderLeftColor: color.rojo, padding: 14, marginTop: 16 },
  alertaTitulo: { fontFamily: font.display, fontSize: 16, textTransform: 'uppercase', color: '#FF8A8A' },
  alertaTexto: { fontFamily: font.ui, fontSize: 13, color: color.crema },
  personal: { marginTop: 22 },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderTopWidth: 3, borderTopColor: color.tinta, paddingTop: 10, marginBottom: 6 },
  cabTexto: { fontFamily: font.monoBold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: color.tinta },
  persona: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingHorizontal: 6, marginHorizontal: -6 },
  personaNombre: { fontFamily: font.uiBold, fontSize: 14, color: color.tinta },
  personaRol: { fontFamily: font.ui, fontSize: 12, color: color.gris },
  lugar: { fontFamily: font.monoBold, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 7, paddingVertical: 4, maxWidth: 190, textAlign: 'right' },
  ausenteBoton: { marginLeft: 44, paddingVertical: 4, alignSelf: 'flex-start' },
  ausenteTexto: { fontFamily: font.mono, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: color.gris, textDecorationLine: 'underline' },
  nota: { fontFamily: font.ui, fontSize: 12, lineHeight: 18, color: color.gris, marginTop: 14, borderTopWidth: 1, borderTopColor: color.borde, paddingTop: 10 },
});
