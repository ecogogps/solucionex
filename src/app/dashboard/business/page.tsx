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
  Mail,
  Phone,
  Package,
  UserCheck,
  MapPin,
  Key,
  Hash,
  Navigation,
  Globe
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

interface EmpresaData {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  direccion: string;
  tipo: 'ultima_milla' | 'real_time';
  ruc: string;
  guia_numero: string;
  estado: 'activo' | 'inactivo';
  created_at?: string;
  zonas?: { zona_id: string; zonas: { id: string; nombre: string; ciudades: { id: string; nombre: string } } }[];
}

interface Ciudad {
  id: string;
  nombre: string;
}

interface Zona {
  id: string;
  nombre: string;
  ciudad_id: string;
}

export default function CompaniesPage() {
  const [empresas, setEmpresas] = useState<EmpresaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<EmpresaData | null>(null);
  
  // Data for selects
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [todasZonas, setAllZonas] = useState<Zona[]>([]);
  const [filteredZonas, setFilteredZonas] = useState<Zona[]>([]);
  
  const [formData, setFormData] = useState({ 
    nombre: '', 
    correo: '', 
    password: '',
    telefono: '', 
    direccion: '', 
    tipo: 'ultima_milla' as const, 
    ruc: '', 
    guia_numero: '',
    estado: 'activo' as const,
    ciudad_id: '',
    zonas_ids: [] as string[]
  });
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (formData.ciudad_id) {
      setFilteredZonas(todasZonas.filter(z => z.ciudad_id === formData.ciudad_id));
    } else {
      setFilteredZonas([]);
    }
  }, [formData.ciudad_id, todasZonas]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch empresas with their zones and city info
      const { data: empData, error: empError } = await supabase
        .from('empresas')
        .select('*, empresa_zonas(zona_id, zonas(id, nombre, ciudades(id, nombre)))')
        .order('nombre', { ascending: true });
      
      if (empError) throw empError;
      setEmpresas(empData || []);

      // Fetch cities
      const { data: cityData } = await supabase.from('ciudades').select('*').order('nombre');
      setCiudades(cityData || []);

      // Fetch all zones
      const { data: zoneData } = await supabase.from('zonas').select('*').order('nombre');
      setAllZonas(zoneData || []);

    } catch (error: any) {
      console.error("Error cargando datos iniciales:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos." });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*, empresa_zonas(zona_id, zonas(id, nombre, ciudades(id, nombre)))')
        .order('nombre', { ascending: true });
      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error("Error al refrescar empresas:", error);
    }
  };

  const handleZoneToggle = (zoneId: string) => {
    setFormData(prev => ({
      ...prev,
      zonas_ids: prev.zonas_ids.includes(zoneId)
        ? prev.zonas_ids.filter(id => id !== zoneId)
        : [...prev.zonas_ids, zoneId]
    }));
  };

  const handleSave = async () => {
    if (!formData.nombre || !formData.correo) {
      toast({ variant: "destructive", title: "Campos incompletos", description: "El nombre y el correo son obligatorios." });
      return;
    }

    if (!editingEmpresa && !formData.password) {
      toast({ variant: "destructive", title: "Contraseña requerida", description: "Debes asignar una contraseña para el acceso de la empresa." });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        accion: editingEmpresa ? 'actualizar' : 'crear',
        userId: editingEmpresa?.id,
        email: formData.correo,
        password: formData.password || undefined,
        rol: 'empresa',
        datos: {
          nombre: formData.nombre,
          telefono: formData.telefono,
          correo: formData.correo,
          direccion: formData.direccion,
          tipo: formData.tipo,
          ruc: formData.ruc,
          guia_numero: formData.guia_numero,
          estado: formData.estado
        }
      };

      const { data, error } = await supabase.functions.invoke('crear-usuario', {
        body: payload
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Save zones relationship
      const targetEmpresaId = editingEmpresa ? editingEmpresa.id : data.user?.id;
      
      if (targetEmpresaId) {
        // Delete old zones
        await supabase.from('empresa_zonas').delete().eq('empresa_id', targetEmpresaId);
        
        // Insert new zones
        if (formData.zonas_ids.length > 0) {
          const zonePayload = formData.zonas_ids.map(zid => ({
            empresa_id: targetEmpresaId,
            zona_id: zid
          }));
          await supabase.from('empresa_zonas').insert(zonePayload);
        }
      }

      toast({ 
        title: editingEmpresa ? "Actualizado" : "Empresa Registrada", 
        description: editingEmpresa ? "Los datos y zonas han sido actualizados." : "Se ha creado el usuario y el registro exitosamente." 
      });
      
      fetchEmpresas();
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

  const deleteEmpresa = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta empresa? Esto eliminará también su cuenta de acceso de forma permanente.')) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('crear-usuario', {
        body: { accion: 'eliminar', userId: id }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Eliminado", description: "Empresa y usuario de acceso eliminados correctamente." });
      fetchEmpresas();
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

  const openNewEmpresaModal = () => {
    setEditingEmpresa(null);
    setFormData({ 
      nombre: '', 
      correo: '', 
      password: '', 
      telefono: '', 
      direccion: '', 
      tipo: 'ultima_milla', 
      ruc: '', 
      guia_numero: '', 
      estado: 'activo',
      ciudad_id: '',
      zonas_ids: []
    });
    setIsDialogOpen(true);
  };

  const openEditEmpresaModal = (empresa: any) => {
    setEditingEmpresa(empresa);
    
    // Extract zone IDs and detect city from existing relations
    const currentZones = empresa.empresa_zonas || [];
    const currentZoneIds = currentZones.map((z: any) => z.zona_id);
    const detectedCityId = currentZones.length > 0 ? currentZones[0].zonas?.ciudades?.id : '';

    setFormData({ 
      nombre: empresa.nombre, 
      correo: empresa.correo, 
      password: '', 
      telefono: empresa.telefono || '', 
      direccion: empresa.direccion || '', 
      tipo: empresa.tipo, 
      ruc: empresa.ruc || '', 
      guia_numero: empresa.guia_numero || '',
      estado: empresa.estado,
      ciudad_id: detectedCityId || '',
      zonas_ids: currentZoneIds
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
            <Button variant="ghost" className="w-full justify-start gap-3 bg-white/10 text-white hover:bg-white/20">
              <Building2 className="h-5 w-5 text-accent" /> Empresas
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
          <h2 className="text-xl font-bold text-white">Gestión de Empresas</h2>
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                placeholder="Buscar empresa..." 
                className="w-full bg-white/5 border border-white/10 rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent text-white placeholder:text-slate-500" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <Button onClick={openNewEmpresaModal} className="bg-accent text-primary hover:bg-accent/90 font-bold">
              <Plus className="h-4 w-4 mr-2" /> Nueva Empresa
            </Button>
          </div>
        </header>

        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Procesando...</p>
            </div>
          ) : empresas.length === 0 ? (
            <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center flex flex-col items-center">
              <Building2 className="h-12 w-12 text-slate-500 mb-4" />
              <h3 className="text-lg font-semibold text-white">Sin empresas registradas</h3>
              <p className="text-slate-400">Comienza registrando tu primera empresa aliada.</p>
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl shadow-2xl border border-white/10 overflow-hidden backdrop-blur-sm">
              <Table>
                <TableHeader className="bg-white/10">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="font-bold text-slate-300">Empresa</TableHead>
                    <TableHead className="font-bold text-slate-300">Contacto</TableHead>
                    <TableHead className="font-bold text-slate-300">Ubicación / Zonas</TableHead>
                    <TableHead className="font-bold text-slate-300">RUC / Guía</TableHead>
                    <TableHead className="font-bold text-slate-300">Tipo / Estado</TableHead>
                    <TableHead className="text-right font-bold text-slate-300">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresas
                    .filter(e => 
                      e.nombre.toLowerCase().includes(search.toLowerCase()) || 
                      e.correo.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((empresa) => {
                      const zonasArray = (empresa as any).empresa_zonas || [];
                      const ciudadNombre = zonasArray.length > 0 ? zonasArray[0].zonas?.ciudades?.nombre : 'Sin ciudad';
                      const numZonas = zonasArray.length;

                      return (
                        <TableRow key={empresa.id} className="border-white/10 hover:bg-white/5">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-white">{empresa.nombre}</span>
                              <span className="text-[10px] text-slate-500 flex items-center gap-1"><MapPin className="w-2 h-2" /> {empresa.direccion}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs text-slate-400 gap-1">
                              <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-accent" /> {empresa.correo}</span>
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-accent" /> {empresa.telefono}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1 text-[11px] font-bold text-white">
                                <Globe className="w-3 h-3 text-accent" /> {ciudadNombre}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="text-[9px] border-white/5 bg-white/5 text-slate-400">
                                  {numZonas} {numZonas === 1 ? 'Zona' : 'Zonas'}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs text-slate-300 gap-1">
                              <span className="font-mono">RUC: {empresa.ruc || '-'}</span>
                              <span className="font-mono text-accent">Guía: {empresa.guia_numero || '-'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="w-fit text-[10px] border-white/10 text-slate-300">
                                {empresa.tipo === 'ultima_milla' ? 'Última Milla' : 'Real Time'}
                              </Badge>
                              <Badge className={empresa.estado === 'activo' ? 'bg-green-500/20 text-green-400 border-green-500/50 w-fit' : 'bg-red-500/20 text-red-400 border-red-500/50 w-fit'}>
                                {empresa.estado}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:bg-white/10"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-slate-800 border-white/10 text-white">
                                <DropdownMenuItem 
                                  className="gap-2 cursor-pointer" 
                                  onClick={() => openEditEmpresaModal(empresa)}
                                >
                                  <Edit2 className="h-4 w-4 text-blue-400" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem 
                                  className="gap-2 text-red-400 cursor-pointer"
                                  onClick={() => deleteEmpresa(empresa.id)}
                                >
                                  <Trash2 className="h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsDialogOpen(false);
            setTimeout(() => {
              document.body.style.pointerEvents = 'auto';
            }, 300);
          }
        }}>
          <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingEmpresa ? 'Editar Empresa' : 'Registrar Nueva Empresa'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="nombre">Nombre Comercial</Label>
                  <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ruc">RUC</Label>
                  <Input id="ruc" value={formData.ruc} onChange={(e) => setFormData({...formData, ruc: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="guia_numero">Guía Nº (Identificador)</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input id="guia_numero" value={formData.guia_numero} onChange={(e) => setFormData({...formData, guia_numero: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent pl-10" placeholder="Ej: GU-001" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Tipo de Empresa</Label>
                  <Select value={formData.tipo} onValueChange={(v: any) => setFormData({...formData, tipo: v})}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/10 text-white">
                      <SelectItem value="ultima_milla">Última Milla</SelectItem>
                      <SelectItem value="real_time">Real Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="correo">Correo Electrónico (Login)</Label>
                  <Input 
                    id="correo" 
                    type="email" 
                    value={formData.correo} 
                    onChange={(e) => setFormData({...formData, correo: e.target.value})} 
                    className="bg-white/5 border-white/10 focus:ring-accent" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Contraseña {editingEmpresa && "(Nueva p. actualizar)"}</Label>
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
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" />
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

              {/* ASOCIACIÓN CIUDAD Y ZONAS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-4 mt-2">
                <div className="grid gap-2">
                  <Label className="text-accent flex items-center gap-1"><Globe className="w-3 h-3" /> Seleccionar Ciudad</Label>
                  <Select value={formData.ciudad_id} onValueChange={(v) => setFormData({...formData, ciudad_id: v, zonas_ids: []})}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Elegir ciudad..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/10 text-white">
                      {ciudades.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label className="text-accent flex items-center gap-1"><MapPin className="w-3 h-3" /> Zonas de Cobertura ({formData.zonas_ids.length})</Label>
                  <div className="bg-white/5 border border-white/10 rounded-md p-2">
                    {formData.ciudad_id ? (
                      <ScrollArea className="h-32">
                        <div className="space-y-2 pr-4">
                          {filteredZonas.map(z => (
                            <div key={z.id} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`zone-${z.id}`} 
                                checked={formData.zonas_ids.includes(z.id)}
                                onCheckedChange={() => handleZoneToggle(z.id)}
                                className="border-white/20 data-[state=checked]:bg-accent data-[state=checked]:text-primary"
                              />
                              <label htmlFor={`zone-${z.id}`} className="text-xs font-medium leading-none cursor-pointer">
                                {z.nombre}
                              </label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic py-8 text-center">Selecciona una ciudad primero</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="direccion">Dirección Fiscal</Label>
                <Input id="direccion" value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-slate-400 hover:text-white">Cancelar</Button>
              <Button onClick={handleSave} className="bg-accent text-primary hover:bg-accent/90 font-bold" disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                {editingEmpresa ? 'Guardar Cambios' : 'Registrar Empresa'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
