'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  Truck, 
  LogOut, 
  PlusCircle, 
  Send, 
  Loader2,
  Search,
  CheckCircle2,
  MapPin,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export default function BusinessPortal() {
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'solicitud' | 'paquetes'>('solicitud');
  const [formData, setFormData] = useState({
    type: '',
    pickupTime: '',
    trackingNumber: '',
    paymentMethod: 'transferencia',
    orderValue: '',
    address: '',
    phone: '',
    note: ''
  });

  const router = useRouter();
  const { toast } = useToast();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, phone: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simular envío de datos
    setTimeout(() => {
      setLoading(false);
      setIsSearching(true);
      
      // Simular búsqueda de operador durante 4 segundos
      setTimeout(() => {
        setIsSearching(false);
        setActiveTab('paquetes');
        toast({
          title: "Solicitud registrada",
          description: `El paquete ${formData.trackingNumber} ha sido procesado.`,
        });
        setFormData({
          type: '',
          pickupTime: '',
          trackingNumber: '',
          paymentMethod: 'transferencia',
          orderValue: '',
          address: '',
          phone: '',
          note: ''
        });
      }, 4000);
    }, 800);
  };

  // Pantalla de Búsqueda de Operador
  if (isSearching) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-white overflow-hidden">
        <div className="relative mb-8">
          {/* Círculos de radar animados */}
          <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
          <div className="absolute inset-0 rounded-full bg-accent/10 animate-pulse delay-75" />
          
          <div className="relative bg-white/10 p-8 rounded-full border border-white/20 shadow-[0_0_50px_rgba(0,255,255,0.2)]">
            <Search className="h-16 w-16 text-accent animate-bounce" />
          </div>
        </div>

        <div className="text-center space-y-4 max-w-sm">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Buscando operador</h2>
          <div className="bg-white/5 border border-white/10 rounded-full px-6 py-2 inline-block">
            <span className="text-accent text-lg font-bold tracking-normal">Guía Nº: {formData.trackingNumber}</span>
          </div>
        </div>

        <div className="mt-12 w-full max-w-xs space-y-4">
          <div className="flex items-center gap-3 text-sm text-slate-300 bg-white/5 p-3 rounded-lg border border-white/10">
            <MapPin className="h-4 w-4 text-accent" />
            <span className="truncate">{formData.address}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300 bg-white/5 p-3 rounded-lg border border-white/10">
            <Clock className="h-4 w-4 text-accent" />
            <span>Recogida en {formData.pickupTime} min</span>
          </div>
        </div>

        <div className="mt-12 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Conectando con Operadores</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row text-white overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 bg-black/20 border-r border-white/10 flex-col p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-10">
          <Truck className="h-8 w-8 text-accent" />
          <span className="text-xl font-bold tracking-tight">Solucionex</span>
        </div>
        <nav className="flex-1 space-y-2">
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('solicitud')}
            className={cn(
              "w-full justify-start gap-3 transition-all",
              activeTab === 'solicitud' ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <PlusCircle className={cn("h-5 w-5", activeTab === 'solicitud' && "text-accent")} /> Nueva Solicitud
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('paquetes')}
            className={cn(
              "w-full justify-start gap-3 transition-all",
              activeTab === 'paquetes' ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Package className={cn("h-5 w-5", activeTab === 'paquetes' && "text-accent")} /> Mis Paquetes
          </Button>
        </nav>
        <div className="pt-6 border-t border-white/10">
          <Button variant="ghost" className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => router.push('/')}>
            <LogOut className="h-5 w-5" /> Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto pb-24 lg:pb-8">
        {/* Header Mobile Only */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-white/10 bg-black/10 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-accent" />
            <span className="font-bold">Solucionex</span>
          </div>
          <div className="text-xs font-medium text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            Portal Empresa
          </div>
        </header>

        <div className="p-4 lg:p-8 flex justify-center items-start">
          <div className="w-full max-w-2xl space-y-6">
            {activeTab === 'solicitud' ? (
              <>
                <div className="flex flex-col gap-1">
                  <h2 className="text-2xl font-bold">Nueva Solicitud</h2>
                </div>

                <Card className="bg-white/5 border-white/10 shadow-2xl backdrop-blur-sm">
                  <CardHeader className="border-b border-white/5 pb-4">
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <PlusCircle className="h-5 w-5 text-accent" /> Datos del Paquete
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-300">Tipo de Paquete</Label>
                          <Select 
                            value={formData.type} 
                            onValueChange={(v) => setFormData({...formData, type: v})}
                            required
                          >
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                              <SelectValue placeholder="" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                              <SelectItem value="pequeño">Pequeño</SelectItem>
                              <SelectItem value="mediano">Mediano</SelectItem>
                              <SelectItem value="grande">Grande</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-slate-300">Tiempo de Recogida</Label>
                          <Select 
                            value={formData.pickupTime} 
                            onValueChange={(v) => setFormData({...formData, pickupTime: v})}
                            required
                          >
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                              <SelectValue placeholder="" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                              <SelectItem value="5">5 minutos</SelectItem>
                              <SelectItem value="10">10 minutos</SelectItem>
                              <SelectItem value="15">15 minutos</SelectItem>
                              <SelectItem value="20">20 minutos</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="guia" className="text-slate-300">Guía Nº</Label>
                        <Input 
                          id="guia"
                          className="bg-white/5 border-white/10 text-white" 
                          value={formData.trackingNumber}
                          onChange={(e) => setFormData({...formData, trackingNumber: e.target.value})}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="valor" className="text-slate-300">Valor Pedido ($)</Label>
                          <Input 
                            id="valor"
                            type="number"
                            step="0.01"
                            className="bg-white/5 border-white/10 text-white" 
                            value={formData.orderValue}
                            onChange={(e) => setFormData({...formData, orderValue: e.target.value})}
                            required
                          />
                        </div>

                        <div className="space-y-3">
                          <Label className="text-slate-300">Método de Pago</Label>
                          <RadioGroup 
                            value={formData.paymentMethod} 
                            onValueChange={(v) => setFormData({...formData, paymentMethod: v})}
                            className="flex gap-4 pt-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="transferencia" id="transferencia" className="border-accent text-accent" />
                              <Label htmlFor="transferencia" className="cursor-pointer text-sm">Transf.</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="efectivo" id="efectivo" className="border-accent text-accent" />
                              <Label htmlFor="efectivo" className="cursor-pointer text-sm">Efec.</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="dir" className="text-slate-300">Dirección</Label>
                          <Input 
                            id="dir"
                            className="bg-white/5 border-white/10 text-white" 
                            value={formData.address}
                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="telf" className="text-slate-300">Teléfono</Label>
                          <Input 
                            id="telf"
                            type="text"
                            inputMode="numeric"
                            className="bg-white/5 border-white/10 text-white" 
                            value={formData.phone}
                            onChange={handlePhoneChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="nota" className="text-slate-300">Nota</Label>
                        <Textarea 
                          id="nota"
                          className="bg-white/5 border-white/10 text-white min-h-[100px]" 
                          value={formData.note}
                          onChange={(e) => setFormData({...formData, note: e.target.value})}
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-accent text-primary hover:bg-accent/90 font-bold h-12 text-lg shadow-lg shadow-accent/10" 
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="animate-spin" /> : <><Send className="mr-2 h-5 w-5" /> Enviar Solicitud</>}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col gap-1">
                  <h2 className="text-2xl font-bold">Mis Paquetes</h2>
                </div>
                <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center flex flex-col items-center">
                  <Package className="h-12 w-12 text-slate-500 mb-4" />
                  <h3 className="text-lg font-semibold text-white">Sin paquetes registrados</h3>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Bottom Navbar Mobile */}
      <nav className="fixed bottom-6 left-6 right-6 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex lg:hidden items-center justify-around z-50 shadow-2xl overflow-hidden px-2">
        <button 
          onClick={() => setActiveTab('solicitud')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-full h-full transition-all",
            activeTab === 'solicitud' ? "text-accent" : "text-slate-400"
          )}
        >
          <PlusCircle className="h-5 w-5" />
          <span className="text-[10px] font-bold">Solicitud</span>
          {activeTab === 'solicitud' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}
        </button>

        <button 
          onClick={() => setActiveTab('paquetes')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-full h-full transition-all",
            activeTab === 'paquetes' ? "text-accent" : "text-slate-400"
          )}
        >
          <Package className="h-5 w-5" />
          <span className="text-[10px] font-bold">Paquetes</span>
          {activeTab === 'paquetes' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}
        </button>

        <button 
          onClick={() => router.push('/')}
          className="flex flex-col items-center justify-center gap-1 w-full h-full text-red-400 active:bg-red-500/10 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-[10px] font-bold">Salir</span>
        </button>
      </nav>
    </div>
  );
}
