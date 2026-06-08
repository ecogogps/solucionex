'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  Search, 
  MoreVertical, 
  LogOut, 
  Truck, 
  Clock, 
  CheckCircle2, 
  Trash2,
  Edit2,
  Loader2,
  Building2,
  UserCheck,
  UserX,
  MapPin,
  DollarSign,
  Hash,
  MapPinned,
  Eye,
  Phone,
  CreditCard,
  FileText,
  Calendar,
  RotateCcw,
  AlertTriangle,
  ArrowRightCircle,
  PackageCheck,
  Plus,
  PlusCircle,
  Send,
  Camera,
  X,
  Image as ImageIcon,
  AlertCircle,
  Navigation,
  Volume2,
  VolumeX,
  FileDown
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PackageData {
  id: string;
  guia_numero: string;
  tipo: string;
  estado: string;
  direccion: string;
  valor_pedido: number;
  metodo_pago: string;
  operador_id: string | null;
  empresa_id: string;
  created_at: string;
  telefono?: string;
  nota?: string;
  novedad?: string;
  imagen_url?: string;
  imagen_paquete_retirado?: string;
  imagen_paquete_entregado?: string;
  imagen_paquete_entregado_novedad?: string;
  tiempo_recogida?: number;
  empresas?: { nombre: string };
  operadores?: { nombres: string };
  alerta_danio_reasignacion?: boolean;
}

interface OperadorOption {
  id: string;
  nombres: string;
}

interface EmpresaOption {
  id: string;
  nombre: string;
}

