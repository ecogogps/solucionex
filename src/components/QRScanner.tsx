'use client';

import { useState, useEffect, useRef } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { supabase } from '@/lib/supabase';
import { Camera, X, CheckCircle2, Loader2, Camera as CameraIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

export function QRScanner({ isOpen, onClose, userId, onSuccess }: QRScannerProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const photoVideoRef = useRef<HTMLVideoElement>(null);

  const [step, setStep] = useState<'scanning' | 'loading' | 'photo' | 'processing'>('scanning');
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [paqueteInfo, setPaqueteInfo] = useState<{ guia_numero: string } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  // Escáner QR
  useEffect(() => {
    if (!isOpen || step !== 'scanning') return;
  
    let codeReader: BrowserQRCodeReader;
    let stream: MediaStream;
  
    const startScanner = async () => {
      try {
        // Intentar obtener la cámara principal (no la angular)
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
  
        codeReader = new BrowserQRCodeReader();
        const controls = await codeReader.decodeFromVideoElement(
          videoRef.current!,
          async (result) => {
            if (result) {
              controls.stop();
              stream.getTracks().forEach(t => t.stop());
              await verifyPaquete(result.getText());
            }
          }
        );
        controlsRef.current = controls;
      } catch (err) {
        console.error('Error starting scanner:', err);
        toast({ variant: 'destructive', title: 'Error de cámara', description: 'No se pudo acceder a la cámara.' });
      }
    };
  
    startScanner();
  
    return () => {
      controlsRef.current?.stop();
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [isOpen, step]);

  // Cámara de evidencia
  useEffect(() => {
    if (step !== 'photo') return;

    let stream: MediaStream;
    const startPhotoCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (photoVideoRef.current) {
          photoVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        toast({ variant: 'destructive', title: 'Error de cámara' });
      }
    };

    startPhotoCamera();

    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [step]);

  const verifyPaquete = async (id: string) => {
    setStep('loading');
    try {
      const { data, error } = await supabase
        .from('paquetes')
        .select('id, guia_numero, operador_id, estado')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        toast({ variant: 'destructive', title: 'QR Inválido', description: 'El paquete no existe en el sistema.' });
        setStep('scanning');
        return;
      }

      // Validación de estados prohibidos
      const finalStates = ['entregado', 'entregado_novedad', 'cancelado', 'anulado_retornar'];
      if (finalStates.includes(data.estado)) {
        toast({ 
          variant: 'destructive', 
          title: 'Acción No Permitida', 
          description: `No se puede escanear un paquete con estado: ${data.estado.replace(/_/g, ' ')}.` 
        });
        setStep('scanning');
        return;
      }

      if (data.operador_id !== userId) {
        toast({ variant: 'destructive', title: 'No Autorizado', description: 'Este paquete no está asignado a tu cuenta.' });
        setStep('scanning');
        return;
      }

      toast({ title: '¡Verificado!', description: `Paquete ${data.guia_numero} validado correctamente.` });
      setScannedId(id);
      setPaqueteInfo(data);
      setStep('photo');
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Error de conexión.' });
      setStep('scanning');
    }
  };

  const takePhotoAndConfirm = async () => {
    if (photoVideoRef.current && canvasRef.current && scannedId) {
      const canvas = canvasRef.current;
      const video = photoVideoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setPhoto(dataUrl);
      
      // Detener cámara inmediatamente
      const stream = video.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());

      // --- INICIO DE LA SOLUCIÓN DE GEOLOCALIZACIÓN ---
      let ubicacion = null;
      if (navigator.geolocation) {
        ubicacion = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({ latitud: pos.coords.latitude, longitud: pos.coords.longitude });
            },
            (err) => {
              console.warn("Fallo al obtener ubicación en retiro:", err.code, err.message);
              resolve(null);
            },
            { 
              enableHighAccuracy: false, // Más rápido usando redes móviles/Wi-Fi en vez de GPS puro
              timeout: 10000            // 10 segundos de espera
            }
          );
        });
      } else {
        console.warn("El navegador no soporta geolocalización o no está en un entorno HTTPS seguro.");
      }
      // --- FIN DE LA SOLUCIÓN DE GEOLOCALIZACIÓN ---

      setStep('processing');

      try {
        // 1. Subir evidencia
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const fileName = `image-paquete-retirado/retiro-${scannedId}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage.from('paquetes').upload(fileName, blob);
        
        let publicUrl = null;
        if (!uploadError) {
          const { data: { publicUrl: url } } = supabase.storage.from('paquetes').getPublicUrl(fileName);
          publicUrl = url;
        }

        // 2. Actualizar a 'paquete_retirado'
        const updateData: any = { 
          estado: 'paquete_retirado',
          imagen_paquete_retirado: publicUrl 
        };

        // Si se obtuvo la ubicación, se agrega al payload
        if (ubicacion) {
          updateData.ubicacion_paquete_retirado = ubicacion;
        }

        const { error: updateError } = await supabase
          .from('paquetes')
          .update(updateData)
          .eq('id', scannedId);

        if (updateError) throw updateError;

        toast({ title: 'Paquete Retirado', description: 'Registrando salida a ruta...' });
        onSuccess();

        // 3. Esperar 2 segundos y actualizar a 'en_ruta'
        setTimeout(async () => {
          await supabase.from('paquetes').update({ estado: 'en_ruta' }).eq('id', scannedId);
          toast({ title: 'En Ruta', description: 'El paquete ya está en tránsito.' });
          onSuccess();
          handleClose();
        }, 2500);

      } catch (err) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo completar el proceso.' });
        setStep('photo');
      }
    }
  };

  const handleClose = () => {
    controlsRef.current?.stop();
    setStep('scanning');
    setScannedId(null);
    setPaqueteInfo(null);
    setPhoto(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-white/10">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-accent" />
            {step === 'scanning' && 'Escanear Ticket QR'}
            {step === 'photo' && 'Evidencia de Retiro'}
            {(step === 'loading' || step === 'processing') && 'Procesando...'}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4">
          {step === 'scanning' && (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-square border border-white/10">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-56 h-56 border-2 border-accent/50 rounded-2xl shadow-[0_0_0_100vmax_rgba(0,0,0,0.5)]" />
                </div>
              </div>
              <p className="text-center text-sm text-slate-400">Ubica el QR del ticket dentro del recuadro</p>
            </div>
          )}

          {(step === 'loading' || step === 'processing') && (
            <div className="flex flex-col items-center py-20 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-accent" />
              <p className="text-slate-400 font-medium">
                {step === 'loading' ? 'Verificando paquete...' : 'Finalizando proceso...'}
              </p>
            </div>
          )}

          {step === 'photo' && (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-square border border-white/10">
                {photo ? (
                  <img src={photo} alt="Captura" className="w-full h-full object-cover" />
                ) : (
                  <video ref={photoVideoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                )}
              </div>
              
              {!photo && (
                <Button 
                  className="w-full h-12 bg-accent text-primary font-bold text-base hover:bg-accent/90"
                  onClick={takePhotoAndConfirm}
                >
                  <CameraIcon className="mr-2 h-5 w-5" /> Capturar y Retirar
                </Button>
              )}
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <DialogFooter className="p-4 bg-black/20 flex flex-col gap-2 sm:flex-col">
          <Button variant="ghost" className="w-full h-10 hover:bg-white/5 text-slate-400" onClick={handleClose}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
