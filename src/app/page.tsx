
'use client';

import { useState } from 'react';
import { Package, Truck, ShieldCheck, ArrowRight, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="bg-primary p-4 rounded-2xl shadow-lg mb-4">
            <Truck className="h-10 w-10 text-accent" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary">
            FastDelivery <span className="text-accent">Pro</span>
          </h1>
          <p className="text-muted-foreground mt-2">Gestión inteligente de logística y entregas</p>
        </div>

        <Card className="border-border/50 shadow-xl backdrop-blur-sm bg-card/95">
          <CardHeader>
            <Tabs defaultValue="login" className="w-full" onValueChange={(v) => setIsLogin(v === 'login')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Ingresar</TabsTrigger>
                <TabsTrigger value="register">Registro</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); window.location.href = '/dashboard'; }}>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" type="email" placeholder="admin@delivery.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" placeholder="••••••••" required />
              </div>
              
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="company">Nombre de la Empresa</Label>
                  <Input id="company" type="text" placeholder="Mi Logística S.A." />
                </div>
              )}

              <Button type="submit" className="w-full group">
                {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
            <ShieldCheck className="h-4 w-4" />
            <span>Encriptación Bancaria</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
            <Package className="h-4 w-4" />
            <span>Rastreo en Tiempo Real</span>
          </div>
        </div>
      </div>
    </main>
  );
}
