export function PanelLoading({ section }: { section: string }) {
  return (
    <section
      aria-busy="true"
      aria-label={`Carregando ${section}`}
      className="mx-auto max-w-5xl"
    >
      <p aria-live="polite" className="text-sm font-medium text-zinc-600">
        Carregando {section}...
      </p>
      <div className="mt-5 h-28 animate-pulse rounded-xl bg-zinc-200" />
      <div className="mt-4 h-40 animate-pulse rounded-xl bg-zinc-100" />
    </section>
  );
}
