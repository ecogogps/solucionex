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
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface CompanyData {
  id: string;
  name: string;
  email: string;
  phone: string;
  legal_id?: string;
  created_at: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyData | null>(null);
  
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', legal_id: '' });
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setCompanies([
        { id: '1', name: 'Logística SA', email: 'contacto@logistica.com', phone: '555-0199', legal_id: '20123456789', created_at: new Date().toISOString() },
        { id: '2', name: 'Moda Express', email: 'ventas@moda.com', phone: '555-0122', legal_id: '20876543210', created_at: new Date().toISOString() }
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error("Error cargando empresas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      toast({ variant: "destructive", title: "Campos incompletos", description: "El nombre y el correo son obligatorios." });
      return;
    }

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        if (editingCompany) {
          setCompanies(companies.map(c => c.id === editingCompany.id ? { ...c, ...formData } : c));
        } else {
          const newCompany = { 
            id: Math.random().toString(), 
            ...formData, 
            created_at: new Date().toISOString() 
          };
          setCompanies([newCompany, ...companies]);
        }
        toast({ title: "Guardado", description: "Empresa actualizada localmente." });
      } else {
        if (editingCompany) {
          const { error } = await supabase.from('companies').update(formData).eq('id', editingCompany.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('companies').insert([formData]);
          if (error) throw error;
        }
        fetchCompanies();
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: error.message });
    }
  };

  const deleteCompany = async (id: string) => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setCompanies(companies.filter(c => c.id !== id));
      toast({ title: "Eliminado", description: "Empresa removida exitosamente." });
      return;
    }

    try {
      await supabase.from('companies').delete().eq('id', id);
      fetchCompanies();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al eliminar", description: error.message });
    }
  };

  const openNewCompanyModal = () => {
    setEditingCompany(null);
    setFormData({ name: '', email: '', phone: '', legal_id: '' });
    setIsDialogOpen(true);
  };

  const openEditCompanyModal = (company: CompanyData) => {
    setEditingCompany(company);
    setFormData({ name: company.name, email: company.email, phone: company.phone, legal_id: company.legal_id || '' });
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
            <Button variant="ghost" className="w-full justify-start gap-3 bg-white/10 text-white hover:bg-white/20">
              <Building2 className="h-5 w-5 text-accent" /> Empresas
            </Button>
          </Link>
          <Link href="/dashboard/operators">
            <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5">
              <UserCheck className="h-5 w-5" /> Operadores
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
            
            <Button onClick={openNewCompanyModal} className="bg-accent text-primary hover:bg-accent/90 font-bold">
              <Plus className="h-4 w-4 mr-2" /> Nueva Empresa
            </Button>
          </div>
        </header>

        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Cargando información...</p>
            </div>
          ) : companies.length === 0 ? (
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
                    <TableHead className="font-bold text-slate-300">Nombre de Empresa</TableHead>
                    <TableHead className="font-bold text-slate-300">Contacto</TableHead>
                    <TableHead className="font-bold text-slate-300">RUC</TableHead>
                    <TableHead className="font-bold text-slate-300">Registro</TableHead>
                    <TableHead className="text-right font-bold text-slate-300">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies
                    .filter(c => 
                      c.name.toLowerCase().includes(search.toLowerCase()) || 
                      c.email.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((company) => (
                    <TableRow key={company.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">{company.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs text-slate-400 gap-1">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-accent" /> {company.email}</span>
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-accent" /> {company.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">{company.legal_id || '-'}</TableCell>
                      <TableCell className="text-slate-400 text-xs">
                        {new Date(company.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-white/10"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-800 border-white/10 text-white">
                            <DropdownMenuItem 
                              className="gap-2 cursor-pointer" 
                              onClick={() => openEditCompanyModal(company)}
                            >
                              <Edit2 className="h-4 w-4 text-blue-400" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem 
                              className="gap-2 text-red-400 cursor-pointer"
                              onClick={() => deleteCompany(company.id)}
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
                {editingCompany ? 'Editar Empresa' : 'Registrar Nueva Empresa'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre de la Empresa</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" placeholder="Logística SA" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Correo Corporativo</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" placeholder="admin@empresa.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Teléfono Central</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" placeholder="555-0101" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="legal_id">RUC</Label>
                <Input id="legal_id" value={formData.legal_id} onChange={(e) => setFormData({...formData, legal_id: e.target.value})} className="bg-white/5 border-white/10 focus:ring-accent" placeholder="Ej: 20123456789" />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-slate-400 hover:text-white">Cancelar</Button>
              <Button onClick={handleSave} className="bg-accent text-primary hover:bg-accent/90 font-bold">Guardar Empresa</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
