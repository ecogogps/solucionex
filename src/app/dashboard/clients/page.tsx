'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
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
  UserCheck
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
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface ClientData {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  created_at: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '' });
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setClients([
        { id: '1', name: 'Juan Pérez', email: 'juan@demo.com', phone: '555-0199', company: 'Logística SA', created_at: new Date().toISOString() },
        { id: '2', name: 'María García', email: 'mgarcia@tienda.com', phone: '555-0122', company: 'Moda Express', created_at: new Date().toISOString() }
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error("Error cargando clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      toast({ variant: "destructive", title: "Campos incompletos", description: "El nombre y el correo son obligatorios." });
      return;
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      if (editingClient) {
        setClients(clients.map(c => c.id === editingClient.id ? { ...c, ...formData } : c));
      } else {
        const newClient = { 
          id: Math.random().toString(), 
          ...formData, 
          created_at: new Date().toISOString() 
        };
        setClients([newClient, ...clients]);
      }
      setIsDialogOpen(false);
      toast({ title: "Operación exitosa", description: "Cliente guardado localmente (Modo Demo)." });
      return;
    }

    try {
      if (editingClient) {
        const { error } = await supabase.from('clients').update(formData).eq('id', editingClient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('clients').insert([formData]);
        if (error) throw error;
      }
      setIsDialogOpen(false);
      fetchClients();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: error.message });
    }
  };

  const deleteClient = async (id: string) => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setClients(clients.filter(c => c.id !== id));
      return;
    }

    try {
      await supabase.from('clients').delete().eq('id', id);
      fetchClients();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al eliminar", description: error.message });
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
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5 mb-2">
              <Package className="h-5 w-5" /> Envíos
            </Button>
          </Link>
          <Link href="/dashboard/clients">
            <Button variant="ghost" className="w-full justify-start gap-3 bg-white/10 text-white hover:bg-white/20">
              <Users className="h-5 w-5 text-accent" /> Clientes
            </Button>
          </Link>
          <Button variant="ghost" className="w-full justify-start gap-3 text-slate-500 hover:text-white hover:bg-white/5 opacity-50 cursor-not-allowed" disabled>
            <UserCheck className="h-5 w-5" /> Operadores
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
          <h2 className="text-xl font-bold text-white">Gestión de Clientes</h2>
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                placeholder="Buscar cliente..." 
                className="w-full bg-white/5 border border-white/10 rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-accent text-white placeholder:text-slate-500" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent text-primary hover:bg-accent/90 font-bold" onClick={() => { setEditingClient(null); setFormData({ name: '', email: '', phone: '', company: '' }); }}>
                  <Plus className="h-4 w-4 mr-2" /> Nuevo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">{editingClient ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" placeholder="Juan Pérez" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" placeholder="juan@correo.com" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" placeholder="555-0101" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="company">Empresa / Referencia</Label>
                    <Input id="company" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" placeholder="Nombre de la empresa" />
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
          ) : clients.length === 0 ? (
            <div className="bg-white/5 rounded-xl border border-white/10 p-12 text-center flex flex-col items-center">
              <Users className="h-12 w-12 text-slate-500 mb-4" />
              <h3 className="text-lg font-semibold text-white">Sin clientes registrados</h3>
              <p className="text-slate-400">Comienza registrando tu primer cliente.</p>
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl shadow-2xl border border-white/10 overflow-hidden backdrop-blur-sm">
              <Table>
                <TableHeader className="bg-white/10">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="font-bold text-slate-300">Nombre</TableHead>
                    <TableHead className="font-bold text-slate-300">Contacto</TableHead>
                    <TableHead className="font-bold text-slate-300">Empresa</TableHead>
                    <TableHead className="font-bold text-slate-300">Fecha Registro</TableHead>
                    <TableHead className="text-right font-bold text-slate-300">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients
                    .filter(c => 
                      c.name.toLowerCase().includes(search.toLowerCase()) || 
                      c.email.toLowerCase().includes(search.toLowerCase()) ||
                      (c.company && c.company.toLowerCase().includes(search.toLowerCase()))
                    )
                    .map((client) => (
                    <TableRow key={client.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">{client.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs text-slate-400 gap-1">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-accent" /> {client.email}</span>
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-accent" /> {client.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">{client.company || '-'}</TableCell>
                      <TableCell className="text-slate-400 text-xs">
                        {new Date(client.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-white/10"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-800 border-white/10 text-white">
                            <DropdownMenuItem className="gap-2 cursor-pointer hover:bg-white/10" onClick={() => {
                              setEditingClient(client);
                              setFormData({ name: client.name, email: client.email, phone: client.phone, company: client.company || '' });
                              setIsDialogOpen(true);
                            }}>
                              <Edit2 className="h-4 w-4 text-blue-400" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem 
                              className="gap-2 text-red-400 cursor-pointer hover:bg-red-400/10"
                              onClick={() => deleteClient(client.id)}
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
