'use client';

import { useState, useEffect, useRef } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { supabase } from '@/lib/supabase';
import { 
  Camera, X, CheckCircle2, Loader2, Camera as CameraIcon, 
  QrCode, Keyboard, ArrowLeft 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

type ScannerStep = 'selection' | 'scanning' | 'entering_pin' | 'loading' | 'photo' | 'processing';

export function QRScanner({ isOpen, onClose, userId, onSuccess }: QRScannerProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const photoVideoRef = useRef<HTMLVideoElement>(null);

  // El flujo inicia ahora en la pantalla de selección 'selection'
  const [step, setStep] = useState<ScannerStep>('selection');
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [paqueteInfo, setPaqueteInfo] = useState<{ guia_numero: string } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [pin, setPin] = useState<string>('');

  // Escáner QR (Solo se activa si el paso actual es 'scanning')
  useEffect(() => {
    if (!isOpen || step !== 'scanning') return;
  
    let codeReader: BrowserQRCodeReader;
    let stream: MediaStream;
  
    const startScanner = async () => {
      try {
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
              await verifyPaquete(result.getText(), 'qr');
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

  // Verificación unificada para QR y PIN
  const verifyPaquete = async (identifier: string, method: 'qr' | 'pin') => {
    setStep('loading');
    try {
      let query = supabase
        .from('paquetes')
        .select('id, guia_numero, operador_id, estado');

      if (method === 'qr') {
        query = query.eq('id', identifier);
      } else {
        // Realiza la búsqueda utilizando el PIN asignado (cambiar 'pin_retiro' si usas otra columna)
        query = query.eq('pin_retiro', identifier);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        toast({ 
          variant: 'destructive', 
          title: method === 'qr' ? 'QR Inválido' : 'PIN Inválido', 
          description: method === 'qr' ? 'El paquete no existe en el sistema.' : 'No se encontró ningún paquete con este PIN.' 
        });
        setStep(method === 'qr' ? 'scanning' : 'entering_pin');
        return;
      }

      // Validación de estados prohibidos
      const finalStates = ['entregado', 'entregado_novedad', 'cancelado', 'anulado_retornar'];
      if (finalStates.includes(data.estado)) {
        toast({ 
          variant: 'destructive', 
          title: 'Acción No Permitida', 
          description: `No se puede procesar un paquete con estado: ${data.estado.replace(/_/g, ' ')}.` 
        });
        setStep(method === 'qr' ? 'scanning' : 'entering_pin');
        return;
      }

      if (data.operador_id !== userId) {
        toast({ variant: 'destructive', title: 'No Autorizado', description: 'Este paquete no está asignado a tu cuenta.' });
        setStep(method === 'qr' ? 'scanning' : 'entering_pin');
        return;
      }

      toast({ title: '¡Verificado!', description: `Paquete ${data.guia_numero} validado correctamente.` });
      setScannedId(data.id);
      setPaqueteInfo(data);
      setStep('photo');
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Error de conexión.' });
      setStep(method === 'qr' ? 'scanning' : 'entering_pin');
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
      
      const stream = video.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());

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
              enableHighAccuracy: false,
              timeout: 10000
            }
          );
        });
      }

      setStep('processing');

      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const fileName = `image-paquete-retirado/retiro-${scannedId}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage.from('paquetes').upload(fileName, blob);
        
        let publicUrl = null;
        if (!uploadError) {
          const { data: { publicUrl: url } } = supabase.storage.from('paquetes').getPublicUrl(fileName);
          publicUrl = url;
        }

        const updateData: any = { 
          estado: 'paquete_retirado',
          imagen_paquete_retirado: publicUrl 
        };

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
    setStep('selection');
    setScannedId(null);
    setPaqueteInfo(null);
    setPhoto(null);
    setPin('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-white/10">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-accent" />
            {step === 'selection' && 'Método de Verificación'}
            {step === 'scanning' && 'Escanear Ticket QR'}
            {step === 'entering_pin' && 'Ingresar PIN'}
            {step === 'photo' && 'Evidencia de Retiro'}
            {(step === 'loading' || step === 'processing') && 'Procesando...'}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4">
          {/* PASO 1: SELECCIÓN DE MÉTODO */}
          {step === 'selection' && (
            <div className="flex flex-col gap-4 py-6">
              <p className="text-center text-sm text-slate-400 mb-2">
                Selecciona la forma
              </p>
              
              <Button
                className="h-16 bg-accent text-primary font-bold text-base hover:bg-accent/90 flex items-center justify-center gap-3 rounded-xl"
                onClick={() => setStep('scanning')}
              >
                <QrCode className="h-6 w-6" /> Escanear Código QR
              </Button>
              
              <Button
                variant="outline"
                className="h-16 border-white/10 hover:bg-white/5 text-white font-bold text-base flex items-center justify-center gap-3 rounded-xl"
                onClick={() => setStep('entering_pin')}
              >
                <Keyboard className="h-6 w-6 text-accent" /> Colocar PIN de 5 dígitos
              </Button>
            </div>
          )}

          {/* PASO 2A: ESCÁNER QR */}
          {step === 'scanning' && (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-square border border-white/10">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-56 h-56 border-2 border-accent/50 rounded-2xl shadow-[0_0_0_100vmax_rgba(0,0,0,0.5)]" />
                </div>
              </div>
              <p className="text-center text-sm text-slate-400">Ubica el QR del ticket dentro del recuadro</p>
              
              <Button
                variant="ghost"
                className="w-full h-10 hover:bg-white/5 text-slate-400 flex items-center justify-center gap-2"
                onClick={() => setStep('selection')}
              >
                <ArrowLeft className="h-4 w-4" /> Volver al menú
              </Button>
            </div>
          )}

          {/* PASO 2B: INGRESO DE PIN */}
          {step === 'entering_pin' && (
            <div className="flex flex-col items-center justify-center py-4 space-y-6">
              <p className="text-sm text-slate-400 text-center">
                Ingresa el PIN de 5 dígitos
              </p>
              
              <div className="relative w-full max-w-[280px] mx-auto">
                {/* Input transparente sobre las casillas para aprovechar el teclado nativo */}
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={5}
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, ''); // Filtrar solo números
                    setPin(val);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  autoFocus
                />
                
                {/* Renderizado de las 5 casillas del PIN */}
                <div className="flex justify-between gap-2">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const char = pin[i] || '';
                    const isFocused = pin.length === i;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "w-12 h-14 bg-slate-800 border-2 rounded-xl flex items-center justify-center text-xl font-bold transition-all",
                          isFocused ? "border-accent shadow-[0_0_8px_rgba(0,255,255,0.4)]" : "border-white/10",
                          char ? "text-white" : "text-slate-500"
                        )}
                      >
                        {char || '•'}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex w-full gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-white/10 hover:bg-white/5 text-white"
                  onClick={() => {
                    setPin('');
                    setStep('selection');
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                </Button>
                <Button
                  disabled={pin.length !== 5}
                  className="flex-1 bg-accent text-primary font-bold hover:bg-accent/90"
                  onClick={() => verifyPaquete(pin, 'pin')}
                >
                  Verificar PIN
                </Button>
              </div>
            </div>
          )}

          {/* CARGAS Y PROCESAMIENTO */}
          {(step === 'loading' || step === 'processing') && (
            <div className="flex flex-col items-center py-20 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-accent" />
              <p className="text-slate-400 font-medium">
                {step === 'loading' ? 'Verificando paquete...' : 'Finalizando proceso...'}
              </p>
            </div>
          )}

          {/* PASO 3: CAPTURA DE FOTO */}
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
