'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, ArrowRight, Loader2, ShieldCheck, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Modo Prototipo: Permitimos el acceso para navegación
    setTimeout(() => {
      setLoading(false);
      if (email && password) {
        router.push('/dashboard');
      } else {
        toast({
          variant: "destructive",
          title: "Error de acceso",
          description: "Por favor, ingresa tus credenciales.",
        });
      }
    }, 800);
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="bg-white/10 p-4 rounded-2xl shadow-lg mb-4 backdrop-blur-md">
            <Truck className="h-10 w-10 text-accent" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Solucionex <span className="text-accent">Pro</span>
          </h1>
          <p className="text-slate-300 mt-2 font-medium">Logística Inteligente</p>
        </div>

        <Card className="border-white/10 shadow-2xl backdrop-blur-xl bg-white/5">
          <CardHeader>
            <CardTitle className="text-white text-center">Iniciar Sesión</CardTitle>
            <CardDescription className="text-slate-400 text-center">
              Ingresa tus credenciales para acceder al panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Correo Electrónico</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="tu@correo.com" 
                  className="bg-white/5 border-white/10 text-white" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Contraseña</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="bg-white/5 border-white/10 text-white" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full group bg-accent text-primary hover:bg-accent/90 font-bold" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <>Ingresar al Sistema <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 mt-8 opacity-40">
          <div className="flex items-center gap-2 text-xs text-white justify-center">
            <ShieldCheck className="h-4 w-4" />
            <span>Acceso Seguro</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white justify-center">
            <Package className="h-4 w-4" />
            <span>Gestión en tiempo real</span>
          </div>
        </div>
      </div>
    </main>
  );
}
