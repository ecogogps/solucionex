'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  MapPinned, 
  Loader2,
  Calendar,
  ChevronRight
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface HistoryRecord {
  id: string;
  estado: string;
  created_at: string;
}

interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  paqueteId: string;
  guiaNumero: string;
}

const statusMasterList = [
  { id: 'buscando_operador', label: 'Solicitud Creada' },
  { id: 'pendiente', label: 'Operador Asignado' },
  { id: 'camino_a_retirar', label: 'En camino a retirar' },
  { id: 'llegado_a_origen', label: 'Llegado a origen' },
  { id: 'paquete_retirado', label: 'Retirado de origen' },
  { id: 'en_ruta', label: 'En tránsito a destino' },
  { id: 'llegado', label: 'Llegado a destino' },
  { id: 'finalizado', label: 'Finalización de Entrega' }
];

const finalStates = ['entregado', 'entregado_novedad', 'cancelado', 'anulado_retornar'];

export function TrackingModal({ isOpen, onClose, paqueteId, guiaNumero }: TrackingModalProps) {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && paqueteId) {
      fetchHistory();
    }
  }, [isOpen, paqueteId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('paquetes_historial')
        .select('*')
        .eq('paquete_id', paqueteId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Intl.DateTimeFormat('es-EC', {
      timeZone: 'America/Guayaquil',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(dateStr));
  };

  const getRecordForStatus = (statusId: string) => {
    if (statusId === 'finalizado') {
      return history.find(h => finalStates.includes(h.estado));
    }
    return history.find(h => h.estado === statusId);
  };

  const getFinalStatusLabel = () => {
    const finalRecord = history.find(h => finalStates.includes(h.estado));
    if (!finalRecord) return "Finalización de Entrega";
    
    switch (finalRecord.estado) {
      case 'entregado': return 'ENTREGADO CON ÉXITO';
      case 'entregado_novedad': return 'ENTREGADO CON NOVEDAD';
      case 'cancelado': return 'NO EJECUTADO';
      case 'anulado_retornar': return 'ANULADO - RETORNAR';
      default: return 'Finalización';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPinned className="h-5 w-5 text-accent" /> Tracking Guía: {guiaNumero}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent mb-4" />
            <p className="text-slate-400 text-sm">Cargando historial...</p>
          </div>
        ) : (
          <div className="relative mt-6 pl-2 pr-2">
            {/* Línea vertical de fondo */}
            <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-white/5" />

            <div className="space-y-8">
              {statusMasterList.map((status, index) => {
                const record = getRecordForStatus(status.id);
                const isExecuted = !!record;
                const label = status.id === 'finalizado' ? getFinalStatusLabel() : status.label;

                return (
                  <div key={status.id} className="relative flex items-start gap-4">
                    {/* Indicador de estado */}
                    <div className={cn(
                      "z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      isExecuted 
                        ? "bg-accent border-accent text-primary" 
                        : "bg-slate-900 border-white/10 text-slate-500"
                    )}>
                      {isExecuted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className={cn(
                        "text-sm font-bold tracking-tight",
                        isExecuted ? "text-white" : "text-slate-500"
                      )}>
                        {label}
                      </span>
                      
                      {isExecuted && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                          <Clock className="h-3 w-3 text-accent/70" />
                          {formatDateTime(record.created_at)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}