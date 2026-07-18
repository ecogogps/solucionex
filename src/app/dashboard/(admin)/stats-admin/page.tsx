'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Loader2, 
  Building2, 
  UserCheck, 
  Phone, 
  Clock, 
  ChevronRight,
  Trophy,
  ArrowRight,
  TrendingUp,
  Hash
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from '@/components/ui/sheet';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export default function StatsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    topEmpresas: [],
    topOperadores: [],
    topTelefonos: [],
    distribucion: []
  });

  // Modal states
  const [detailSheet, setDetailSheet] = useState<{
    open: boolean;
    type: 'empresa' | 'telefono';
    title: string;
    id: string;
    loading: boolean;
    data: any[];
  }>({
    open: false,
    type: 'empresa',
    title: '',
    id: '',
    loading: false,
    data: []
  });

  useEffect(() => {
    fetchMainStats();
  }, []);

  const fetchMainStats = async () => {
    setLoading(true);
    try {
      const [
        { data: resEmpresas },
        { data: resOperadores },
        { data: resTelefonos },
        { data: resDistribucion }
      ] = await Promise.all([
        supabase.rpc('stats_admin_top_empresas'),
        supabase.rpc('stats_admin_top_operadores'),
        supabase.rpc('stats_admin_top_telefonos_global'),
        supabase.rpc('stats_admin_distribucion_horaria')
      ]);

      setStats({
        topEmpresas: resEmpresas || [],
        topOperadores: (resOperadores || []).sort((a: any, b: any) => a.promedio_entrega_min - b.promedio_entrega_min),
        topTelefonos: resTelefonos || [],
        distribucion: (resDistribucion || []).map((d: any) => ({
          ...d,
          name: `${d.hora.toString().padStart(2, '0')}:00`
        }))
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerClientes = async (empresaId: string, nombre: string) => {
    setDetailSheet({ open: true, type: 'empresa', title: `Top Clientes: ${nombre}`, id: empresaId, loading: true, data: [] });
    try {
      const { data } = await supabase.rpc('stats_admin_top_telefonos_empresa', { p_empresa_id: empresaId });
      setDetailSheet(prev => ({ ...prev, loading: false, data: data || [] }));
    } catch (error) {
      console.error(error);
    }
  };

  const handleVerEmpresas = async (telefono: string) => {
    setDetailSheet({ open: true, type: 'telefono', title: `Empresas que frecuentan: ${telefono}`, id: telefono, loading: true, data: [] });
    try {
      const { data } = await supabase.rpc('stats_admin_empresas_por_telefono', { p_telefono: telefono });
      setDetailSheet(prev => ({ ...prev, loading: false, data: data || [] }));
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
        <p className="font-medium">Analizando panorama global...</p>
      </div>
    );
  }

  // Lógica para color de barras en distribución horaria
  const maxVal = Math.max(...stats.distribucion.map((d: any) => d.total_paquetes), 0);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <header className="h-16 bg-white/5 border-b border-white/10 flex items-center justify-between px-8 shrink-0">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="text-accent" /> Panel de Analítica
        </h2>
        <Badge variant="outline" className="border-accent/20 text-accent font-bold uppercase text-[10px]">
          Sincronización Realtime
        </Badge>
      </header>

      <main className="flex-1 overflow-y-auto p-8 space-y-8 bg-black/10 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* TOP EMPRESAS */}
          <Card className="bg-white/5 border-white/10 shadow-2xl">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-sm font-black flex items-center gap-2 text-white">
                <Trophy className="w-4 h-4 text-yellow-500" /> RANKING EMPRESAS ALIADAS
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {stats.topEmpresas.map((e: any, index: number) => (
                  <div key={e.id} className="flex items-center gap-4 group">
                    <span className="w-6 text-xs font-black text-slate-500">#{index + 1}</span>
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-200">{e.nombre}</span>
                        <span className="font-mono text-accent">{e.total_entregas} entregas</span>
                      </div>
                      <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="absolute h-full bg-accent transition-all duration-1000 ease-out" 
                          style={{ width: `${(e.total_entregas / stats.topEmpresas[0].total_entregas) * 100}%` }}
                        />
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-[10px] font-bold text-slate-500 hover:text-accent hover:bg-accent/10 gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleVerClientes(e.id, e.nombre)}
                    >
                      Ver clientes <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* TOP OPERADORES */}
          <Card className="bg-white/5 border-white/10 shadow-2xl">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-sm font-black flex items-center gap-2 text-white">
                <UserCheck className="w-4 h-4 text-emerald-500" /> RANKING EFICIENCIA OPERADORES
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {stats.topOperadores.map((o: any, index: number) => (
                  <div key={o.id} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-500">#{index + 1}</span>
                        <span className="text-xs font-bold text-slate-200">{o.nombres}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 font-bold uppercase leading-none">Promedio Entrega</p>
                        <p className="text-sm font-black text-emerald-400">{o.promedio_entrega_min} min</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 items-center">
                      <div className="space-y-1">
                        <p className="text-[9px] text-slate-600 uppercase font-black">Retiro: {o.promedio_retiro_min}m</p>
                        <Progress value={Math.min(100, (o.promedio_retiro_min / 60) * 100)} className="h-1 bg-white/5" />
                      </div>
                      <div className="text-right flex items-center justify-end gap-2">
                        <Badge variant="outline" className="text-[9px] border-white/5 bg-white/5 text-slate-500">
                          {o.total_paquetes} PQ
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TOP TELÉFONOS GLOBALES */}
        <Card className="bg-white/5 border-white/10 shadow-2xl">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-sm font-black flex items-center gap-2 text-white">
              <Phone className="w-4 h-4 text-sky-500" /> CLIENTES MÁS RECURRENTES (GLOBAL)
            </CardTitle>
            <CardDescription className="text-[10px] text-slate-500">Teléfonos con mayor volumen de recepción de paquetes en el sistema</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.topTelefonos.map((t: any, index: number) => (
                  <div key={t.telefono} className="bg-black/20 p-3 rounded-xl border border-white/5 flex items-center justify-between group hover:border-sky-500/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-[10px] font-black text-sky-400">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="text-xs font-mono font-bold text-slate-200">{t.telefono}</p>
                        <p className="text-[10px] text-slate-500">{t.total_pedidos} pedidos recibidos</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-600 hover:text-sky-400 hover:bg-sky-400/10 rounded-full"
                      onClick={() => handleVerEmpresas(t.telefono)}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>

        {/* DISTRIBUCIÓN HORARIA */}
        <Card className="bg-white/5 border-white/10 shadow-2xl">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-sm font-black flex items-center gap-2 text-white">
              <Clock className="w-4 h-4 text-accent" /> DISTRIBUCIÓN DE OPERACIÓN POR HORA
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.distribucion}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#64748b' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#64748b' }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    formatter={(value) => [`${value} paquetes`, 'Volumen']}
                  />
                  <Bar dataKey="total_paquetes" radius={[4, 4, 0, 0]}>
                    {stats.distribucion.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.total_paquetes === 0 ? '#1e293b' : entry.total_paquetes === maxVal ? 'hsl(var(--accent))' : '#3b82f6'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* DETAIL SHEET */}
      <Sheet open={detailSheet.open} onOpenChange={(open) => setDetailSheet(prev => ({ ...prev, open }))}>
        <SheetContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
          <SheetHeader className="pb-6 border-b border-white/5">
            <SheetTitle className="text-white flex items-center gap-2">
              {detailSheet.type === 'empresa' ? <Building2 className="w-5 h-5 text-accent" /> : <Phone className="w-5 h-5 text-accent" />}
              {detailSheet.title}
            </SheetTitle>
            <SheetDescription className="text-slate-500">Analítica de recurrencia detallada (Top 20)</SheetDescription>
          </SheetHeader>

          <div className="py-6">
            {detailSheet.loading ? (
              <div className="flex flex-col items-center py-12 gap-3 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <p className="text-xs">Cargando registros...</p>
              </div>
            ) : detailSheet.data.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">No hay datos suficientes para mostrar recurrencia.</div>
            ) : (
              <div className="space-y-3">
                {detailSheet.data.map((item, index) => (
                  <div key={index} className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between group hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-slate-600">#{index + 1}</span>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-white">
                          {detailSheet.type === 'empresa' ? item.telefono : item.empresa_nombre}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase font-black">Frecuencia de interacción</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-accent/10 text-accent border-accent/20 font-black">
                        {item.total_pedidos}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
