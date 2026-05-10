import Link from "next/link";

export function ComingSoon({
  title,
  description,
  icon = "construction",
}: {
  title: string;
  description: string;
  icon?: string;
}) {
  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/operations"
          className="inline-flex items-center gap-1 text-secondary hover:text-on-surface text-sm font-semibold mb-4"
        >
          <span className="material-symbols-outlined text-[18px]">
            arrow_back
          </span>
          Operations
        </Link>
        <h2 className="text-3xl font-black font-headline tracking-tight text-on-surface">
          {title}
        </h2>
        <p className="text-secondary mt-1">{description}</p>
      </div>
      <div className="bg-surface-container-lowest rounded-2xl p-12 text-center border border-outline-variant/30">
        <span className="material-symbols-outlined text-5xl text-stone-300 mb-3 block">
          {icon}
        </span>
        <p className="font-headline font-bold text-on-surface text-lg">
          Coming soon
        </p>
        <p className="text-secondary text-sm mt-2 max-w-md mx-auto">
          This module is on the roadmap. In the meantime use the existing
          modules from the Operations hub.
        </p>
      </div>
    </div>
  );
}
