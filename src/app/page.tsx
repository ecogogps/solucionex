export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <div className="relative animate-in fade-in zoom-in duration-1000">
        <h1 className="text-6xl md:text-8xl lg:text-9xl font-extrabold tracking-tighter text-primary font-headline text-center">
          Hola Mundo
        </h1>
        <div className="mt-8 flex justify-center">
          <div className="h-1.5 w-24 rounded-full bg-accent opacity-80" />
        </div>
      </div>
    </main>
  );
}