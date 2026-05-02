'use client';

import { useState, useEffect } from 'react';
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
  RotateCcw
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

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
  tiempo_recogida?: number;
  empresas?: { nombre: string };
  operadores?: { nombres: string };
}

interface OperadorOption {
  id: string;
  nombres: string;
}

export default function DashboardAdmin() {
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [operadores, setOperadores] = useState<OperadorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  const [editingPackage, setEditingPackage] = useState<PackageData | null>(null);
  const [viewingPackage, setViewingPackage] = useState<PackageData | null>(null);
  
  const [formData, setFormData] = useState({ 
    guia_numero: '',
    direccion: '', 
    estado: '',
    valor_pedido: '',
    operador_id: 'null' as string
  });
  
  const router = useRouter();
  const { toast } = useToast();

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paquetes' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const fetchData = async () => {
    try {
      const { data: pkgData, error: pkgError } = await supabase
        .from('paquetes')
        .select(`
          *,
          empresas (nombre),
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

    } catch (error: any) {
      console.error("Error fetchData:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingPackage) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('paquetes')
        .update({
          guia_numero: formData.guia_numero,
          direccion: formData.direccion,
          estado: formData.estado,
          valor_pedido: parseFloat(formData.valor_pedido),
          operador_id: formData.operador_id === 'null' ? null : formData.operador_id
        })
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
      operador_id: pkg.operador_id || 'null'
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
    const s = status.toLowerCase();
    switch (s) {
      case 'entregado': return <Badge className="bg-green-500/20 text-green-400 border-green-500/50"><CheckCircle2 className="w-3 h-3 mr-1"/> Entregado</Badge>;
      case 'en_ruta': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50"><Truck className="w-3 h-3 mr-1"/> En camino</Badge>;
      case 'llegado': return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50"><MapPinned className="w-3 h-3 mr-1"/> He llegado</Badge>;
      case 'cancelado': return <Badge className="bg-red-500/20 text-red-400 border-red-500/50"><UserX className="w-3 h-3 mr-1"/> Entrega no ejecutada</Badge>;
      case 'anulado_retornar': return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50"><RotateCcw className="w-3 h-3 mr-1"/> Anulado - Retornar</Badge>;
      case 'buscando_operador': return <Badge variant="outline" className="text-accent border-accent/50 bg-accent/10"><Loader2 className="w-3 h-3 mr-1 animate-spin"/> Buscando</Badge>;
      default: return <Badge variant="outline" className="text-orange-400 border-orange-400/50 bg-orange-400/10"><Clock className="w-3 h-3 mr-1"/> Pendiente</Badge>;
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
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                placeholder="Buscar por guía o empresa..." 
                className="w-full bg-white/5 border border-white/10 rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent text-white placeholder:text-slate-500" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
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
                      <TableCell>{getStatusBadge(pkg.estado)}</TableCell>
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-lg">
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
                      <SelectItem value="buscando_operador">Buscando Operador</SelectItem>
                      <SelectItem value="pendiente">Pendiente (Asignado)</SelectItem>
                      <SelectItem value="en_ruta">En camino</SelectItem>
                      <SelectItem value="llegado">He llegado</SelectItem>
                      <SelectItem value="entregado">Entregado</SelectItem>
                      <SelectItem value="cancelado">Entrega no ejecutada</SelectItem>
                      <SelectItem value="anulado_retornar">Anulado - Retornar a origen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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