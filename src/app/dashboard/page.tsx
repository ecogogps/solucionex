'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  Plus, 
  Search, 
  MoreVertical, 
  LogOut, 
  Truck, 
  Clock, 
  CheckCircle2, 
  Trash2,
  Edit2,
  Loader2,
  AlertCircle,
  Users,
  BarChart3,
  Contact2
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
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface PackageData {
  id: string;
  tracking: string;
  client: string;
  status: string;
  destiny: string;
  created_at: string;
}

export default function Dashboard() {
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageData | null>(null);
  
  const [formData, setFormData] = useState({ client: '', destiny: '', status: 'Pendiente' });
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setPackages([
        { id: '1', tracking: 'TRK-9901', client: 'Empresa Demo A', destiny: 'Calle Falsa 123', status: 'En Ruta', created_at: new Date().toISOString() },
        { id: '2', tracking: 'TRK-4422', client: 'Tienda Ejemplo', destiny: 'Av. Libertador 456', status: 'Pendiente', created_at: new Date().toISOString() }
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPackages(data || []);
    } catch (error: any) {
      console.error("Error cargando paquetes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.client || !formData.destiny) {
      toast({ variant: "destructive", title: "Campos incompletos", description: "Por favor llena todos los campos." });
      return;
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      if (editingPackage) {
        setPackages(packages.map(p => p.id === editingPackage.id ? { ...p, ...formData } : p));
      } else {
        const newPkg = { 
          id: Math.random().toString(), 
          tracking: `TRK-${Math.floor(1000 + Math.random() * 9000)}`, 
          ...formData, 
          created_at: new Date().toISOString() 
        };
        setPackages([newPkg, ...packages]);
      }
      setIsDialogOpen(false);
      toast({ title: "Operación exitosa", description: "Cambios guardados localmente (Modo Demo)." });
      return;
    }

    try {
      if (editingPackage) {
        const { error } = await supabase.from('packages').update(formData).eq('id', editingPackage.id);
        if (error) throw error;
      } else {
        const tracking = `TRK-${Math.floor(1000 + Math.random() * 9000)}`;
        const { error } = await supabase.from('packages').insert([{ ...formData, tracking }]);
        if (error) throw error;
      }
      setIsDialogOpen(false);
      fetchPackages();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: error.message });
    }
  };

  const deletePackage = async (id: string) => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setPackages(packages.filter(p => p.id !== id));
      return;
    }

    try {
      await supabase.from('packages').delete().eq('id', id);
      fetchPackages();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al eliminar", description: error.message });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Entregado': return <Badge className="bg-green-500/20 text-green-400 border-green-500/50"><CheckCircle2 className="w-3 h-3 mr-1"/> Entregado</Badge>;
      case 'En Ruta': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50"><Truck className="w-3 h-3 mr-1"/> En Ruta</Badge>;
      default: return <Badge variant="outline" className="text-orange-400 border-orange-400/50 bg-orange-400/10"><Clock className="w-3 h-3 mr-1"/> Pendiente</Badge>;
    }
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
              <Package className="h-5 w-5 text-accent" /> Envíos
            </Button>
          </Link>
          <Link href="/dashboard/clients">
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5">
              <Users className="h-5 w-5" /> Clientes
            </Button>
          </Link>
          <Button variant="ghost" className="w-full justify-start gap-3 text-slate-500 hover:text-white hover:bg-white/5 opacity-50 cursor-not-allowed" disabled>
            <Contact2 className="h-5 w-5" /> Flota
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-slate-500 hover:text-white hover:bg-white/5 opacity-50 cursor-not-allowed" disabled>
            <BarChart3 className="h-5 w-5" /> Reportes
          </Button>
        </nav>
        <div className="pt-6 border-t border-white/10">
          <Button variant="ghost" className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => router.push('/')}>
            <LogOut className="h-5 w-5" /> Cerrar Sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white/5 border-b border-white/10 flex items-center justify-between px-8">
          <h2 className="text-xl font-bold text-white">Gestión de Paquetes</h2>
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                placeholder="Buscar envío..." 
                className="w-full bg-white/5 border border-white/10 rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent text-white placeholder:text-slate-500" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent text-primary hover:bg-accent/90 font-bold" onClick={() => { setEditingPackage(null); setFormData({ client: '', destiny: '', status: 'Pendiente' }); }}>
                  <Plus className="h-4 w-4 mr-2" /> Nuevo Envío
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">{editingPackage ? 'Editar Envío' : 'Registrar Nuevo Paquete'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="client">Nombre del Cliente</Label>
                    <Input id="client" value={formData.client} onChange={(e) => setFormData({...formData, client: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" placeholder="Ej: Juan Pérez" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="destiny">Dirección de Destino</Label>
                    <Input id="destiny" value={formData.destiny} onChange={(e) => setFormData({...formData, destiny: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" placeholder="Av. Principal 123" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Estado</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-white/10 text-white">
                        <SelectItem value="Pendiente">Pendiente</SelectItem>
                        <SelectItem value="En Ruta">En Ruta</SelectItem>
                        <SelectItem value="Entregado">Entregado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSave} className="bg-accent text-primary hover:bg-accent/90 font-bold">Guardar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Cargando información...</p>
            </div>
          ) : packages.length === 0 ? (
            <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center flex flex-col items-center">
              <AlertCircle className="h-12 w-12 text-slate-500 mb-4" />
              <h3 className="text-lg font-semibold text-white">Sin paquetes</h3>
              <p className="text-slate-400">Comienza registrando tu primer envío.</p>
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl shadow-2xl border border-white/10 overflow-hidden backdrop-blur-sm">
              <Table>
                <TableHeader className="bg-white/10">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="font-bold text-slate-300">Tracking ID</TableHead>
                    <TableHead className="font-bold text-slate-300">Cliente</TableHead>
                    <TableHead className="font-bold text-slate-300">Destino</TableHead>
                    <TableHead className="font-bold text-slate-300">Estado</TableHead>
                    <TableHead className="text-right font-bold text-slate-300">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages
                    .filter(p => 
                      p.client.toLowerCase().includes(search.toLowerCase()) || 
                      p.tracking.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((pkg) => (
                    <TableRow key={pkg.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-mono font-medium text-accent">{pkg.tracking}</TableCell>
                      <TableCell className="text-white">{pkg.client}</TableCell>
                      <TableCell className="text-slate-300">{pkg.destiny}</TableCell>
                      <TableCell>{getStatusBadge(pkg.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-white/10"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-800 border-white/10 text-white">
                            <DropdownMenuItem className="gap-2 cursor-pointer hover:bg-white/10" onClick={() => {
                              setEditingPackage(pkg);
                              setFormData({ client: pkg.client, destiny: pkg.destiny, status: pkg.status });
                              setIsDialogOpen(true);
                            }}>
                              <Edit2 className="h-4 w-4 text-blue-400" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem 
                              className="gap-2 text-red-400 cursor-pointer hover:bg-red-400/10"
                              onClick={() => deletePackage(pkg.id)}
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
      </main>
    </div>
  );
}
