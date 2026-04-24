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
  ClipboardList,
  UserCheck,
  BadgeCheck
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface OperatorData {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicle: string;
  status: 'Activo' | 'Inactivo';
  created_at: string;
}

export default function OperatorsPage() {
  const [operators, setOperators] = useState<OperatorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<OperatorData | null>(null);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    vehicle: '', 
    status: 'Activo' as const 
  });
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setOperators([
        { id: '1', name: 'Carlos Rodríguez', email: 'carlos@solucionex.com', phone: '555-0300', vehicle: 'Van Blanca (ABC-123)', status: 'Activo', created_at: new Date().toISOString() },
        { id: '2', name: 'Ana Martínez', email: 'ana.m@solucionex.com', phone: '555-0450', vehicle: 'Moto Express (XYZ-987)', status: 'Activo', created_at: new Date().toISOString() }
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('operators')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOperators(data || []);
    } catch (error: any) {
      console.error("Error cargando operadores:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email || !formData.vehicle) {
      toast({ variant: "destructive", title: "Campos incompletos", description: "Nombre, correo y vehículo son obligatorios." });
      return;
    }

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        if (editingOperator) {
          setOperators(operators.map(o => o.id === editingOperator.id ? { ...o, ...formData } : o));
        } else {
          const newOp = { 
            id: Math.random().toString(), 
            ...formData, 
            created_at: new Date().toISOString() 
          };
          setOperators([newOp, ...operators]);
        }
        toast({ title: "Éxito", description: "Operador actualizado localmente." });
      } else {
        if (editingOperator) {
          const { error } = await supabase.from('operators').update(formData).eq('id', editingOperator.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('operators').insert([formData]);
          if (error) throw error;
        }
        fetchOperators();
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: error.message });
    }
  };

  const deleteOperator = async (id: string) => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setOperators(operators.filter(o => o.id !== id));
      toast({ title: "Eliminado", description: "Operador removido." });
      return;
    }

    try {
      await supabase.from('operators').delete().eq('id', id);
      fetchOperators();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al eliminar", description: error.message });
    }
  };

  const openNewOperatorModal = () => {
    setEditingOperator(null);
    setFormData({ name: '', email: '', phone: '', vehicle: '', status: 'Activo' });
    setIsDialogOpen(true);
  };

  const openEditOperatorModal = (op: OperatorData) => {
    setEditingOperator(op);
    setFormData({ name: op.name, email: op.email, phone: op.phone, vehicle: op.vehicle, status: op.status });
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
              <ClipboardList className="h-5 w-5" /> Pedidos
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
        </nav>
        <div className="pt-6 border-t border-white/10">
          <Button variant="ghost" className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => router.push('/')}>
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
            
            <Button onClick={openNewOperatorModal} className="bg-accent text-primary hover:bg-accent/90 font-bold">
              <Plus className="h-4 w-4 mr-2" /> Nuevo Operador
            </Button>
          </div>
        </header>

        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Cargando operadores...</p>
            </div>
          ) : operators.length === 0 ? (
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
                    <TableHead className="font-bold text-slate-300">Contacto</TableHead>
                    <TableHead className="font-bold text-slate-300">Vehículo</TableHead>
                    <TableHead className="font-bold text-slate-300">Estado</TableHead>
                    <TableHead className="text-right font-bold text-slate-300">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operators
                    .filter(o => 
                      o.name.toLowerCase().includes(search.toLowerCase()) || 
                      o.email.toLowerCase().includes(search.toLowerCase()) ||
                      o.vehicle.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((op) => (
                    <TableRow key={op.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                            <BadgeCheck className="w-4 h-4 text-accent" />
                          </div>
                          {op.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs text-slate-400 gap-1">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-accent" /> {op.email}</span>
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-accent" /> {op.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-slate-500" />
                          {op.vehicle}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                          {op.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-white/10"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-800 border-white/10 text-white">
                            <DropdownMenuItem 
                              className="gap-2 cursor-pointer" 
                              onClick={() => openEditOperatorModal(op)}
                            >
                              <Edit2 className="h-4 w-4 text-blue-400" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem 
                              className="gap-2 text-red-400 cursor-pointer"
                              onClick={() => deleteOperator(op.id)}
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
                {editingOperator ? 'Editar Operador' : 'Registrar Nuevo Operador'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" placeholder="Carlos Rodríguez" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Correo Corporativo</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" placeholder="carlos@solucionex.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Teléfono de Contacto</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" placeholder="555-0102" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vehicle">Vehículo Asignado / Placa</Label>
                <Input id="vehicle" value={formData.vehicle} onChange={(e) => setFormData({...formData, vehicle: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" placeholder="Ej: Van Blanca ABC-123" />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-slate-400 hover:text-white">Cancelar</Button>
              <Button onClick={handleSave} className="bg-accent text-primary hover:bg-accent/90 font-bold">Guardar Operador</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
