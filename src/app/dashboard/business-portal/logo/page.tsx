'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Loader2, 
  X, 
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  Building2,
  ShieldCheck,
  Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function BusinessLogoPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingExclusivity, setIsUpdatingExclusivity] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [operadoresExclusivos, setOperadoresExclusivos] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        fetchCompanyData(session.user.id);
      } else {
        router.push('/');
      }
    };
    getSession();
  }, [router]);

  const fetchCompanyData = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('logo, operadores_exclusivos')
        .eq('id', uid)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setCurrentLogo(data.logo);
        setOperadoresExclusivos(data.operadores_exclusivos || false);
      }
    } catch (error: any) {
      console.error("Error fetching company data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLogo = async () => {
    if (!previewImage || !userId) return;

    setIsSaving(true);
    try {
      const response = await fetch(previewImage);
      const blob = await response.blob();
      
      const fileName = `images/logo-${userId}-${Date.now()}.jpg`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('empresas')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('empresas')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('empresas')
        .update({ logo: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setCurrentLogo(publicUrl);
      setPreviewImage(null);
      toast({
        title: "Logo actualizado",
        description: "El logo de tu empresa se ha guardado correctamente.",
      });

    } catch (error: any) {
      console.error("Error saving logo:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo actualizar el logo."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleExclusivity = async (checked: boolean) => {
    if (!userId) return;
    setIsUpdatingExclusivity(true);
    try {
      const { error } = await supabase
        .from('empresas')
        .update({ operadores_exclusivos: checked })
        .eq('id', userId);

      if (error) throw error;

      setOperadoresExclusivos(checked);
      toast({
        title: checked ? "Activada" : "Desactivada",
        description: checked 
          ? "Operación Exclusiva" 
          : "NATIVO ACTIVO",
      });
    } catch (error: any) {
      console.error("Error updating exclusivity:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la configuración operativa."
      });
    } finally {
      setIsUpdatingExclusivity(false);
    }
  };

  return (
    <>
      <div className="p-4 lg:p-8 flex justify-center">
        <div className="w-full max-w-xl space-y-6">
          <h2 className="text-2xl font-bold">Configuración Empresa</h2>
          
          {loading ? (
            <div className="flex flex-col items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-accent mb-4" />
              <p className="text-slate-400">Cargando...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="bg-white/5 border-white/10 shadow-2xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-accent" /> Logo de la Empresa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative w-48 h-48 rounded-2xl border-2 border-dashed border-white/20 bg-black/20 overflow-hidden flex items-center justify-center group">
                      {previewImage ? (
                        <img src={previewImage} alt="Preview" className="w-full h-full object-contain" />
                      ) : currentLogo ? (
                        <img src={currentLogo} alt="Logo actual" className="w-full h-full object-contain" />
                      ) : (
                        <div className="flex flex-col items-center text-slate-500">
                          <ImageIcon className="h-12 w-12 mb-2" />
                          <p className="text-xs">Sin logo</p>
                        </div>
                      )}
                      
                      {previewImage && (
                        <button 
                          onClick={() => setPreviewImage(null)}
                          className="absolute top-2 right-2 bg-red-500 p-1 rounded-full text-white hover:bg-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col w-full gap-3">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                      />
                      
                      {!previewImage ? (
                        <Button 
                          variant="outline" 
                          className="w-full border-white/10 text-white hover:bg-white/5 h-12"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="mr-2 h-5 w-5 text-accent" /> Seleccionar Imagen
                        </Button>
                      ) : (
                        <Button 
                          className="w-full bg-accent text-primary font-bold h-12 hover:bg-accent/90"
                          onClick={handleSaveLogo}
                          disabled={isSaving}
                        >
                          {isSaving ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                          Confirmar y Guardar
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                    <p className="text-xs text-blue-300 leading-relaxed italic">
                      * El logo será visible en tus tickets. Debe ser color negro.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* MÓDULO: EXCLUSIVIDAD */}
              <Card className="bg-white/5 border-white/10 shadow-2xl backdrop-blur-sm overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-accent" /> Configuración Operativa
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex items-center space-x-3 bg-accent/5 p-4 rounded-xl border border-accent/20">
                    <Checkbox 
                      id="operadores_exclusivos_empresa" 
                      checked={operadoresExclusivos}
                      onCheckedChange={(checked) => handleToggleExclusivity(!!checked)}
                      disabled={isUpdatingExclusivity}
                      className="h-5 w-5 border-accent data-[state=checked]:bg-accent data-[state=checked]:text-primary"
                    />
                    <div className="flex-1 grid gap-1.5 leading-none">
                      <Label 
                        htmlFor="operadores_exclusivos_empresa" 
                        className="text-sm font-bold text-accent flex items-center gap-2 cursor-pointer"
                      >
                        {isUpdatingExclusivity ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        Activar operadores exclusivos de mi empresa
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
