'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CronometroProps {
  paqueteId: string;
  estadoActual: string;
  retrasoEmpresa?: number;
  retrasoOperador?: number;
}

export function Cronometro({ paqueteId, estadoActual, retrasoEmpresa = 0, retrasoOperador = 0 }: CronometroProps) {
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const isFinalizado = ['entregado', 'entregado_novedad', 'cancelado', 'anulado_retornar'].includes(estadoActual);

  useEffect(() => {
    if (isFinalizado) return;

    const fetchStartTime = async () => {
      const { data } = await supabase
        .from('paquetes_historial')
        .select('created_at')
        .eq('paquete_id', paqueteId)
        .in('estado', ['pendiente', 'camino_a_retirar'])
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data) {
        setStartTime(new Date(data.created_at));
      }
    };

    fetchStartTime();
  }, [paqueteId, isFinalizado]);

  useEffect(() => {
    if (!startTime || isFinalizado) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));
      setElapsed(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isFinalizado]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isFinalizado) {
    const totalRetraso = (retrasoEmpresa || 0) + (retrasoOperador || 0);
    const hasDelay = totalRetraso > 0;
    
    return (
      <div className={cn(
        "flex flex-col items-center justify-center p-2 rounded-lg border min-w-[100px]",
        hasDelay ? "bg-red-500/10 border-red-500/50 text-red-500" : "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
      )}>
        <span className="text-[9px] font-bold uppercase tracking-wider mb-0.5">Retraso Final</span>
        <div className="flex items-center gap-1.5 font-mono font-black text-xl leading-none">
          <Clock className="h-4 w-4" />
          {formatTime(totalRetraso)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-accent/10 border border-accent/30 text-accent min-w-[100px]">
      <span className="text-[9px] font-bold uppercase tracking-wider mb-0.5">En Proceso</span>
      <div className="flex items-center gap-1.5 font-mono font-black text-2xl leading-none">
        <Clock className="h-5 w-5 animate-pulse" />
        {formatTime(elapsed)}
      </div>
    </div>
  );
}
