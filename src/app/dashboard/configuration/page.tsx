'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Truck, 
  LogOut, 
  Package, 
  Building2, 
  UserCheck, 
  Navigation, 
  Settings,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Globe,
  MapPin,
  MapPinned,
  Search
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Ciudad {
  id: string;
  nombre: string;
}

interface Zona {
  id: string;
  nombre: string;
  ciudad_id: string;
  ciudades?: Ciudad;
}

interface Sector {
  id: string;
  nombre: string;
  zona_id: string;
  zonas?: Zona;
}

export default function ConfigurationPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('ciudades');
  
  // Data lists
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [sectores, setSectores] = useState<Sector[]>([]);
  
  // Modals state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    nombre: '',
    ciudad_id: '',
    zona_id: ''
  });

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: cityData } = await supabase.from('ciudades').select('*').order('nombre');
      const { data: zoneData } = await supabase.from('zonas').select('*, ciudades(nombre)').order('nombre');
      const { data: sectorData } = await supabase.from('sectores').select('*, zonas(nombre, ciudad_id, ciudades(nombre))').order('nombre');
      
      setCiudades(cityData || []);
      setZonas(zoneData || []);
      setSectores(sectorData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item: any = null) => {
    setEditingItem(item);
    if (item) {
      setFormData({
        nombre: item.nombre,
        ciudad_id: item.ciudad_id || '',
        zona_id: item.zona_id || ''
      });
    } else {
      setFormData({ nombre: '', ciudad_id: '', zona_id: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nombre) {
      toast({ variant: "destructive", title: "Error", description: "El nombre es obligatorio." });
      return;
    }

    setIsSaving(true);
    try {
      let error;
      if (activeTab === 'ciudades') {
        if (editingItem) {
          ({ error } = await supabase.from('ciudades').update({ nombre: formData.nombre }).eq('id', editingItem.id));
        } else {
          ({ error } = await supabase.from('ciudades').insert([{ nombre: formData.nombre }]));
        }
      } else if (activeTab === 'zonas') {
        if (!formData.ciudad_id) throw new Error("Debes seleccionar una ciudad.");
        if (editingItem) {
          ({ error } = await supabase.from('zonas').update({ nombre: formData.nombre, ciudad_id: formData.ciudad_id }).eq('id', editingItem.id));
        } else {
          ({ error } = await supabase.from('zonas').insert([{ nombre: formData.nombre, ciudad_id: formData.ciudad_id }]));
        }
      } else if (activeTab === 'sectores') {
        if (!formData.zona_id) throw new Error("Debes seleccionar una zona.");
        if (editingItem) {
          ({ error } = await supabase.from('sectores').update({ nombre: formData.nombre, zona_id: formData.zona_id }).eq('id', editingItem.id));
        } else {
          ({ error } = await supabase.from('sectores').insert([{ nombre: formData.nombre, zona_id: formData.zona_id }]));
        }
      }

      if (error) throw error;
      
      toast({ title: "Éxito", description: "Registro guardado correctamente." });
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro? Se eliminarán los datos relacionados en cascada.')) return;
    
    try {
      const { error } = await supabase.from(activeTab).delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Eliminado", description: "Registro removido correctamente." });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
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
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5">
              <UserCheck className="h-5 w-5" /> Operadores
            </Button>
          </Link>
          <Link href="/dashboard/tracking">
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5">
              <Navigation className="h-5 w-5" /> Ubicación Operador
            </Button>
          </Link>
          <Link href="/dashboard/configuration">
            <Button variant="ghost" className="w-full justify-start gap-3 bg-white/10 text-white hover:bg-white/20">
              <Settings className="h-5 w-5 text-accent" /> Configuración
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
          <h2 className="text-xl font-bold text-white">Configuración del Sistema</h2>
          <Button onClick={() => handleOpenDialog()} className="bg-accent text-primary hover:bg-accent/90 font-bold">
            <Plus className="h-4 w-4 mr-2" /> 
            {activeTab === 'ciudades' ? 'Nueva Ciudad' : activeTab === 'zonas' ? 'Nueva Zona' : 'Nuevo Sector'}
          </Button>
        </header>

        <div className="p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="ciudades" className="data-[state=active]:bg-accent data-[state=active]:text-primary font-bold">
                <Globe className="w-4 h-4 mr-2" /> Ciudades
              </TabsTrigger>
              <TabsTrigger value="zonas" className="data-[state=active]:bg-accent data-[state=active]:text-primary font-bold">
                <MapPinned className="w-4 h-4 mr-2" /> Zonas
              </TabsTrigger>
              <TabsTrigger value="sectores" className="data-[state=active]:bg-accent data-[state=active]:text-primary font-bold">
                <MapPin className="w-4 h-4 mr-2" /> Sectores
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ciudades">
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden backdrop-blur-sm">
                <Table>
                  <TableHeader className="bg-white/10">
                    <TableRow className="border-white/10">
                      <TableHead className="text-slate-300">ID</TableHead>
                      <TableHead className="text-slate-300">Nombre de la Ciudad</TableHead>
                      <TableHead className="text-right text-slate-300">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ciudades.map((c) => (
                      <TableRow key={c.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="font-mono text-[10px] text-slate-500">{c.id}</TableCell>
                        <TableCell className="font-medium text-white">{c.nombre}</TableCell>
                        <TableCell className="text-right flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="hover:bg-blue-500/20 text-blue-400" onClick={() => handleOpenDialog(c)}><Edit2 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="hover:bg-red-500/20 text-red-400" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="zonas">
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden backdrop-blur-sm">
                <Table>
                  <TableHeader className="bg-white/10">
                    <TableRow className="border-white/10">
                      <TableHead className="text-slate-300">Nombre de la Zona</TableHead>
                      <TableHead className="text-slate-300">Ciudad</TableHead>
                      <TableHead className="text-right text-slate-300">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zonas.map((z) => (
                      <TableRow key={z.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="font-medium text-white">{z.nombre}</TableCell>
                        <TableCell className="text-slate-400 flex items-center gap-2"><Globe className="w-3 h-3 text-accent" /> {z.ciudades?.nombre}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" className="hover:bg-blue-500/20 text-blue-400" onClick={() => handleOpenDialog(z)}><Edit2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="hover:bg-red-500/20 text-red-400" onClick={() => handleDelete(z.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="sectores">
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden backdrop-blur-sm">
                <Table>
                  <TableHeader className="bg-white/10">
                    <TableRow className="border-white/10">
                      <TableHead className="text-slate-300">Sector</TableHead>
                      <TableHead className="text-slate-300">Zona</TableHead>
                      <TableHead className="text-slate-300">Ciudad</TableHead>
                      <TableHead className="text-right text-slate-300">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sectores.map((s) => (
                      <TableRow key={s.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="font-medium text-white">{s.nombre}</TableCell>
                        <TableCell className="text-slate-400">{s.zonas?.nombre}</TableCell>
                        <TableCell className="text-slate-500 text-xs">{(s.zonas as any)?.ciudades?.nombre}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" className="hover:bg-blue-500/20 text-blue-400" onClick={() => handleOpenDialog(s)}><Edit2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="hover:bg-red-500/20 text-red-400" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingItem ? 'Editar' : 'Crear Nuevo'} {activeTab.slice(0, -1)}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" placeholder="Ej: Centro, Sur, Quito..." />
              </div>
              
              {activeTab === 'zonas' && (
                <div className="grid gap-2">
                  <Label>Ciudad Perteneciente</Label>
                  <Select value={formData.ciudad_id} onValueChange={(v) => setFormData({...formData, ciudad_id: v})}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Seleccionar ciudad" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/10 text-white">
                      {ciudades.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {activeTab === 'sectores' && (
                <div className="grid gap-2">
                  <Label>Zona Perteneciente</Label>
                  <Select value={formData.zona_id} onValueChange={(v) => setFormData({...formData, zona_id: v})}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Seleccionar zona" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/10 text-white">
                      {zonas.map(z => (
                        <SelectItem key={z.id} value={z.id}>{z.nombre} ({(z.ciudades as any)?.nombre})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-slate-400">Cancelar</Button>
              <Button onClick={handleSave} className="bg-accent text-primary font-bold" disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
