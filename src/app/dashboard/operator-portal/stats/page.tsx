'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart3, 
  Loader2, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Truck,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

interface StatsTotales {
  total_entregados: number;
  total_rechazados: number;
}

export default function OperatorStatsPage() {
  const [loading, setLoading] = useState(true);
  const [totales, setTotales] = useState<StatsTotales>({ total_entregados: 0, total_rechazados: 0 });
  const [promedioEntrega, setPromedioEntrega] = useState(0);
  const [promedioRetiro, setPromedioRetiro] = useState(0);
  
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetchStats();
      } else {
        router.push('/');
      }
    };
    getSession();
  }, [router]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // 1. Totales
      const { data: dataTotales } = await supabase.rpc('stats_operador_totales');
      if (dataTotales) setTotales(dataTotales);

      // 2. Tiempo promedio entrega
      const { data: dataEntrega } = await supabase.rpc('stats_operador_tiempo_entrega');
      if (dataEntrega !== undefined) setPromedioEntrega(Number(dataEntrega));

      // 3. Tiempo promedio retiro
      const { data: dataRetiro } = await supabase.rpc('stats_operador_tiempo_retiro');
      if (dataRetiro !== undefined) setPromedioRetiro(Number(dataRetiro));

    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
        <p className="text-slate-400 text-sm font-medium">Analizando tu rendimiento...</p>
      </div>
    );
  }

  // Preparar datos para los gráficos
  const chartEntrega = [{ name: 'Entrega', minutos: promedioEntrega }];
  const chartRetiro = [{ name: 'Retiro', minutos: promedioRetiro }];

  return (
    <>
      <header className="h-16 bg-slate-900 border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-accent shrink-0" />
          <span className="font-bold text-lg">Mis Estadísticas</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => { supabase.auth.signOut(); router.push('/'); }} className="text-red-400">
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      <div className="p-4 lg:p-6 space-y-6 pb-24 max-w-2xl mx-auto">
        
        {/* SECCIÓN 1: CARDS DE TEXTO */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="bg-emerald-500/20 p-2 rounded-lg mb-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Entregados</p>
              <p className="text-3xl font-black text-white">{totales.total_entregados}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="bg-red-500/20 p-2 rounded-lg mb-2">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Rechazados</p>
              <p className="text-3xl font-black text-white">{totales.total_rechazados}</p>
            </CardContent>
          </Card>
        </div>

        {/* SECCIÓN 2: TIEMPO PROMEDIO DE ENTREGA */}
        <Card className="bg-white/5 border-white/10 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400" /> Tiempo promedio de Entrega
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Minutos desde el retiro hasta la entrega final
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartEntrega} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" hide />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 border border-white/10 p-2 rounded shadow-xl">
                            <p className="text-xs font-bold text-emerald-400">{payload[0].value} minutos</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="minutos" radius={[0, 4, 4, 0]} barSize={40}>
                    <Cell fill="#22c55e" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex justify-between items-center bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
              <span className="text-xs font-bold text-emerald-400 uppercase">Promedio</span>
              <span className="text-lg font-black text-white">{promedioEntrega} min</span>
            </div>
          </CardContent>
        </Card>

        {/* SECCIÓN 3: TIEMPO PROMEDIO DE RETIRO */}
        <Card className="bg-white/5 border-white/10 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" /> Tiempo promedio de Retiro
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Minutos desde la aceptación hasta el retiro en origen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRetiro} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" hide />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 border border-white/10 p-2 rounded shadow-xl">
                            <p className="text-xs font-bold text-blue-400">{payload[0].value} minutos</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="minutos" radius={[0, 4, 4, 0]} barSize={40}>
                    <Cell fill="#3b82f6" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex justify-between items-center bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
              <span className="text-xs font-bold text-blue-400 uppercase">Promedio</span>
              <span className="text-lg font-black text-white">{promedioRetiro} min</span>
            </div>
          </CardContent>
        </Card>

        <div className="bg-accent/5 border border-accent/20 p-4 rounded-xl flex items-start gap-3">
          <TrendingUp className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400 leading-relaxed">
            Tus estadísticas se calculan en base a tus últimas 50 operaciones finalizadas. Mantener tiempos bajos mejora tu reputación en el sistema.
          </p>
        </div>

      </div>
    </>
  );
}
