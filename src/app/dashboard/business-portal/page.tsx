'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Package, 
  Truck, 
  LogOut, 
  PlusCircle, 
  Send, 
  Loader2, 
  Camera, 
  X, 
  Image as ImageIcon,
  AlertCircle
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
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function BusinessPortalRequest() {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const pathname = usePathname();

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

  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
      } else {
        router.push('/');
      }
    };
    getSession();
  }, [router]);

  useEffect(() => {
    if (showCamera) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Acceso a cámara denegado',
            description: 'Por favor, habilita los permisos de cámara en tu navegador.',
          });
        }
      };
      getCameraPermission();
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [showCamera, toast]);

  const base64ToBlob = (base64: string, contentType: string) => {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        setShowCamera(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, phone: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast({ variant: "destructive", title: "Error", description: "No hay una sesión activa." });
      return;
    }
    
    setLoading(true);

    try {
      let imageUrl = null;

      if (capturedImage) {
        const blob = base64ToBlob(capturedImage, 'image/jpeg');
        const fileName = `images/guia-${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('paquetes')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600'
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('paquetes')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      const { error: insertError } = await supabase
        .from('paquetes')
        .insert([{
          empresa_id: userId,
          tipo: formData.type,
          tiempo_recogida: parseInt(formData.pickupTime),
          guia_numero: formData.trackingNumber,
          imagen_url: imageUrl,
          valor_pedido: parseFloat(formData.orderValue),
          metodo_pago: formData.paymentMethod,
          direccion: formData.address,
          telefono: formData.phone,
          nota: formData.note,
          estado: 'buscando_operador'
        }]);

      if (insertError) throw insertError;

      toast({
        title: "Solicitud registrada",
        description: `El paquete ${formData.trackingNumber} ha sido procesado.`,
      });
      
      router.push('/dashboard/business-portal/packages');

    } catch (error: any) {
      console.error("Error al enviar solicitud:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo registrar la solicitud."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row text-white overflow-hidden">
      <aside className="hidden lg:flex w-64 bg-black/20 border-r border-white/10 flex-col p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-10">
          <Truck className="h-8 w-8 text-accent" />
          <span className="text-xl font-bold tracking-tight">Solucionex</span>
        </div>
        <nav className="flex-1 space-y-2">
          <Link href="/dashboard/business-portal">
            <Button 
              variant="ghost" 
              className={cn(
                "w-full justify-start gap-3 transition-all",
                pathname === '/dashboard/business-portal' ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <PlusCircle className={cn("h-5 w-5", pathname === '/dashboard/business-portal' && "text-accent")} /> Nueva Solicitud
            </Button>
          </Link>
          <Link href="/dashboard/business-portal/packages">
            <Button 
              variant="ghost" 
              className={cn(
                "w-full justify-start gap-3 transition-all",
                pathname === '/dashboard/business-portal/packages' ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Package className={cn("h-5 w-5", pathname === '/dashboard/business-portal/packages' && "text-accent")} /> Mis Paquetes
            </Button>
          </Link>
        </nav>
        <div className="pt-6 border-t border-white/10">
          <Button variant="ghost" className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => {
            supabase.auth.signOut();
            router.push('/');
          }}>
            <LogOut className="h-5 w-5" /> Cerrar Sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto pb-24 lg:pb-8">
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
            <h2 className="text-2xl font-bold">Nueva Solicitud</h2>
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
                          <SelectValue placeholder="Seleccionar tamaño" />
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
                          <SelectValue placeholder="Tiempo estimado" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                          <SelectItem value="10">10 minutos</SelectItem>
                          <SelectItem value="15">15 minutos</SelectItem>
                          <SelectItem value="20">20 minutos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="guia" className="text-slate-300">Guía Nº</Label>
                      <Input 
                        id="guia"
                        className="bg-white/5 border-white/10 text-white" 
                        value={formData.trackingNumber}
                        onChange={(e) => setFormData({...formData, trackingNumber: e.target.value})}
                        placeholder="Ej: GU-001"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Imagen de guía</Label>
                      <div className="flex flex-col gap-2">
                        {capturedImage ? (
                          <div className="relative rounded-md overflow-hidden border border-white/10 aspect-video bg-black/20">
                            <img src={capturedImage} alt="Guía" className="w-full h-full object-contain" />
                            <button 
                              type="button"
                              onClick={() => setCapturedImage(null)}
                              className="absolute top-2 right-2 bg-red-500/80 p-1 rounded-full text-white hover:bg-red-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="bg-white/5 border-white/10 h-10 flex-1 text-slate-400 hover:text-white"
                              onClick={() => setShowCamera(true)}
                            >
                              <Camera className="mr-2 h-4 w-4" /> Foto
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="bg-white/5 border-white/10 h-10 flex-1 text-slate-400 hover:text-white"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <ImageIcon className="mr-2 h-4 w-4" /> Subir
                            </Button>
                            <input type="file" file-input-ref-id="fileInput" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="valor" className="text-slate-300">Valor Pedido ($)</Label>
                      <Input id="valor" type="number" step="0.01" className="bg-white/5 border-white/10 text-white" value={formData.orderValue} onChange={(e) => setFormData({...formData, orderValue: e.target.value})} required />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-slate-300">Método de Pago</Label>
                      <RadioGroup value={formData.paymentMethod} onValueChange={(v) => setFormData({...formData, paymentMethod: v})} className="flex gap-4 pt-1">
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
                      <Input id="dir" className="bg-white/5 border-white/10 text-white" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telf" className="text-slate-300">Teléfono</Label>
                      <Input id="telf" type="text" inputMode="numeric" className="bg-white/5 border-white/10 text-white" value={formData.phone} onChange={handlePhoneChange} required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nota" className="text-slate-300">Nota</Label>
                    <Textarea id="nota" className="bg-white/5 border-white/10 text-white min-h-[100px]" value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} />
                  </div>

                  <Button type="submit" className="w-full bg-accent text-primary hover:bg-accent/90 font-bold h-12 text-lg shadow-lg shadow-accent/10" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : <><Send className="mr-2 h-5 w-5" /> Enviar Solicitud</>}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader><DialogTitle>Capturar Guía</DialogTitle></DialogHeader>
          <div className="relative">
            <video ref={videoRef} className="w-full aspect-video rounded-md bg-black" autoPlay muted playsInline />
            {hasCameraPermission === false && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center">
                <Alert variant="destructive" className="max-w-xs">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Acceso Requerido</AlertTitle>
                  <AlertDescription>Por favor permite el acceso a la cámara.</AlertDescription>
                </Alert>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <DialogFooter className="flex flex-row justify-center gap-2">
            <Button variant="ghost" onClick={() => setShowCamera(false)}>Cancelar</Button>
            <Button onClick={takePhoto} disabled={!hasCameraPermission} className="bg-accent text-primary font-bold hover:bg-accent">Capturar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <nav className="fixed bottom-6 left-6 right-6 h-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex lg:hidden items-center justify-around z-50 shadow-2xl overflow-hidden px-2">
        <Link href="/dashboard/business-portal" className={cn("flex flex-col items-center justify-center gap-1 w-full h-full transition-all", pathname === '/dashboard/business-portal' ? "text-accent" : "text-slate-400")}>
          <PlusCircle className="h-5 w-5" />
          <span className="text-[10px] font-bold">Solicitud</span>
          {pathname === '/dashboard/business-portal' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}
        </Link>
        <Link href="/dashboard/business-portal/packages" className={cn("flex flex-col items-center justify-center gap-1 w-full h-full transition-all", pathname === '/dashboard/business-portal/packages' ? "text-accent" : "text-slate-400")}>
          <Package className="h-5 w-5" />
          <span className="text-[10px] font-bold">Paquetes</span>
          {pathname === '/dashboard/business-portal/packages' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}
        </Link>
        <button onClick={() => { supabase.auth.signOut(); router.push('/'); }} className="flex flex-col items-center justify-center gap-1 w-full h-full text-red-400">
          <LogOut className="h-5 w-5" />
          <span className="text-[10px] font-bold">Salir</span>
        </button>
      </nav>
    </div>
  );
}