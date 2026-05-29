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
  UserCheck,
  Search,
  Calendar
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
  const [searchTerm, setSearchTerm] = useState('');
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
      // 1. Obtener ubicaciones base de la tabla
      const { data: rawData, error: locError } = await supabase
        .from('operador_ubicaciones')
        .select('*')
        .order('updated_at', { ascending: false });

      if (locError) throw locError;

      if (!rawData || rawData.length === 0) {
        setUbicaciones([]);
        setLoading(false);
        return;
      }

      // 2. Obtener nombres de operadores (Join manual en memoria ya que la FK en DB apunta a auth.users)
      const operatorIds = Array.from(new Set(rawData.map(u => u.operador_id)));
      const { data: operatorsData, error: opError } = await supabase
        .from('operadores')
        .select('id, nombres')
        .in('id', operatorIds);

      // Mapeamos los nombres por ID para acceso rápido
      const opMap = (operatorsData || []).reduce((acc: Record<string, string>, op) => {
        acc[op.id] = op.nombres;
        return acc;
      }, {});

      // 3. Geocodificación inversa y enriquecimiento de datos
      const enrichedData = await Promise.all(rawData.map(async (u: any) => {
        let address = `${u.latitud}, ${u.longitud}`;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${u.latitud}&lon=${u.longitud}&zoom=18&addressdetails=1`, {
            headers: { 'User-Agent': 'SolucionexApp/1.0' }
          });
          if (res.ok) {
            const geo = await res.json();
            address = geo.display_name || address;
          }
        } catch (err) {
          console.warn(`Error en geocodificación para registro ${u.id}:`, err);
        }

        return { 
          ...u, 
          address,
          operadores: { nombres: opMap[u.operador_id] || 'Operador Desconocido' }
        };
      }));

      setUbicaciones(enrichedData);
    } catch (error: any) {
      console.error("Error fetching locations:", error.message || error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const filteredUbicaciones = ubicaciones.filter(u => 
    u.operadores?.nombres.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              placeholder="Buscar por operador..." 
              className="w-full bg-white/5 border border-white/10 rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent text-white placeholder:text-slate-500" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Cargando ubicaciones...</p>
            </div>
          ) : filteredUbicaciones.length === 0 ? (
            <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center flex flex-col items-center">
              <Navigation className="h-12 w-12 text-slate-500 mb-4" />
              <h3 className="text-lg font-semibold text-white">Sin datos de ubicación</h3>
              <p className="text-slate-400">No se encontraron resultados para tu búsqueda.</p>
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
                  {filteredUbicaciones.map((u) => (
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
                        <div className="flex flex-col gap-1 text-slate-400">
                          <div className="flex items-center gap-2 text-xs">
                            <Clock className="w-3 h-3 text-accent" />
                            {new Date(u.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="flex items-center gap-2 text-[10px]">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {new Date(u.updated_at).toLocaleDateString('es-EC', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric' 
                            })}
                          </div>
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
