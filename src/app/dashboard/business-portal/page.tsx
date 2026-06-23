'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PlusCircle, 
  Send, 
  Loader2, 
  Camera, 
  X, 
  Image as ImageIcon,
  AlertCircle,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';

interface Sector {
  id: string;
  nombre: string;
}

export default function BusinessPortalRequest() {
  const [loading, setLoading] = useState(false);
  const [fetchingSectors, setFetchingSectors] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [randomDigits] = useState(() => Math.floor(10000 + Math.random() * 90000).toString());
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [selectedSectorName, setSelectedSectorName] = useState('');

  const [formData, setFormData] = useState({
    type: '',
    pickupTime: '',
    trackingNumber: '',
    paymentMethod: 'transferencia',
    orderValue: '',
    address: '',
    phone: '',
    note: '',
    sectorId: ''
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
        fetchCompanySectors(session.user.id);
      } else {
        router.push('/');
      }
    };
    getSession();
  }, [router]);

  const fetchCompanySectors = async (uid: string) => {
    setFetchingSectors(true);
    try {
      // 1. Obtener las zonas asignadas a la empresa
      const { data: empresaZonas } = await supabase
        .from('empresa_zonas')
        .select('zona_id')
        .eq('empresa_id', uid);

      if (empresaZonas && empresaZonas.length > 0) {
        const zoneIds = empresaZonas.map(ez => ez.zona_id);
        
        // 2. Obtener los sectores que pertenecen a esas zonas
        const { data: sectorsData, error } = await supabase
          .from('sectores')
          .select('id, nombre')
          .in('zona_id', zoneIds)
          .order('nombre', { ascending: true });

        if (error) throw error;
        setSectores(sectorsData || []);
      }
    } catch (error) {
      console.error("Error fetching sectors:", error);
    } finally {
      setFetchingSectors(false);
    }
  };

  // Genera y actualiza la guía automáticamente cuando cambia el método de pago o se selecciona el sector
  useEffect(() => {
    if (!selectedSectorName) {
      setFormData(prev => ({ ...prev, trackingNumber: '' }));
      return;
    }
  
    const cleanSector = selectedSectorName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '');
      
    const paymentLetter = formData.paymentMethod === 'transferencia' ? 'T' : 'E';
    
    setFormData(prev => ({
      ...prev,
      trackingNumber: `${cleanSector}.${randomDigits}.${paymentLetter}`
    }));
  }, [selectedSectorName, formData.paymentMethod, randomDigits]);

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

    if (!selectedSectorName) {
      toast({ variant: "destructive", title: "Sector requerido", description: "Debes seleccionar un sector para generar la guía." });
      return;
    }
    
    setLoading(true);

    try {
      let imageUrl = null;

      if (capturedImage) {
        const blob = base64ToBlob(capturedImage, 'image/jpeg');
        const fileName = `images/guia-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
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
          estado: 'buscando_operador',
          sector_id: formData.sectorId
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
    <>
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
                
                {/* SELECCIÓN DE SECTOR */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-accent flex items-center gap-1"><MapPin className="w-3 h-3" /> Sector</Label>
                    <Select 
                        value={formData.sectorId}
                        onValueChange={(value) => {
                          const sector = sectores.find(s => s.id === value);
                          setSelectedSectorName(sector?.nombre || '');
                          setFormData(prev => ({ ...prev, sectorId: value }));
                        }}
                        required
                      >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder={fetchingSectors ? "Cargando sectores..." : "Seleccionar sector"} />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-white">
                        {sectores.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                        ))}
                        {sectores.length === 0 && !fetchingSectors && (
                          <SelectItem value="none" disabled>No hay sectores asignados</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guia" className="text-slate-300">Guía Nº</Label>
                    <Input 
                      id="guia"
                      className="bg-white/10 border-white/10 text-accent font-bold cursor-not-allowed" 
                      value={formData.trackingNumber || (selectedSectorName ? 'Generando...' : 'Selecciona un sector')}
                      readOnly
                      required
                    />
                  </div>
                </div>

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

                  <div className="space-y-2">
                    <Label className="text-slate-300">Evidencia de envío</Label>
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
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
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
                  <div className="space-y-2">
                    <Label htmlFor="telf" className="text-slate-300">Teléfono</Label>
                    <Input id="telf" type="text" inputMode="numeric" className="bg-white/5 border-white/10 text-white" value={formData.phone} onChange={handlePhoneChange} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dir" className="text-slate-300">Destino</Label>
                  <Input id="dir" className="bg-white/5 border-white/10 text-white" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nota" className="text-slate-300">Nota (contenido)</Label>
                  <Textarea id="nota" className="bg-white/5 border-white/10 text-white min-h-[100px]" value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} />
                </div>

                <Button type="submit" className="w-full bg-accent text-primary hover:bg-accent/90 font-bold h-12 text-lg shadow-lg shadow-accent/10" disabled={loading || !formData.trackingNumber}>
                  {loading ? <Loader2 className="animate-spin" /> : <><Send className="mr-2 h-5 w-5" /> Enviar Solicitud</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

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
    </>
  );
}
