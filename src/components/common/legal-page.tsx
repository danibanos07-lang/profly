import type { getLegalDoc } from "@/lib/legal";

export function LegalPage({ title, doc, disclaimer }: { title: string; doc: ReturnType<typeof getLegalDoc>; disclaimer: string }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{doc.updated}</p>
      <p className="mt-6 text-lg text-foreground/90">{doc.intro}</p>
      <div className="mt-10 grid gap-8">
        {doc.sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <ul className="mt-3 grid list-disc gap-2 pl-5 text-muted-foreground marker:text-primary/60">
              {section.body.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-12 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{disclaimer}</p>
    </article>
  );
}
