'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Globe,
  MapPin,
  MapPinned,
  Percent,
  Settings
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
import MultiplicadorConfig from '@/components/MultiplicadorConfig';
import TasaConfig from '@/components/TasaConfig';

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
  valor?: number;
  valor_operador?: number;
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
    zona_id: '',
    valor: '0',
    valor_operador: '0'
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
      const { data: sectorData = [] } = await supabase.from('sectores').select('*, zonas(nombre, ciudad_id, ciudades(nombre))').order('nombre');
      
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
        zona_id: item.zona_id || '',
        valor: item.valor !== undefined ? String(item.valor) : '0',
        valor_operador: item.valor_operador !== undefined ? String(item.valor_operador) : '0'
      });
    } else {
      setFormData({ 
        nombre: '', 
        ciudad_id: '', 
        zona_id: '',
        valor: '0',
        valor_operador: '0'
      });
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
        
        const sectorPayload = {
          nombre: formData.nombre,
          zona_id: formData.zona_id,
          valor: parseFloat(formData.valor) || 0,
          valor_operador: parseFloat(formData.valor_operador) || 0
        };

        if (editingItem) {
          ({ error } = await supabase.from('sectores').update(sectorPayload).eq('id', editingItem.id));
        } else {
          ({ error } = await supabase.from('sectores').insert([sectorPayload]));
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

  return (
    <>
      <header className="h-16 bg-white/5 border-b border-white/10 flex items-center justify-between px-8">
        <h2 className="text-xl font-bold text-white">Configuración del Sistema</h2>
        {activeTab !== 'multiplicadores' && activeTab !== 'config' && ( // <--- Modificado
          <Button onClick={() => handleOpenDialog()} className="bg-accent text-primary hover:bg-accent/90 font-bold">
            <Plus className="h-4 w-4 mr-2" /> 
            {activeTab === 'ciudades' ? 'Nueva Ciudad' : activeTab === 'zonas' ? 'Nueva Zona' : 'Nuevo Sector'}
          </Button>
        )}
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
            <TabsTrigger value="multiplicadores" className="data-[state=active]:bg-accent data-[state=active]:text-primary font-bold">
              <Percent className="w-4 h-4 mr-2" /> Multiplicadores
            </TabsTrigger>
            <TabsTrigger value="config" className="data-[state=active]:bg-accent data-[state=active]:text-primary font-bold"> {/* <--- Agregado */}
              <Settings className="w-4 h-4 mr-2" /> Tasa
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
                          <Button variant="ghost" size="icon" className="hover:bg-blue-500/20 text-blue-400" onClick={() => handleOpenDialog(z)}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="hover:bg-red-500/20 text-red-400" onClick={() => handleDelete(z.id)}><Trash2 className="h-4 w-4" /></Button>
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
                    <TableHead className="text-slate-300">Valor</TableHead>
                    <TableHead className="text-slate-300">Valor Operador</TableHead>
                    <TableHead className="text-right text-slate-300">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectores.map((s) => (
                    <TableRow key={s.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">{s.nombre}</TableCell>
                      <TableCell className="text-slate-400">{s.zonas?.nombre}</TableCell>
                      <TableCell className="text-slate-500 text-xs">{(s.zonas as any)?.ciudades?.nombre}</TableCell>
                      <TableCell className="font-mono text-white">${s.valor !== undefined ? Number(s.valor).toFixed(2) : '0.00'}</TableCell>
                      <TableCell className="font-mono text-white">${s.valor_operador !== undefined ? Number(s.valor_operador).toFixed(2) : '0.00'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="hover:bg-blue-500/20 text-blue-400" onClick={() => handleOpenDialog(s)}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="hover:bg-red-500/20 text-red-400" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="multiplicadores">
            <MultiplicadorConfig />
          </TabsContent>

          <TabsContent value="config"> {/* <--- Agregado */}
            <TasaConfig />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingItem ? 'Editar' : 'Crear Nuevo'}
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
              <>
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="valor">Valor</Label>
                    <Input 
                      id="valor" 
                      type="number" 
                      step="0.01"
                      value={formData.valor} 
                      onChange={(e) => setFormData({...formData, valor: e.target.value})} 
                      className="bg-white/5 border-white/10 focus:ring-accent" 
                      placeholder="0.00" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="valor_operador">Valor Operador</Label>
                    <Input 
                      id="valor_operador" 
                      type="number" 
                      step="0.01"
                      value={formData.valor_operador} 
                      onChange={(e) => setFormData({...formData, valor_operador: e.target.value})} 
                      className="bg-white/5 border-white/10 focus:ring-accent" 
                      placeholder="0.00" 
                    />
                  </div>
                </div>
              </>
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
    </>
  );
}
