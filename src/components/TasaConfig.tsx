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

interface ConfigItem {
  id: number;
  tasa_transaccional: number;
}

export default function TasaConfig() {
  const [config, setConfig] = useState<ConfigItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [tasaValue, setTasaValue] = useState<string>('0.20');
  const { toast } = useToast();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('config')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (error) {
        // En caso de que la tabla esté vacía por alguna razón, insertamos el valor por defecto
        if (error.code === 'PGRST116') {
          const { data: insertedData, error: insertError } = await supabase
            .from('config')
            .insert([{ id: 1, tasa_transaccional: 0.20 }])
            .select()
            .single();
          if (insertError) throw insertError;
          setConfig(insertedData);
          setTasaValue(String(insertedData.tasa_transaccional));
        } else {
          throw error;
        }
      } else {
        setConfig(data);
        setTasaValue(String(data.tasa_transaccional));
      }
    } catch (error: any) {
      console.error("Error loading config:", error);
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = () => {
    if (config) {
      setTasaValue(String(config.tasa_transaccional));
      setIsOpen(true);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const parsedTasa = parseFloat(tasaValue);
      if (isNaN(parsedTasa)) {
        throw new Error("La tasa transaccional debe ser un número válido.");
      }

      const { error } = await supabase
        .from('config')
        .update({ tasa_transaccional: parsedTasa })
        .eq('id', 1);

      if (error) throw error;

      toast({ title: "Éxito", description: "Tasa transaccional actualizada correctamente." });
      setIsOpen(false);
      fetchConfig();
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
            <TableHead className="text-slate-300">Tasa Transaccional</TableHead>
            <TableHead className="text-right text-slate-300">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {config && (
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableCell className="font-mono text-slate-300">{Number(config.tasa_transaccional).toFixed(2)}</TableCell>
              <TableCell className="text-right">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="hover:bg-blue-500/20 text-blue-400" 
                  onClick={handleOpenEdit}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              Editar Tasa Transaccional
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tasa_transaccional">Tasa Transaccional</Label>
              <Input 
                id="tasa_transaccional" 
                type="number" 
                step="0.01"
                value={tasaValue} 
                onChange={(e) => setTasaValue(e.target.value)} 
                className="bg-white/5 border-white/10 focus:ring-accent" 
                placeholder="0.20" 
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
