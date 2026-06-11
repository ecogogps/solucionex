'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Plus, 
  Search, 
  MoreVertical, 
  LogOut, 
  Truck, 
  Trash2,
  Edit2,
  Loader2,
  Phone,
  Package,
  UserCheck,
  BadgeCheck,
  CreditCard,
  Key,
  Navigation,
  Settings,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface OperadorData {
  id: string;
  nombres: string;
  telefono: string;
  correo: string;
  cedula: string;
  tipo: 'clase_a' | 'clase_b' | 'clase_s';
  estado: 'activo' | 'inactivo';
  created_at?: string;
}

interface EmpresaOption {
  id: string;
  nombre: string;
}

export default function OperatorsPage() {
  const [operadores, setOperadores] = useState<OperadorData[]>([]);
  const [allBusinesses, setAllBusinesses] = useState<EmpresaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modals state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  
  const [editingOperador, setEditingOperador] = useState<OperadorData | null>(null);
  const [selectedOperatorForAssign, setSelectedOperatorForAssign] = useState<OperadorData | null>(null);
  const [assignedBusinessIds, setAssignedBusinessIds] = useState<string[]>([]);
  const [fetchingAssignments, setFetchingAssignments] = useState(false);
  
  const [formData, setFormData] = useState({ 
    nombres: '', 
    email: '',
    password: '',
    telefono: '', 
    cedula: '', 
    tipo: 'clase_b' as const, 
    estado: 'activo' as const 
  });
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchOperadores();
    fetchBusinesses();
  }, []);

  const fetchOperadores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('operadores')
        .select('*')
        .order('nombres', { ascending: true });
      
      if (error) throw error;
      setOperadores(data || []);
    } catch (error: any) {
      console.error("Error cargando operadores:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los operadores." });
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinesses = async () => {
    try {
      const { data } = await supabase
        .from('empresas')
        .select('id, nombre')
        .eq('estado', 'activo')
        .order('nombre');
      setAllBusinesses(data || []);
    } catch (err) {
      console.error("Error fetching businesses:", err);
    }
  };

  const handleOpenAssignModal = async (op: OperadorData) => {
    setSelectedOperatorForAssign(op);
    setAssignedBusinessIds([]);
    setIsAssignDialogOpen(true);
    setFetchingAssignments(true);

    try {
      const { data, error } = await supabase
        .from('empresa_operadores')
        .select('empresa_id')
        .eq('operador_id', op.id);
      
      if (error) throw error;
      setAssignedBusinessIds((data || []).map(row => row.empresa_id));
    } catch (err) {
      console.error("Error loading assignments:", err);
    } finally {
      setFetchingAssignments(false);
    }
  };

  const handleToggleBusiness = (businessId: string) => {
    setAssignedBusinessIds(prev => 
      prev.includes(businessId) 
        ? prev.filter(id => id !== businessId) 
        : [...prev, businessId]
    );
  };

  const handleSaveAssignments = async () => {
    if (!selectedOperatorForAssign) return;
    setIsSaving(true);

    try {
      // 1. Eliminar asignaciones previas
      await supabase
        .from('empresa_operadores')
        .delete()
        .eq('operador_id', selectedOperatorForAssign.id);

      // 2. Insertar nuevas
      if (assignedBusinessIds.length > 0) {
        const insertPayload = assignedBusinessIds.map(bid => ({
          operador_id: selectedOperatorForAssign.id,
          empresa_id: bid
        }));
        const { error } = await supabase.from('empresa_operadores').insert(insertPayload);
        if (error) throw error;
      }

      toast({ title: "Éxito", description: "Empresas asignadas correctamente al operador." });
      setIsAssignDialogOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editingOperador) {
      if (!formData.nombres || !formData.cedula || !formData.email) {
        toast({ 
          variant: "destructive", 
          title: "Campos incompletos", 
          description: "Nombre, cédula y correo son obligatorios para nuevos operadores." 
        });
        return;
      }
      if (!formData.password) {
        toast({ 
          variant: "destructive", 
          title: "Contraseña requerida", 
          description: "Debes asignar una contraseña para el acceso del nuevo operador." 
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        accion: editingOperador ? 'actualizar' : 'crear',
        userId: editingOperador?.id,
        email: formData.email,
        password: formData.password || undefined,
        rol: 'operador',
        datos: {
          nombres: formData.nombres,
          telefono: formData.telefono,
          cedula: formData.cedula,
          correo: formData.email,
          tipo: formData.tipo,
          estado: formData.estado
        }
      };

      const { data, error } = await supabase.functions.invoke('crear-usuario', {
        body: payload
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ 
        title: editingOperador ? "Actualizado" : "Operador Registrado", 
        description: editingOperador ? "Los datos y credenciales han sido actualizados." : "Se ha creado el usuario y el registro exitosamente." 
      });
      
      fetchOperadores();
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error al guardar:", error);
      toast({ 
        variant: "destructive", 
        title: "Error al guardar", 
        description: error.message || "Ocurrió un error inesperado." 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteOperador = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este operador? Esto eliminará también su cuenta de acceso de forma permanente.')) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('crear-usuario', {
        body: { accion: 'eliminar', userId: id }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Eliminado", description: "Operador y usuario de acceso eliminados correctamente." });
      fetchOperadores();
    } catch (error: any) {
      console.error("Error al eliminar:", error);
      toast({ 
        variant: "destructive", 
        title: "Error al eliminar", 
        description: error.message || "No se pudo eliminar el registro." 
      });
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const openNewOperadorModal = () => {
    setEditingOperador(null);
    setFormData({ nombres: '', email: '', password: '', telefono: '', cedula: '', tipo: 'clase_b', estado: 'activo' });
    setIsDialogOpen(true);
  };

  const openEditOperadorModal = (op: OperadorData) => {
    setEditingOperador(op);
    setFormData({ 
      nombres: op.nombres || '', 
      email: op.correo || '', 
      password: '',
      telefono: op.telefono || '', 
      cedula: op.cedula || '', 
      tipo: op.tipo || 'clase_b', 
      estado: op.estado || 'activo' 
    });
    setTimeout(() => {
      setIsDialogOpen(true);
    }, 100);
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
            <Button variant="ghost" className="w-full justify-start gap-3 bg-white/10 text-white hover:bg-white/20">
              <UserCheck className="h-5 w-5 text-accent" /> Operadores
            </Button>
          </Link>
          <Link href="/dashboard/tracking">
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5">
              <Navigation className="h-5 w-5" /> Ubicación Operador
            </Button>
          </Link>
          <Link href="/dashboard/configuration">
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5">
              <Settings className="h-5 w-5" /> Configuración
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
          <h2 className="text-xl font-bold text-white">Gestión de Operadores</h2>
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                placeholder="Buscar operador..." 
                className="w-full bg-white/5 border border-white/10 rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent text-white placeholder:text-slate-500" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <Button onClick={openNewOperadorModal} className="bg-accent text-primary hover:bg-accent/90 font-bold">
              <Plus className="h-4 w-4 mr-2" /> Nuevo Operador
            </Button>
          </div>
        </header>

        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Procesando...</p>
            </div>
          ) : operadores.length === 0 ? (
            <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center flex flex-col items-center">
              <UserCheck className="h-12 w-12 text-slate-500 mb-4" />
              <h3 className="text-lg font-semibold text-white">Sin operadores registrados</h3>
              <p className="text-slate-400">Agrega conductores para empezar a asignar pedidos.</p>
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl shadow-2xl border border-white/10 overflow-hidden backdrop-blur-sm">
              <Table>
                <TableHeader className="bg-white/10">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="font-bold text-slate-300">Operador</TableHead>
                    <TableHead className="font-bold text-slate-300">Cédula</TableHead>
                    <TableHead className="font-bold text-slate-300">Tipo / Estado</TableHead>
                    <TableHead className="font-bold text-slate-300">Teléfono</TableHead>
                    <TableHead className="text-right font-bold text-slate-300">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operadores
                    .filter(o => 
                      o.nombres?.toLowerCase().includes(search.toLowerCase()) || 
                      o.cedula?.toLowerCase().includes(search.toLowerCase()) ||
                      o.correo?.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((op) => (
                    <TableRow key={op.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                            <BadgeCheck className="w-4 h-4 text-accent" />
                          </div>
                          <div className="flex flex-col">
                            <span>{op.nombres}</span>
                            <span className="text-[10px] text-slate-500">{op.correo}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300 font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-3 h-3 text-slate-500" />
                          {op.cedula}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="w-fit text-[10px] border-white/10 text-slate-300 uppercase">
                            {op.tipo?.replace('_', ' ')}
                          </Badge>
                          <Badge className={op.estado === 'activo' ? 'bg-green-500/20 text-green-400 border-green-500/50 w-fit' : 'bg-red-500/20 text-red-400 border-red-500/50 w-fit'}>
                            {op.estado}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs">
                        <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-accent" /> {op.telefono}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-white/10"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-800 border-white/10 text-white">
                            <DropdownMenuItem 
                              className="gap-2 cursor-pointer" 
                              onClick={() => openEditOperadorModal(op)}
                            >
                              <Edit2 className="h-4 w-4 text-blue-400" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="gap-2 cursor-pointer" 
                              onClick={() => handleOpenAssignModal(op)}
                            >
                              <ShieldCheck className="h-4 w-4 text-accent" /> Asignar Empresa
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem 
                              className="gap-2 text-red-400 cursor-pointer"
                              onClick={() => deleteOperador(op.id)}
                            >
                              <Trash2 className="h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* DIALOG REGISTRO/EDICIÓN */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsDialogOpen(false);
            setTimeout(() => {
              document.body.style.pointerEvents = 'auto';
            }, 300);
          }
        }}>
          <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingOperador ? 'Editar Operador' : 'Registrar Nuevo Operador'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nombres">Nombres Completos</Label>
                <Input id="nombres" value={formData.nombres} onChange={(e) => setFormData({...formData, nombres: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Correo Electrónico (Login)</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    className="bg-white/5 border-white/10 focus:ring-accent" 
                    placeholder="operador@gmail.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Contraseña {editingOperador && "(Nueva p. actualizar)"}</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input 
                      id="password" 
                      type="password" 
                      value={formData.password} 
                      onChange={(e) => setFormData({...formData, password: e.target.value})} 
                      className="bg-white/5 border-white/10 focus:ring-accent pl-10" 
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cedula">Cédula</Label>
                  <Input id="cedula" value={formData.cedula} onChange={(e) => setFormData({...formData, cedula: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Tipo de Operador</Label>
                  <Select value={formData.tipo} onValueChange={(v: any) => setFormData({...formData, tipo: v})}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/10 text-white">
                      <SelectItem value="clase_a">Clase A</SelectItem>
                      <SelectItem value="clase_b">Clase B</SelectItem>
                      <SelectItem value="clase_s">Clase S</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Estado</Label>
                  <Select value={formData.estado} onValueChange={(v: any) => setFormData({...formData, estado: v})}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/10 text-white">
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-slate-400 hover:text-white">Cancelar</Button>
              <Button onClick={handleSave} className="bg-accent text-primary hover:bg-accent/90 font-bold" disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                {editingOperador ? 'Guardar Cambios' : 'Registrar Operador'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG ASIGNACIÓN DE EMPRESA */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-accent" /> 
                Asignar Empresas a {selectedOperatorForAssign?.nombres}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {fetchingAssignments ? (
                <div className="flex flex-col items-center py-8 text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p className="text-xs">Cargando asignaciones...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400">Selecciona las empresas que este operador podrá atender:</p>
                  <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                    <ScrollArea className="h-64 p-4">
                      <div className="space-y-3">
                        {allBusinesses.map((bus) => (
                          <div key={bus.id} className="flex items-center space-x-3 group">
                            <Checkbox 
                              id={`bus-${bus.id}`} 
                              checked={assignedBusinessIds.includes(bus.id)}
                              onCheckedChange={() => handleToggleBusiness(bus.id)}
                              className="border-white/20 data-[state=checked]:bg-accent data-[state=checked]:text-primary"
                            />
                            <label 
                              htmlFor={`bus-${bus.id}`} 
                              className="text-sm font-medium leading-none cursor-pointer group-hover:text-accent transition-colors"
                            >
                              {bus.nombre}
                            </label>
                          </div>
                        ))}
                        {allBusinesses.length === 0 && (
                          <p className="text-center text-xs text-slate-500 py-8">No hay empresas activas disponibles.</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                    <p className="text-[10px] text-blue-300 italic">
                      Nota: Si la empresa tiene configurado "Operadores Exclusivos", solo los operadores asignados aquí verán sus pedidos.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAssignDialogOpen(false)} className="text-slate-400">Cancelar</Button>
              <Button onClick={handleSaveAssignments} className="bg-accent text-primary font-bold" disabled={isSaving || fetchingAssignments}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Guardar Asignaciones
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