export default function DashboardAdmin() {
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [operadores, setOperadores] = useState<OperadorOption[]>([]);
  const [businesses, setBusinesses] = useState<EmpresaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const [editingPackage, setEditingPackage] = useState<PackageData | null>(null);
  const [viewingPackage, setViewingPackage] = useState<PackageData | null>(null);
  
  const [formData, setFormData] = useState({ 
    guia_numero: '',
    direccion: '', 
    estado: '',
    valor_pedido: '',
    operador_id: 'null' as string,
    nota: ''
  });

  const [createFormData, setCreateFormData] = useState({
    empresa_id: '',
    tipo: '',
    tiempo_recogida: '',
    guia_numero: '',
    valor_pedido: '',
    metodo_pago: 'transferencia',
    direccion: '',
    telefono: '',
    nota: ''
  });

  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioAlertRef = useRef<HTMLAudioElement | null>(null);
  
  const packagesRef = useRef<PackageData[]>([]);
  useEffect(() => {
    packagesRef.current = packages;
  }, [packages]);

  const router = useRouter();
  const { toast } = useToast();

  const playAlertSound = useCallback(() => {
    if (!audioAlertRef.current) {
      audioAlertRef.current = new Audio('/sounds/CLIENTE-NO-CONTESTA.mp3');
    }
    audioAlertRef.current.muted = false;
    audioAlertRef.current.play().catch(err => console.warn("Error playing alert sound:", err));
  }, []);

  useEffect(() => {
    const audioObj = new Audio('/sounds/CLIENTE-NO-CONTESTA.mp3');
    audioAlertRef.current = audioObj;
    audioObj.muted = true;

    const checkAutoplayPermission = async () => {
      try {
        await audioObj.play();
        audioObj.pause();
        audioObj.muted = false;
        setIsAudioEnabled(true);
      } catch {
        setIsAudioEnabled(false);
      }
    };
    checkAutoplayPermission();
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetchData();
      } else {
        router.push('/');
      }
    };
    
    checkSession();
    
    const channel = supabase
      .channel('admin_packages_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paquetes' }, (payload: any) => {
        if (payload.eventType === 'UPDATE') {
          const prevPkg = packagesRef.current.find(p => p.id === payload.new.id);
          if (payload.new.alerta_danio_reasignacion === true && (!prevPkg || !prevPkg.alerta_danio_reasignacion)) {
            playAlertSound();
          }
        }
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, playAlertSound]);

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
        }
      };
      getCameraPermission();
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [showCamera]);

  const fetchData = async () => {
    try {
      const { data: pkgData, error: pkgError } = await supabase
        .from('paquetes')
        .select(`
          *,
          empresas (nombre, direccion, ruc),
          operadores (nombres)
        `)
        .order('created_at', { ascending: false });
      
      if (pkgError) throw pkgError;
      setPackages(pkgData || []);

      const { data: opData, error: opError } = await supabase
        .from('operadores')
        .select('id, nombres')
        .eq('estado', 'activo');
      
      if (opError) throw opError;
      setOperadores(opData || []);

      const { data: busData, error: busError } = await supabase
        .from('empresas')
        .select('id, nombre')
        .eq('estado', 'activo')
        .order('nombre', { ascending: true });
      
      if (busError) throw busError;
      setBusinesses(busData || []);

    } catch (error: any) {
      console.error("Error fetchData:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayPackages = packages.filter(pkg => {
      const pkgDate = new Date(pkg.created_at);
      pkgDate.setHours(0, 0, 0, 0);
      return pkgDate.getTime() === today.getTime();
    });

    if (todayPackages.length === 0) {
      toast({ title: "Sin datos", description: "No hay paquetes registrados el día de hoy." });
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
    const dateStr = today.toLocaleDateString('es-EC');

    doc.setFontSize(18);
    doc.text(`Reporte de Paquetes - ${dateStr}`, 14, 15);
    doc.setFontSize(10);
    doc.text('Generado por Solucionex Delivery', 14, 22);

    const tableRows = todayPackages.map(pkg => [
      pkg.empresas?.nombre || 'N/A',
      pkg.operadores?.nombres || 'Sin asignar',
      pkg.tipo,
      pkg.guia_numero,
      `$${pkg.valor_pedido}`,
      pkg.metodo_pago,
      pkg.direccion,
      pkg.telefono || 'N/A'
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['Empresa', 'Operador', 'Tipo', 'Guía', 'Valor', 'Pago', 'Dirección', 'Teléfono']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [13, 13, 84], textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        6: { cellWidth: 50 } // Ajuste para la columna de dirección
      }
    });

    doc.save(`reporte-paquetes-${dateStr}.pdf`);
    toast({ title: "PDF Generado", description: "El reporte se ha descargado correctamente." });
  };

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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.empresa_id) {
      toast({ variant: "destructive", title: "Error", description: "Debes seleccionar una empresa." });
      return;
    }
    
    setIsSaving(true);
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
          empresa_id: createFormData.empresa_id,
          tipo: createFormData.tipo,
          tiempo_recogida: parseInt(createFormData.tiempo_recogida),
          guia_numero: createFormData.guia_numero,
          imagen_url: imageUrl,
          valor_pedido: parseFloat(createFormData.valor_pedido),
          metodo_pago: createFormData.metodo_pago,
          direccion: createFormData.direccion,
          telefono: createFormData.telefono,
          nota: createFormData.nota,
          estado: 'buscando_operador'
        }]);

      if (insertError) throw insertError;

      toast({
        title: "Solicitud registrada",
        description: `El paquete ${createFormData.guia_numero} ha sido procesado.`,
      });
      
      setIsCreateDialogOpen(false);
      resetCreateForm();
      fetchData();

    } catch (error: any) {
      console.error("Error al enviar solicitud:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo registrar la solicitud."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetCreateForm = () => {
    setCreateFormData({
      empresa_id: '',
      tipo: '',
      tiempo_recogida: '',
      guia_numero: '',
      valor_pedido: '',
      metodo_pago: 'transferencia',
      direccion: '',
      telefono: '',
      nota: ''
    });
    setCapturedImage(null);
  };

  const handleInactivarAlerta = async (pkgId: string) => {
    try {
      const { error } = await supabase
        .from('paquetes')
        .update({ alerta_danio_reasignacion: false })
        .eq('id', pkgId);

      if (error) throw error;
      toast({ title: "Alerta desactivada", description: "La alerta ha sido inactivada correctamente." });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al inactivar", description: error.message });
    }
  };

  const handleSave = async () => {
    if (!editingPackage) return;
    
    setIsSaving(true);
    try {
      const updatePayload: Record<string, any> = {
        guia_numero: formData.guia_numero,
        direccion: formData.direccion,
        estado: formData.estado,
        valor_pedido: parseFloat(formData.valor_pedido),
        operador_id: formData.operador_id === 'null' ? null : formData.operador_id,
        nota: formData.nota
      };

      if (formData.estado === 'entregado' || formData.estado === 'entregado_novedad') {
        updatePayload.alerta_danio_reasignacion = false;
      }

      const { error } = await supabase
        .from('paquetes')
        .update(updatePayload)
        .eq('id', editingPackage.id);

      if (error) throw error;

      toast({ title: "Actualizado", description: "Los cambios han sido guardados correctamente." });
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Error al guardar", 
        description: error.message 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deletePackage = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este paquete permanentemente?')) return;
    
    try {
      const { error } = await supabase.from('paquetes').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Eliminado", description: "El registro ha sido removido." });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al eliminar", description: error.message });
    }
  };

  const openEditPackageModal = (pkg: PackageData) => {
    setEditingPackage(pkg);
    setFormData({ 
      guia_numero: pkg.guia_numero,
      direccion: pkg.direccion, 
      estado: pkg.estado,
      valor_pedido: pkg.valor_pedido.toString(),
      operador_id: pkg.operador_id || 'null',
      nota: pkg.nota || ''
    });
    setTimeout(() => {
      setIsDialogOpen(true);
    }, 100);
  };

  const openViewPackageModal = (pkg: PackageData) => {
    setViewingPackage(pkg);
    setIsViewDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pedido_listo': return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50"><PackageCheck className="w-3 h-3 mr-1"/> PEDIDO LISTO</Badge>;
      case 'entregado': return <Badge className="bg-green-500/20 text-green-400 border-green-500/50"><CheckCircle2 className="w-3 h-3 mr-1"/> ENTREGADO CON EXITO</Badge>;
      case 'entregado_novedad': return <Badge className="bg-green-600/20 text-green-500 border-green-600/50"><PackageCheck className="w-3 h-3 mr-1"/> ENTREGADO CON NOVEDAD</Badge>;
      case 'en_ruta': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50"><Truck className="w-3 h-3 mr-1"/> En Transito a Destino</Badge>;
      case 'llegado': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50"><MapPinned className="w-3 h-3 mr-1"/> Paquete llego al Destino</Badge>;
      case 'camino_a_retirar': return <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/50"><ArrowRightCircle className="w-3 h-3 mr-1"/> En camino a retirar</Badge>;
      case 'llegado_a_origen': return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/50"><MapPin className="w-3 h-3 mr-1"/> Llegado a origen</Badge>;
      case 'paquete_retirado': return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50"><Package className="w-3 h-3 mr-1"/> Paquete retirado de origen</Badge>;
      case 'demorado_despacho': return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50"><AlertTriangle className="w-3 h-3 mr-1"/> Demorado Despacho</Badge>;
      case 'demorado_operador': return <Badge className="bg-red-600/20 text-red-300 border-red-600/50"><AlertTriangle className="w-3 h-3 mr-1"/> Demorado Operador</Badge>;
      case 'cancelado': return <Badge className="bg-red-500/20 text-red-400 border-red-500/50"><UserX className="w-3 h-3 mr-1"/> No ejecutado</Badge>;
      case 'anulado_retornar': return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50"><RotateCcw className="w-3 h-3 mr-1"/> Anulado - Retornar</Badge>;
      case 'buscando_operador': return <Badge variant="outline" className="text-accent border-accent/50 bg-accent/10"><Loader2 className="w-3 h-3 mr-1 animate-spin"/> Buscando Operador</Badge>;
      case 'pendiente': return <Badge variant="outline" className="text-orange-400 border-orange-400/50 bg-orange-400/10"><Clock className="w-3 h-3 mr-1"/> Pendiente</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
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
            <Button variant="ghost" className="w-full justify-start gap-3 bg-white/10 text-white hover:bg-white/20 mb-2">
              <Package className="h-5 w-5 text-accent" /> Paquetes
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
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5">
              <Navigation className="h-5 w-5" /> Ubicación Operador
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
          <h2 className="text-xl font-bold text-white">Gestión Paquetes</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {!isAudioEnabled ? (
                <Badge variant="outline" className="border-yellow-500/50 text-yellow-500 gap-1 text-[10px] py-1 cursor-pointer" onClick={() => setIsAudioEnabled(true)}>
                  <VolumeX className="h-3 w-3" /> Sonido Silenciado
                </Badge>
              ) : (
                <Badge variant="outline" className="border-accent/20 text-accent/50 gap-1 text-[10px] py-1">
                  <Volume2 className="h-3 w-3" /> Sonido Activo
                </Badge>
              )}
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                placeholder="Buscar guía o empresa..." 
                className="w-full bg-white/5 border border-white/10 rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent text-white placeholder:text-slate-500" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={exportToPDF} variant="outline" className="border-accent text-accent hover:bg-accent/10 font-bold gap-2">
              <FileDown className="h-4 w-4" /> Exportar Hoy
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-accent text-primary hover:bg-accent/90 font-bold">
              <Plus className="h-4 w-4 mr-2" /> Nuevo Paquete
            </Button>
          </div>
        </header>

        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Sincronizando...</p>
            </div>
          ) : packages.length === 0 ? (
            <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center flex flex-col items-center">
              <Package className="h-12 w-12 text-slate-500 mb-4" />
              <h3 className="text-lg font-semibold text-white">Sin registros</h3>
              <p className="text-slate-400">No hay paquetes activos en el sistema.</p>
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl shadow-2xl border border-white/10 overflow-hidden backdrop-blur-sm">
              <Table>
                <TableHeader className="bg-white/10">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="font-bold text-slate-300">Guía / Fecha</TableHead>
                    <TableHead className="font-bold text-slate-300">Empresa / Operador</TableHead>
                    <TableHead className="font-bold text-slate-300">Destino</TableHead>
                    <TableHead className="font-bold text-slate-300">Valor</TableHead>
                    <TableHead className="font-bold text-slate-300">Estado</TableHead>
                    <TableHead className="text-right font-bold text-slate-300">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages
                    .filter(p => 
                      p.guia_numero.toLowerCase().includes(search.toLowerCase()) || 
                      p.empresas?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
                      p.operadores?.nombres?.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((pkg) => (
                    <TableRow key={pkg.id} className="border-white/10 hover:bg-white/5">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono font-medium text-accent">{pkg.guia_numero}</span>
                          <span className="text-[10px] text-slate-500">{new Date(pkg.created_at).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-white text-xs flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" /> {pkg.empresas?.nombre || 'N/A'}
                          </span>
                          <span className="text-slate-400 text-[10px] flex items-center gap-1 italic">
                            <UserCheck className="w-3 h-3" /> {pkg.operadores?.nombres || 'No asignado'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-slate-300 text-xs">
                         <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" /> {pkg.direccion}
                         </div>
                      </TableCell>
                      <TableCell className="text-white font-bold">${pkg.valor_pedido}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5 items-start">
                          {getStatusBadge(pkg.estado)}
                          
                          {pkg.alerta_danio_reasignacion && (
                            <div className="flex flex-col gap-1 items-start mt-0.5">
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-[9px] px-1 py-0 animate-pulse">
                                  DAÑO / REASIGNACIÓN
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 text-[9px] hover:bg-white/10 text-yellow-500 hover:text-yellow-400 px-1.5 border border-yellow-500/30 font-bold"
                                onClick={() => handleInactivarAlerta(pkg.id)}
                              >
                                Inactivar Alerta
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hover:bg-accent/20 text-accent"
                            onClick={() => openViewPackageModal(pkg)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="hover:bg-white/10"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-800 border-white/10 text-white">
                              <DropdownMenuItem 
                                className="gap-2 cursor-pointer" 
                                onClick={() => openEditPackageModal(pkg)}
                              >
                                <Edit2 className="h-4 w-4 text-blue-400" /> Gestionar
                              </DropdownMenuItem>
                              
                              {pkg.alerta_danio_reasignacion && (
                                <DropdownMenuItem 
                                  className="gap-2 text-yellow-500 cursor-pointer"
                                  onClick={() => handleInactivarAlerta(pkg.id)}
                                >
                                  <AlertTriangle className="h-4 w-4" /> Inactivar Alerta
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem 
                                className="gap-2 text-red-400 cursor-pointer"
                                onClick={() => deletePackage(pkg.id)}
                              >
                                <Trash2 className="h-4 w-4" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* DIALOG DE CREACIÓN */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white text-base flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-accent" /> Datos del Paquete (Nueva Solicitud)
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Empresa Solicitante</Label>
                  <Select 
                    value={createFormData.empresa_id} 
                    onValueChange={(v) => setCreateFormData({...createFormData, empresa_id: v})}
                    required
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Seleccionar empresa" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      {businesses.map((bus) => (
                        <SelectItem key={bus.id} value={bus.id}>{bus.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Tipo de Paquete</Label>
                  <Select 
                    value={createFormData.tipo} 
                    onValueChange={(v) => setCreateFormData({...createFormData, tipo: v})}
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Tiempo de Recogida</Label>
                  <Select 
                    value={createFormData.tiempo_recogida} 
                    onValueChange={(v) => setCreateFormData({...createFormData, tiempo_recogida: v})}
                    required
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Tiempo estimado" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      <SelectItem value="5">5 minutos</SelectItem>
                      <SelectItem value="10">10 minutos</SelectItem>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="20">20 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-guia" className="text-slate-300">Guía Nº</Label>
                  <Input 
                    id="create-guia"
                    className="bg-white/5 border-white/10 text-white" 
                    value={createFormData.guia_numero}
                    onChange={(e) => setCreateFormData({...createFormData, guia_numero: e.target.value})}
                    placeholder="Ej: GU-001"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-300">Método de Pago</Label>
                  <RadioGroup value={createFormData.metodo_pago} onValueChange={(v) => setCreateFormData({...createFormData, metodo_pago: v})} className="flex gap-4 pt-1">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="transferencia" id="create-transferencia" className="border-accent text-accent" />
                      <Label htmlFor="create-transferencia" className="cursor-pointer text-sm">Transf.</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="efectivo" id="create-efectivo" className="border-accent text-accent" />
                      <Label htmlFor="create-efectivo" className="cursor-pointer text-sm">Efec.</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-valor" className="text-slate-300">Valor Pedido ($)</Label>
                  <Input id="create-valor" type="number" step="0.01" className="bg-white/5 border-white/10 text-white" value={createFormData.valor_pedido} onChange={(e) => setCreateFormData({...createFormData, valor_pedido: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-telf" className="text-slate-300">Teléfono</Label>
                  <Input id="create-telf" type="text" inputMode="numeric" className="bg-white/5 border-white/10 text-white" value={createFormData.telefono} onChange={(e) => setCreateFormData({...createFormData, telefono: e.target.value.replace(/\D/g, '')})} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-dir" className="text-slate-300">Dirección</Label>
                <Input id="create-dir" className="bg-white/5 border-white/10 text-white" value={createFormData.direccion} onChange={(e) => setCreateFormData({...createFormData, direccion: e.target.value})} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-nota" className="text-slate-300">Nota</Label>
                <Textarea id="create-nota" className="bg-white/5 border-white/10 text-white min-h-[100px]" value={createFormData.nota} onChange={(e) => setCreateFormData({...createFormData, nota: e.target.value})} />
              </div>

              <DialogFooter className="pt-4 border-t border-white/5">
                <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)} className="text-slate-400">Cancelar</Button>
                <Button type="submit" className="bg-accent text-primary hover:bg-accent/90 font-bold px-8" disabled={isSaving}>
                  {isSaving ? <Loader2 className="animate-spin" /> : <><Send className="mr-2 h-4 w-4" /> Enviar Solicitud</>}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DIALOG DE EDICIÓN */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-lg">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-accent" /> Gestionar Paquete
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="guia" className="text-slate-400 flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Guía Nº
                  </Label>
                  <Input id="guia" value={formData.guia_numero} onChange={(e) => setFormData({...formData, guia_numero: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="valor" className="text-slate-400 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> Valor Pedido ($)
                  </Label>
                  <Input id="valor" type="number" step="0.01" value={formData.valor_pedido} onChange={(e) => setFormData({...formData, valor_pedido: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dest" className="text-slate-400 flex items-center gap-1">
                   <MapPin className="w-3 h-3" /> Dirección de Destino
                </Label>
                <Input id="dest" value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-slate-400">Operador Asignado</Label>
                  <Select value={formData.operador_id} onValueChange={(v) => setFormData({...formData, operador_id: v})}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/10 text-white">
                      <SelectItem value="null">-- Ninguno --</SelectItem>
                      {operadores.map((op) => (
                        <SelectItem key={op.id} value={op.id}>{op.nombres}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-slate-400">Estado de Gestión</Label>
                  <Select value={formData.estado} onValueChange={(v) => setFormData({...formData, estado: v})}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/10 text-white">
                      <SelectItem value="pedido_listo">Pedido Listo</SelectItem>
                      <SelectItem value="buscando_operador">Buscando Operador</SelectItem>
                      <SelectItem value="pendiente">Pendiente (Asignado)</SelectItem>
                      <SelectItem value="camino_a_retirar">Estoy en camino a retirar</SelectItem>
                      <SelectItem value="llegado_a_origen">Llegado a origen</SelectItem>
                      <SelectItem value="demorado_despacho">Demorado Despacho</SelectItem>
                      <SelectItem value="demorado_operador">Demorado Operador</SelectItem>
                      <SelectItem value="paquete_retirado">Paquete retirado de origen</SelectItem>
                      <SelectItem value="en_ruta">En Transito a Destino</SelectItem>
                      <SelectItem value="llegado">Paquete llego al Destino</SelectItem>
                      <SelectItem value="entregado">ENTREGADO CON EXITO</SelectItem>
                      <SelectItem value="entregado_novedad">ENTREGADO CON NOVEDAD</SelectItem>
                      <SelectItem value="cancelado">No ejecutado</SelectItem>
                      <SelectItem value="anulado_retornar">Anulado - Retornar a origen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="nota-edit" className="text-slate-400 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Nota / Instrucciones
                </Label>
                <Textarea 
                  id="nota-edit" 
                  value={formData.nota} 
                  onChange={(e) => setFormData({...formData, nota: e.target.value})} 
                  className="bg-white/5 border-white/10 focus:ring-accent min-h-[80px]" 
                  placeholder="Instrucciones adicionales para el operador..."
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 border-t border-white/5 pt-4">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-slate-400 hover:text-white">Cerrar</Button>
              <Button onClick={handleSave} className="bg-accent text-primary hover:bg-accent/90 font-bold" disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG DE CÁMARA PARA CREACIÓN */}
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

        {/* DIALOG DE VISTA DE DETALLES */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Eye className="h-5 w-5 text-accent" /> Detalles del Paquete
              </DialogTitle>
            </DialogHeader>
            
            {viewingPackage && (
              <div className="grid gap-6 py-4">
                <div className="flex justify-between items-start border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-accent">Guía: {viewingPackage.guia_numero}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" /> {new Date(viewingPackage.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(viewingPackage.estado)}
                    <Badge variant="outline" className="border-white/10 text-slate-400 text-[10px] uppercase">
                      {viewingPackage.tipo}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                    <Label className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1 mb-2">
                      <Building2 className="w-3 h-3" /> Empresa Cliente
                    </Label>
                    <p className="font-semibold">{viewingPackage.empresas?.nombre || 'No disponible'}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                    <Label className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1 mb-2">
                      <UserCheck className="w-3 h-3" /> Operador Asignado
                    </Label>
                    <p className="font-semibold">{viewingPackage.operadores?.nombres || 'Sin asignar'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-accent shrink-0 mt-1" />
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase">Dirección de Destino</p>
                      <p className="text-sm">{viewingPackage.direccion}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-accent shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase">Teléfono Cliente</p>
                        <p className="text-sm font-mono">{viewingPackage.telefono || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-accent shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase">Valor y Pago</p>
                        <p className="text-sm font-bold">${viewingPackage.valor_pedido} <span className="text-[10px] text-slate-400 font-normal uppercase">({viewingPackage.metodo_pago})</span></p>
                      </div>
                    </div>
                  </div>

                  {viewingPackage.tiempo_recogida && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-accent shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase">Tiempo Recogida (Empresa)</p>
                        <p className="text-sm">{viewingPackage.tiempo_recogida} minutos</p>
                      </div>
                    </div>
                  )}

                  {viewingPackage.nota && (
                    <div className="flex items-start gap-3 bg-white/5 p-3 rounded-lg border-l-2 border-accent">
                      <FileText className="h-5 w-5 text-accent shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase">Notas / Instrucciones</p>
                        <p className="text-sm italic text-slate-300">{viewingPackage.nota}</p>
                      </div>
                    </div>
                  )}

                  {viewingPackage.novedad && (
                    <div className="flex items-start gap-3 bg-red-500/5 p-3 rounded-lg border-l-2 border-red-500">
                      <UserX className="h-5 w-5 text-red-400 shrink-0" />
                      <div>
                        <p className="text-xs text-red-400 font-bold uppercase">Novedad del Operador</p>
                        <p className="text-sm italic text-slate-300">{viewingPackage.novedad}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewingPackage.imagen_url && (
                      <div className="space-y-2 pt-2">
                        <Label className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1">
                          <CreditCard className="w-3 h-3" /> Imagen de Guía Física
                        </Label>
                        <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black">
                          <Image 
                            src={viewingPackage.imagen_url} 
                            alt="Imagen Guía" 
                            fill 
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                      </div>
                    )}

                    {viewingPackage.imagen_paquete_retirado && (
                      <div className="space-y-2 pt-2">
                        <Label className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1">
                          <Package className="w-3 h-3 text-accent" /> Evidencia de Retiro (Origen)
                        </Label>
                        <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black">
                          <Image 
                            src={viewingPackage.imagen_paquete_retirado} 
                            alt="Evidencia Retiro" 
                            fill 
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                      </div>
                    )}

                    {viewingPackage.imagen_paquete_entregado && (
                      <div className="space-y-2 pt-2">
                        <Label className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-400" /> Evidencia de Entrega
                        </Label>
                        <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black">
                          <Image 
                            src={viewingPackage.imagen_paquete_entregado} 
                            alt="Evidencia Entrega" 
                            fill 
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                      </div>
                    )}

                    {viewingPackage.imagen_paquete_entregado_novedad && (
                      <div className="space-y-2 pt-2">
                        <Label className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1">
                          <PackageCheck className="w-3 h-3 text-green-600" /> Evidencia Entrega Novedad
                        </Label>
                        <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black">
                          <Image 
                            src={viewingPackage.imagen_paquete_entregado_novedad} 
                            alt="Evidencia Entrega Novedad" 
                            fill 
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter className="border-t border-white/5 pt-4">
              <Button variant="ghost" onClick={() => setIsViewDialogOpen(false)} className="w-full text-slate-400 hover:text-white">
                Cerrar Vista
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
