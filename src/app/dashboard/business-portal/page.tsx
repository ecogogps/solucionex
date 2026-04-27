'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  Truck, 
  LogOut, 
  PlusCircle, 
  History,
  Send,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function BusinessPortal() {
  const [loading, setLoading] = useState(false);
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
    const value = e.target.value.replace(/\D/g, ''); // Solo permite números
    setFormData({ ...formData, phone: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Solicitud enviada",
        description: `El paquete ${formData.trackingNumber} ha sido registrado exitosamente.`,
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
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row text-white">
      {/* Sidebar para Empresas */}
      <aside className="w-full lg:w-64 bg-black/20 border-b lg:border-r border-white/10 flex flex-col p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-10">
          <Truck className="h-8 w-8 text-accent" />
          <span className="text-xl font-bold tracking-tight">Solucionex</span>
        </div>
        <nav className="flex-1 space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-3 bg-white/10 text-white hover:bg-white/20">
            <PlusCircle className="h-5 w-5 text-accent" /> Nueva Solicitud
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5">
            <History className="h-5 w-5" /> Mis Paquetes
          </Button>
        </nav>
        <div className="pt-6 border-t border-white/10 mt-6">
          <Button variant="ghost" className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => router.push('/')}>
            <LogOut className="h-5 w-5" /> Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 p-4 lg:p-8 flex justify-center items-start overflow-y-auto">
        <div className="w-full max-w-2xl space-y-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold">Portal de Empresa</h2>
            <p className="text-slate-400">Genera una nueva solicitud de recogida de paquete.</p>
          </div>

          <Card className="bg-white/5 border-white/10 shadow-2xl">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-accent" /> Datos del Paquete
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
                      className="bg-white/5 border-white/10 text-white font-mono" 
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
                        <Label htmlFor="transferencia" className="cursor-pointer text-sm">Transferencia</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="efectivo" id="efectivo" className="border-accent text-accent" />
                        <Label htmlFor="efectivo" className="cursor-pointer text-sm">Efectivo</Label>
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
                  className="w-full bg-accent text-primary hover:bg-accent/90 font-bold h-12 text-lg" 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin" /> : <><Send className="mr-2 h-5 w-5" /> Enviar Solicitud</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
