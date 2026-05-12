'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CronometroProps {
  paqueteId: string;
  estadoActual: string;
  tiempoRecogida: number; // minutos
  historial: { estado: string }[];
  retrasoEmpresa?: number; // segundos guardados en BD
  retrasoOperador?: number; // segundos guardados en BD
  modo?: 'ambos' | 'operador';
}

const formatTime = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

function useHistorialTime(paqueteId: string, estado: string, enabled: boolean) {
  const [time, setTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }

    const fetchTime = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('paquetes_historial')
        .select('created_at')
        .eq('paquete_id', paqueteId)
        .eq('estado', estado)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data) setTime(new Date(data.created_at));
      setLoading(false);
    };

    fetchTime();

    const channel = supabase
      .channel(`hist-${paqueteId}-${estado}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'paquetes_historial',
        filter: `paquete_id=eq.${paqueteId}`,
      }, fetchTime)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [paqueteId, estado, enabled]);

  return { time, loading };
}

function ItemCronometro({
  label,
  startTime,
  loading,
  limiteSegundos,
  terminado,
  retrasoFinal,
}: {
  label: string;
  startTime: Date | null;
  loading: boolean;
  limiteSegundos: number;
  terminado: boolean;
  retrasoFinal: number;
}) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!startTime || terminado) return;

    setElapsed(Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000)));

    intervalRef.current = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000)));
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [startTime, terminado]);

  const enRetraso = !terminado && elapsed > limiteSegundos;
  const retrasoEnVivo = enRetraso ? elapsed - limiteSegundos : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 min-w-[140px]">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="text-[9px] text-slate-500">...</span>
      </div>
    );
  }

  // Terminado: resultado final desde BD
  if (terminado) {
    const hayRetraso = retrasoFinal > 0;
    return (
      <div className={cn(
        'flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono min-w-[140px]',
        hayRetraso
          ? 'bg-red-500/10 border-red-500/40 text-red-400'
          : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
      )}>
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-1">
          {hayRetraso ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
          <span className="font-black text-xs">
            {hayRetraso ? `+${formatTime(retrasoFinal)}` : 'A tiempo'}
          </span>
        </div>
      </div>
    );
  }

  // Sin inicio aún
  if (!startTime) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 min-w-[140px]">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="text-[9px] text-slate-500">En espera</span>
      </div>
    );
  }

  // Corriendo dentro del límite
  if (!enRetraso) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-accent/30 bg-accent/10 text-accent min-w-[140px]">
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-1 font-mono">
          <Clock className="h-3 w-3 animate-pulse" />
          <span className="font-black text-xs">{formatTime(elapsed)}</span>
        </div>
      </div>
    );
  }

  // Con retraso
  return (
    <div className="flex flex-col gap-0.5 min-w-[140px]">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-red-500/50 bg-red-500/10 text-red-400">
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-1 font-mono">
          <Clock className="h-3 w-3" />
          <span className="font-black text-xs">{formatTime(elapsed)}</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-1 rounded-lg border border-red-500/30 bg-red-500/5 text-red-400">
        <span className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
          <AlertTriangle className="h-2.5 w-2.5" /> Retraso
        </span>
        <span className="font-black text-[10px] font-mono">+{formatTime(retrasoEnVivo)}</span>
      </div>
    </div>
  );
}

export function Cronometro({
  paqueteId,
  estadoActual,
  tiempoRecogida,
  historial = [],
  retrasoEmpresa = 0,
  retrasoOperador = 0,
  modo = 'ambos',
}: CronometroProps) {
  const limiteSegundos = tiempoRecogida * 60;
  const mostrarEmpresa = modo === 'ambos';

  // Terminado cuando paquete_retirado existe en historial
  const empresaTerminada = historial.some(h => h.estado === 'paquete_retirado');
  const operadorTerminado = historial.some(h => h.estado === 'paquete_retirado');

  // Empresa: inicia en 'buscando_operador'
  const { time: empresaStart, loading: loadingEmpresa } = useHistorialTime(
    paqueteId, 'buscando_operador', mostrarEmpresa
  );

  // Operador: inicia en 'pendiente'
  const { time: operadorStart, loading: loadingOperador } = useHistorialTime(
    paqueteId, 'pendiente', true
  );

  return (
    <div className="flex flex-col gap-1.5">
      {mostrarEmpresa && (
        <ItemCronometro
          label="Empresa"
          startTime={empresaStart}
          loading={loadingEmpresa}
          limiteSegundos={limiteSegundos}
          terminado={empresaTerminada}
          retrasoFinal={retrasoEmpresa}
        />
      )}
      <ItemCronometro
        label="Operador"
        startTime={operadorStart}
        loading={loadingOperador}
        limiteSegundos={limiteSegundos}
        terminado={operadorTerminado}
        retrasoFinal={retrasoOperador}
      />
    </div>
  );
}
