'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Package, 
  Truck, 
  LogOut, 
  PlusCircle, 
  Loader2, 
  Camera, 
  X, 
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function BusinessLogoPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const pathname = usePathname();
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
        .select('logo')
        .eq('id', uid)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setCurrentLogo(data.logo);
      }
    } catch (error: any) {
      console.error("Error fetching logo:", error);
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
      // 1. Convertir base64 a Blob
      const response = await fetch(previewImage);
      const blob = await response.blob();
      
      const fileName = `images/logo-${userId}-${Date.now()}.jpg`;
      
      // 2. Subir al storage (Bucket: empresas)
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

      // 3. Actualizar tabla empresas
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

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row text-white overflow-hidden">
      <aside className="hidden lg:flex w-64 bg-black/20 border-r border-white/10 flex-col p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-10">
          <Truck className="h-8 w-8 text-accent" />
          <span className="text-xl font-bold tracking-tight">Solucionex</span>
        </div>
        <nav className="flex-1 space-y-2">
          <Link href="/dashboard/business-portal">
            <Button variant="ghost" className={cn("w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5")}>
              <PlusCircle className="h-5 w-5" /> Nueva Solicitud
            </Button>
          </Link>
          <Link href="/dashboard/business-portal/packages">
            <Button variant="ghost" className={cn("w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5")}>
              <Package className="h-5 w-5" /> Mis Paquetes
            </Button>
          </Link>
          <Link href="/dashboard/business-portal/logo">
            <Button variant="ghost" className={cn("w-full justify-start gap-3 bg-white/10 text-white")}>
              <ImageIcon className="h-5 w-5 text-accent" /> Logo Empresa
            </Button>
          </Link>
        </nav>
        <div className="pt-6 border-t border-white/10">
          <Button variant="ghost" className="w-full justify-start gap-3 text-red-400" onClick={() => { supabase.auth.signOut(); router.push('/'); }}>
            <LogOut className="h-5 w-5" /> Cerrar Sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto pb-24 lg:pb-8">
        <header className="h-16 flex items-center justify-between px-6 bg-slate-900 border-b border-white/10 sticky top-0 z-40">
          <div className="flex items-center gap-2 lg:hidden"><Truck className="h-6 w-6 text-accent" /><span className="font-bold">Solucionex</span></div>
          <div className="hidden lg:block text-xs font-medium text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">Portal Empresa</div>
        </header>

        <div className="p-4 lg:p-8 flex justify-center">
          <div className="w-full max-w-xl space-y-6">
            <h2 className="text-2xl font-bold">Identidad de Empresa</h2>
            
            {loading ? (
              <div className="flex flex-col items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent mb-4" /><p className="text-slate-400">Cargando...</p></div>
            ) : (
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
            )}
          </div>
        </div>
      </main>

      <nav className="fixed bottom-6 left-6 right-6 h-16 bg-slate-800 border border-white/20 rounded-2xl flex lg:hidden items-center justify-around z-50 shadow-2xl overflow-hidden px-2">
        <Link href="/dashboard/business-portal" className={cn("flex flex-col items-center justify-center gap-1 w-full h-full relative", pathname === '/dashboard/business-portal' ? "text-accent" : "text-slate-400")}>
          <PlusCircle className="h-5 w-5" /><span className="text-[10px] font-bold">Solicitud</span>
          {pathname === '/dashboard/business-portal' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full" />}
        </Link>
        <Link href="/dashboard/business-portal/packages" className={cn("flex flex-col items-center justify-center gap-1 w-full h-full relative", pathname === '/dashboard/business-portal/packages' ? "text-accent" : "text-slate-400")}>
          <Package className="h-5 w-5" /><span className="text-[10px] font-bold">Paquetes</span>
          {pathname === '/dashboard/business-portal/packages' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full" />}
        </Link>
        <Link href="/dashboard/business-portal/logo" className={cn("flex flex-col items-center justify-center gap-1 w-full h-full relative", pathname === '/dashboard/business-portal/logo' ? "text-accent" : "text-slate-400")}>
          <ImageIcon className="h-5 w-5" /><span className="text-[10px] font-bold">Logo</span>
          {pathname === '/dashboard/business-portal/logo' && <div className="absolute top-0 w-8 h-1 bg-accent rounded-b-full shadow-[0_0_10px_rgba(0,255,255,0.5)]" />}
        </Link>
      </nav>
    </div>
  );
}