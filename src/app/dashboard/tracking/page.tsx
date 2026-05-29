'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Truck, 
  Navigation, 
  Loader2, 
  ExternalLink, 
  User, 
  MapPin, 
  Clock,
  LogOut,
  Package,
  Building2,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface UbicacionData {
  id: string;
  operador_id: string;
  latitud: number;
  longitud: number;
  updated_at: string;
  operadores?: {
    nombres: string;
  };
  address?: string;
}

export default function TrackingPage() {
  const [ubicaciones, setUbicaciones] = useState<UbicacionData[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUbicaciones();
    
    const channel = supabase
      .channel('realtime_tracking')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operador_ubicaciones' }, () => {
        fetchUbicaciones();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUbicaciones = async () => {
    try {
      const { data, error } = await supabase
        .from('operador_ubicaciones')
        .select('*, operadores(nombres)')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Geocodificación inversa simple para cada ubicación
      const enrichedData = await Promise.all((data || []).map(async (u: any) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${u.latitud}&lon=${u.longitud}&zoom=18&addressdetails=1`, {
            headers: { 'User-Agent': 'SolucionexApp/1.0' }
          });
          const geo = await res.json();
          return { ...u, address: geo.display_name || `${u.latitud}, ${u.longitud}` };
        } catch {
          return { ...u, address: `${u.latitud}, ${u.longitud}` };
        }
      }));

      setUbicaciones(enrichedData);
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background flex text-white">
      <aside className="w-64 bg-black/20 border-r border-white/10 hidden lg:flex flex-col p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-10">
          <Truck className="h-8 w-8 text-accent" />
          <span className="text-xl font-bold tracking-tight">Solucionex</span>
        </div>
        <nav className="flex-1 space-y-2">
          <Link href="/dashboard">
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5 mb-2">
              <Package className="h-5 w-5" /> Paquetes
            </Button>
          </Link>
          <Link href="/dashboard/business">
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5">
              <Building2 className="h-5 w-5" /> Empresas
            </Button>
          </Link>
          <Link href="/dashboard/operators">
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5">
              <UserCheck className="h-5 w-5" /> Operadores
            </Button>
          </Link>
          <Link href="/dashboard/tracking">
            <Button variant="ghost" className="w-full justify-start gap-3 bg-white/10 text-white hover:bg-white/20">
              <Navigation className="h-5 w-5 text-accent" /> Ubicación Operador
            </Button>
          </Link>
        </nav>
        <div className="pt-6 border-t border-white/10">
          <Button variant="ghost" className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={handleLogout}>
            <LogOut className="h-5 w-5" /> Cerrar Sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white/5 border-b border-white/10 flex items-center justify-between px-8">
          <h2 className="text-xl font-bold text-white">Monitoreo de Operadores</h2>
        </header>

        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Cargando ubicaciones...</p>
            </div>
          ) : ubicaciones.length === 0 ? (
            <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center flex flex-col items-center">
              <Navigation className="h-12 w-12 text-slate-500 mb-4" />
              <h3 className="text-lg font-semibold text-white">Sin datos de ubicación</h3>
              <p className="text-slate-400">Los operadores aún no han compartido su ubicación.</p>
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl shadow-2xl border border-white/10 overflow-hidden backdrop-blur-sm">
              <Table>
                <TableHeader className="bg-white/10">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="font-bold text-slate-300">Operador</TableHead>
                    <TableHead className="font-bold text-slate-300">Última Dirección Detectada</TableHead>
                    <TableHead className="font-bold text-slate-300">Sincronización</TableHead>
                    <TableHead className="text-right font-bold text-slate-300">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ubicaciones.map((u) => (
                    <TableRow key={u.id} className="border-white/10 hover:bg-white/5">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                            <User className="w-4 h-4 text-accent" />
                          </div>
                          <span className="font-medium text-white">{u.operadores?.nombres}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                          <span className="text-xs text-slate-300 leading-relaxed">{u.address}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="w-3 h-3 text-accent" />
                          {new Date(u.updated_at).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          asChild 
                          variant="ghost" 
                          size="sm" 
                          className="text-accent hover:bg-accent/10"
                        >
                          <a 
                            href={`https://www.google.com/maps?q=${u.latitud},${u.longitud}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" /> Ver en Google Maps
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
