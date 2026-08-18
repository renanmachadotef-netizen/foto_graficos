export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground">Visão geral e Ponto de Equilíbrio (Em construção).</p>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Placeholder cards */}
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Custos Fixos Atuais</h3>
          </div>
          <div className="text-2xl font-bold">R$ 0,00</div>
        </div>
      </div>
    </div>
  );
}
