'use client';

import { useRouter } from 'next/navigation';
import { Truck, LogOut, Package, ClipboardCheck, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OperatorPortal() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <header className="h-16 bg-white/5 border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-accent" />
          <span className="font-bold text-lg">Solucionex</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs bg-accent/20 text-accent px-3 py-1 rounded-full border border-accent/30 font-medium">
            Portal Operador
          </span>
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="text-red-400">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold">Panel de Control</h2>
          <p className="text-slate-400 text-sm">Gestiona tus entregas y pedidos asignados.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-300">Pedidos Disponibles</CardTitle>
              <Package className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">0</div>
              <p className="text-[10px] text-slate-500 mt-1">Busca nuevos pedidos cerca de ti.</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-300">En Ruta</CardTitle>
              <Navigation className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">0</div>
              <p className="text-[10px] text-slate-500 mt-1">Paquetes que estás entregando ahora.</p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center flex flex-col items-center">
          <ClipboardCheck className="h-12 w-12 text-slate-500 mb-4" />
          <h3 className="text-lg font-semibold text-white">Sin actividades pendientes</h3>
          <p className="text-slate-400 text-sm max-w-xs mt-2">
            Cuando tengas pedidos asignados, aparecerán aquí para que puedas gestionarlos.
          </p>
        </div>
      </main>

      <nav className="fixed bottom-6 left-6 right-6 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-around z-50 shadow-2xl overflow-hidden px-2">
        <button className="flex flex-col items-center justify-center gap-1 w-full h-full text-accent">
          <Package className="h-5 w-5" />
          <span className="text-[10px] font-bold">Entregas</span>
          <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />
        </button>

        <button className="flex flex-col items-center justify-center gap-1 w-full h-full text-slate-400">
          <Navigation className="h-5 w-5" />
          <span className="text-[10px] font-bold">Mapa</span>
        </button>

        <button onClick={() => router.push('/')} className="flex flex-col items-center justify-center gap-1 w-full h-full text-red-400">
          <LogOut className="h-5 w-5" />
          <span className="text-[10px] font-bold">Salir</span>
        </button>
      </nav>
    </div>
  );
}
