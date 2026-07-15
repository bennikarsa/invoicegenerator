type PageHeaderProps = {
  title: string;
  description: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="mb-5 rounded-md border border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur sm:mb-6 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none sm:backdrop-blur-none">
      <h2 className="text-xl font-bold text-ink sm:text-2xl">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
    </header>
  );
}
