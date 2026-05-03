export function SectionHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border bg-white px-6 py-7 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <p className="text-[11px] uppercase tracking-[0.32em] text-cyan-700">{eyebrow}</p> : null}
        <h2 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-slate-950 md:text-[2.5rem]">{title}</h2>
        {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-[15px]">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}
