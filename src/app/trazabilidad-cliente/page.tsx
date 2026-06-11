'use client';

import { useState, useEffect } from 'react';
import { 
  Search,
  MapPin, 
  Building2, 
  Hash, 
  DollarSign, 
  CreditCard, 
  FileText, 
  Package,
  Loader2,
  AlertCircle,
  MapPinned
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { TrackingModal } from '@/components/TrackingModal';

export default function PublicTrackingPage() {
  const [guiaBusqueda, setGuiaBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [paquete, setPaquete] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);

  // Suscripción en tiempo real para el paquete encontrado
  useEffect(() => {
    if (!paquete?.id) return;

    const channel = supabase
      .channel(`public_tracking_${paquete.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'paquetes', 
          filter: `id=eq.${paquete.id}` 
        },
        (payload) => {
          // Actualizamos el estado del paquete manteniendo los datos de la empresa
          setPaquete((prev: any) => ({
            ...prev,
            ...payload.new
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [paquete?.id]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!guiaBusqueda.trim()) return;
  
    setLoading(true);
    setError(null);
    setPaquete(null);
  
    try {
      const { data: rows, error: fetchError } = await supabase
        .from('paquetes')
        .select('*')
        .eq('guia_numero', guiaBusqueda.trim())
        .order('created_at', { ascending: false })
        .limit(1);
  
      if (fetchError) throw fetchError;
  
      if (!rows || rows.length === 0) {
        setError('No se encontró ningún paquete con ese número de guía.');
        setLoading(false);
        return;
      }
  
      const paqueteData = rows[0];
  
      const { data: empresa } = await supabase
        .from('empresas')
        .select('nombre, direccion, logo')
        .eq('id', paqueteData.empresa_id)
        .maybeSingle();
  
      setPaquete({ ...paqueteData, empresas: empresa });
  
    } catch (err: any) {
      console.error("Error:", err);
      setError('Ocurrió un error al consultar la información.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pedido_listo': return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">PEDIDO LISTO</Badge>;
      case 'entregado': return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">ENTREGADO CON ÉXITO</Badge>;
      case 'entregado_novedad': return <Badge className="bg-green-600/20 text-green-500 border-green-600/50">ENTREGADO CON NOVEDAD</Badge>;
      case 'llegado': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">LLEGÓ AL DESTINO</Badge>;
      case 'en_ruta': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">EN TRÁNSITO</Badge>;
      case 'camino_a_retirar': return <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/50">EN CAMINO A RETIRAR</Badge>;
      case 'llegado_a_origen': return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/50">LLEGADO A ORIGEN</Badge>;
      case 'paquete_retirado': return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">RETIRADO DE ORIGEN</Badge>;
      case 'demorado_despacho': return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">DEMORADO DESPACHO</Badge>;
      case 'demorado_operador': return <Badge className="bg-red-600/20 text-red-300 border-red-600/50">DEMORADO OPERADOR</Badge>;
      case 'no_listo': return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">NO LISTO</Badge>;
      case 'cancelado': return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">NO EJECUTADO</Badge>;
      case 'anulado_retornar': return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">ANULADO - RETORNAR</Badge>;
      case 'buscando_operador': return <Badge variant="outline" className="text-accent border-accent/50">BUSCANDO OPERADOR</Badge>;
      default: return <Badge variant="outline" className="text-orange-400 border-orange-400/50">PENDIENTE</Badge>;
    }
  };

  return (
    <main className="min-h-screen bg-background text-white p-4 md:p-8 flex flex-col items-center">
      {/* Header / Logo */}
      <div className="flex flex-col items-center mb-10 text-center">
        <img 
          src="/logo/impresion logo white.png" 
          alt="Solucionex Logo" 
          className="h-16 w-auto object-contain mb-3"
        />
        <p className="text-slate-400 text-sm font-medium">Trazabilidad de Paquetes</p>
      </div>

      <div className="w-full max-w-2xl space-y-6">
        {/* Buscador */}
        <Card className="bg-white/5 border-white/10 shadow-2xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Consulta</CardTitle>
            <CardDescription className="text-slate-400">Ingresa el número de guía asignado a tu paquete</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input 
                  placeholder="Ej: GU-001" 
                  value={guiaBusqueda}
                  onChange={(e) => setGuiaBusqueda(e.target.value)}
                  className="bg-white/5 border-white/10 pl-10 focus-visible:ring-accent h-12"
                />
              </div>
              <Button 
                type="submit" 
                className="bg-accent text-primary font-bold h-12 px-8 hover:bg-accent/90"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Search className="h-5 w-5 mr-2" /> Buscar</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Resultados */}
        {paquete && (
          <Card className="bg-white/5 border-white/10 shadow-2xl backdrop-blur-sm animate-in zoom-in-95 duration-300">
            <CardHeader className="border-b border-white/5 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-accent flex items-center gap-2">
                  <Package className="h-5 w-5" /> Guía: {paquete.guia_numero}
                </CardTitle>
                <CardDescription className="text-slate-500 text-[10px] mt-1">Sincronizado en tiempo real</CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                {getStatusBadge(paquete.estado)}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-accent/30 text-accent hover:bg-accent/10 h-7 gap-1 text-[10px] font-bold"
                  onClick={() => setIsTrackingOpen(true)}
                >
                  <MapPinned className="h-3 w-3" /> Ver Historial
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Origen */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-start gap-4">
                <Building2 className="h-5 w-5 text-accent shrink-0 mt-1" />
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Origen (Empresa)</p>
                  <p className="text-sm font-bold text-white">{paquete.empresas?.nombre || 'Empresa Aliada'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{paquete.empresas?.direccion}</p>
                </div>
              </div>

              {/* Destino */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-start gap-4">
                <MapPin className="h-5 w-5 text-accent shrink-0 mt-1" />
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Destino de Entrega</p>
                  <p className="text-sm font-medium text-slate-200">{paquete.direccion}</p>
                </div>
              </div>

              {/* Detalles económicos */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1 mb-1">
                    <DollarSign className="w-3 h-3" /> Valor Pedido
                  </p>
                  <p className="text-xl font-black text-accent">${paquete.valor_pedido?.toFixed(2)}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1 mb-1">
                    <CreditCard className="w-3 h-3" /> Método de Pago
                  </p>
                  <p className="text-sm font-bold capitalize text-slate-200">{paquete.metodo_pago}</p>
                </div>
              </div>

              {/* Nota */}
              {paquete.nota && (
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-start gap-4">
                  <FileText className="h-5 w-5 text-slate-400 shrink-0 mt-1" />
                  <div className="w-full">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Nota</p>
                    <div className="mt-1">
                      {paquete.nota.includes('-') ? (
                        <ul className="list-none p-0 m-0 space-y-1">
                          {paquete.nota.split('-').filter(Boolean).map((part: string, i: number) => (
                            <li key={i} className="text-sm italic text-slate-300 flex items-start gap-2">
                              <span className="shrink-0">-</span>
                              <span>{part.trim()}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm italic text-slate-300">{paquete.nota}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <footer className="mt-auto pt-12 pb-6 text-slate-600 text-[10px] uppercase font-bold tracking-widest text-center">
        &copy; {new Date().getFullYear()} Tmax System
      </footer>

      {paquete && (
        <TrackingModal 
          isOpen={isTrackingOpen}
          onClose={() => setIsTrackingOpen(false)}
          paqueteId={paquete.id}
          guiaNumero={paquete.guia_numero}
        />
      )}
    </main>
  );
}