'use client';

import { useState, useEffect } from 'react';
import { Edit2, Loader2 } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface MultiplicadorConfigItem {
  multiplicador: number;
  bonus_operador: number;
}

export default function MultiplicadorConfig() {
  const [configs, setConfigs] = useState<MultiplicadorConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MultiplicadorConfigItem | null>(null);
  const [bonusOperador, setBonusOperador] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('multiplicador_config')
        .select('*')
        .order('multiplicador', { ascending: true });
      
      if (error) throw error;
      setConfigs(data || []);
    } catch (error: any) {
      console.error("Error loading multiplicadores:", error);
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (item: MultiplicadorConfigItem) => {
    setEditingItem(item);
    setBonusOperador(String(item.bonus_operador));
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!editingItem) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('multiplicador_config')
        .update({ bonus_operador: parseFloat(bonusOperador) || 0 })
        .eq('multiplicador', editingItem.multiplicador);

      if (error) throw error;

      toast({ title: "Éxito", description: "Configuración actualizada correctamente." });
      setIsOpen(false);
      fetchConfigs();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden backdrop-blur-sm">
      <Table>
        <TableHeader className="bg-white/10">
          <TableRow className="border-white/10">
            <TableHead className="text-slate-300">Multiplicador</TableHead>
            <TableHead className="text-slate-300">Bonus Operador</TableHead>
            <TableHead className="text-right text-slate-300">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {configs.map((c) => (
            <TableRow key={c.multiplicador} className="border-white/10 hover:bg-white/5">
              <TableCell className="font-semibold text-white">x{c.multiplicador}</TableCell>
              <TableCell className="font-mono text-slate-300">${Number(c.bonus_operador).toFixed(2)}</TableCell>
              <TableCell className="text-right">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="hover:bg-blue-500/20 text-blue-400" 
                  onClick={() => handleOpenEdit(c)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              Editar Multiplicador x{editingItem?.multiplicador}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="bonus_operador">Bonus Operador</Label>
              <Input 
                id="bonus_operador" 
                type="number" 
                step="0.01"
                value={bonusOperador} 
                onChange={(e) => setBonusOperador(e.target.value)} 
                className="bg-white/5 border-white/10 focus:ring-accent" 
                placeholder="0.00" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsOpen(false)} className="text-slate-400">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-accent text-primary font-bold" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
