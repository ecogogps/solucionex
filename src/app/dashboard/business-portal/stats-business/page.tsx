'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart3, 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  Minus,
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  Line,
  ComposedChart
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export default function BusinessStatsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    porDia: [],
    tendencia: null,
    despacho: 0,
    entrega: 0,
    totales: { entregados: 0, novedades: 0 }
  });

  const router = useRouter();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      // Obtener todas las estadísticas en paralelo
      const [
        { data: resPorDia },
        { data: resTendencia },
        { data: resDespacho },
        { data: resEntrega },
        { data: resTotales }
      ] = await Promise.all([
        supabase.rpc('stats_empresa_paquetes_por_dia', { p_dias: 30 }),
        supabase.rpc('stats_empresa_indicador_tendencia'),
        supabase.rpc('stats_empresa_tiempo_despacho'),
        supabase.rpc('stats_empresa_tiempo_entrega'),
        supabase.rpc('stats_empresa_totales')
      ]);

      setData({
        porDia: resPorDia || [],
        tendencia: resTendencia?.[0] || null,
        despacho: Number(resDespacho?.[0]?.promedio_minutos) || 0,
        entrega: Number(resEntrega?.[0]?.promedio_minutos) || 0,
        totales: {
          entregados: resTotales?.[0]?.total_entregados || 0,
          novedades: resTotales?.[0]?.total_novedades || 0
        }
      });

    } catch (error) {
      console.error("Error fetching business stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
        <p className="text-slate-400 text-sm font-medium">Analizando rendimiento comercial...</p>
      </div>
    );
  }

  // Formatear datos para el gráfico
  const chartData = data.porDia.map((item: any) => ({
    ...item,
    name: new Date(item.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
  }));

  const tendenciaPct = data.tendencia?.tendencia_pct || 0;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto pb-24 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold">Estadísticas de Empresa</h2>
        <p className="text-slate-400 text-sm">Visualiza el flujo de tus entregas y tiempos de respuesta</p>
      </div>

      {/* SECCIÓN A: CARDS DE TEXTO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className="bg-amber-500/20 p-2 rounded-lg mb-2">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Promedio Despacho</p>
            <p className="text-xl font-black text-white">{data.despacho} min</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className="bg-blue-500/20 p-2 rounded-lg mb-2">
              <Clock className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Promedio Entrega</p>
            <p className="text-xl font-black text-white">{data.entrega} min</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className="bg-emerald-500/20 p-2 rounded-lg mb-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Entregados</p>
            <p className="text-xl font-black text-white">{data.totales.entregados}</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className="bg-red-500/20 p-2 rounded-lg mb-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Con Novedad</p>
            <p className="text-xl font-black text-white">{data.totales.novedades}</p>
          </CardContent>
        </Card>
      </div>

      {/* SECCIÓN B: GRÁFICO DE ÁREA */}
      <Card className="bg-white/5 border-white/10 overflow-hidden shadow-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" /> Flujo de Paquetes (30 días)
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">Volumen diario de envíos procesados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
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
                  itemStyle={{ color: 'hsl(var(--accent))' }}
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="cantidad" 
                  stroke="hsl(var(--accent))" 
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                  strokeWidth={2}
                  name="Paquetes"
                />
                <Line 
                  type="monotone" 
                  dataKey="cantidad" 
                  stroke="#ffffff20" 
                  strokeDasharray="5 5" 
                  dot={false}
                  strokeWidth={1}
                  name="Tendencia"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* SECCIÓN C: BLOQUE INDICADOR DE TENDENCIA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Resumen de Periodos</CardTitle>
            <CardDescription className="text-[10px] text-slate-500">Comparativa de carga operativa semanal</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 pt-4">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Últimos 7 días</p>
              <p className="text-2xl font-black text-white">{data.tendencia?.actual_7_dias || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">7 días anteriores</p>
              <p className="text-2xl font-black text-white">{data.tendencia?.previo_7_dias || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Total del periodo</p>
              <p className="text-2xl font-black text-accent">{data.tendencia?.total_periodo || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 flex flex-col justify-center items-center p-6 text-center">
          <p className="text-[10px] text-slate-500 uppercase font-bold mb-3 tracking-widest">Indicador de Tendencia</p>
          <div className={cn(
            "flex items-center gap-2 text-3xl font-black transition-colors duration-500",
            tendenciaPct > 0 ? "text-emerald-400" : tendenciaPct < 0 ? "text-red-400" : "text-slate-400"
          )}>
            {tendenciaPct > 0 ? <ArrowUpRight className="h-8 w-8" /> : tendenciaPct < 0 ? <ArrowDownRight className="h-8 w-8" /> : <Minus className="h-8 w-8" />}
            {Math.abs(tendenciaPct).toFixed(2)}%
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-medium">Crecimiento vs. semana anterior</p>
        </Card>
      </div>

      <div className="bg-accent/5 border border-accent/20 p-4 rounded-xl flex items-start gap-3 shadow-inner">
        <TrendingUp className="h-5 w-5 text-accent shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed italic">
          Las métricas se calculan en base a los últimos 30 días de operación. Usa estos datos para optimizar tus tiempos de despacho y mejorar la satisfacción del cliente final.
        </p>
      </div>
    </div>
  );
}
