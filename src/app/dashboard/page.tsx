
'use client';

import { useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  LogOut, 
  Truck, 
  Clock, 
  CheckCircle2, 
  Trash2,
  Edit2
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

// Mock data for initial prototype
const INITIAL_PACKAGES = [
  { id: '1', tracking: 'TRK-9902', client: 'Juan Pérez', status: 'En Ruta', destiny: 'Madrid, ES', date: '2024-03-20' },
  { id: '2', tracking: 'TRK-1123', client: 'María García', status: 'Entregado', destiny: 'Barcelona, ES', date: '2024-03-19' },
  { id: '3', tracking: 'TRK-4456', client: 'Logística Sur', status: 'Pendiente', destiny: 'Sevilla, ES', date: '2024-03-21' },
];

export default function Dashboard() {
  const [packages, setPackages] = useState(INITIAL_PACKAGES);
  const [search, setSearch] = useState('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Entregado': return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1"/> Entregado</Badge>;
      case 'En Ruta': return <Badge className="bg-blue-500 hover:bg-blue-600"><Truck className="w-3 h-3 mr-1"/> En Ruta</Badge>;
      default: return <Badge variant="outline" className="text-orange-500 border-orange-500"><Clock className="w-3 h-3 mr-1"/> Pendiente</Badge>;
    }
  };

  const deletePackage = (id: string) => {
    setPackages(packages.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="w-64 bg-primary text-primary-foreground hidden lg:flex flex-col p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-10">
          <Truck className="h-8 w-8 text-accent" />
          <span className="text-xl font-bold tracking-tight">FastDelivery</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-3 bg-white/10 text-white">
            <Package className="h-5 w-5" /> Envíos
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-white/70 hover:text-white">
            <Clock className="h-5 w-5" /> Historial
          </Button>
        </nav>

        <div className="pt-6 border-t border-white/10">
          <Button variant="ghost" className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => window.location.href = '/'}>
            <LogOut className="h-5 w-5" /> Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8">
          <h2 className="text-xl font-bold text-primary">Gestión de Paquetes</h2>
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por tracking o cliente..." 
                className="pl-10" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-accent text-primary hover:bg-accent/90 font-semibold">
                  <Plus className="h-4 w-4 mr-2" /> Nuevo Envío
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Nuevo Paquete</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="client">Nombre del Cliente</Label>
                    <Input id="client" placeholder="Juan Pérez" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="destiny">Dirección de Destino</Label>
                    <Input id="destiny" placeholder="Av. Principal 123, Madrid" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Estado Inicial</Label>
                    <Select defaultValue="Pendiente">
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendiente">Pendiente</SelectItem>
                        <SelectItem value="En Ruta">En Ruta</SelectItem>
                        <SelectItem value="Entregado">Entregado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Guardar Paquete</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="p-8">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold">Tracking ID</TableHead>
                  <TableHead className="font-bold">Cliente</TableHead>
                  <TableHead className="font-bold">Destino</TableHead>
                  <TableHead className="font-bold">Estado</TableHead>
                  <TableHead className="font-bold">Fecha</TableHead>
                  <TableHead className="text-right font-bold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages
                  .filter(p => p.client.toLowerCase().includes(search.toLowerCase()) || p.tracking.toLowerCase().includes(search.toLowerCase()))
                  .map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium text-primary">{pkg.tracking}</TableCell>
                    <TableCell>{pkg.client}</TableCell>
                    <TableCell>{pkg.destiny}</TableCell>
                    <TableCell>{getStatusBadge(pkg.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{pkg.date}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2 cursor-pointer">
                            <Edit2 className="h-4 w-4 text-blue-500" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="gap-2 text-red-600 cursor-pointer"
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
        </div>
      </main>
    </div>
  );
}
