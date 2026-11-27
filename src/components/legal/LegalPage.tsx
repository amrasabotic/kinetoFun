type Section = { title: string; body: string; list?: string[] };

const CARD = "space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl";

export function LegalPage({
  title,
  updated,
  sections,
  contact,
}: {
  title: string;
  updated: string;
  sections: Section[];
  contact?: { title: string; body: string; email: string };
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-12">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-foreground/45">{updated}</p>
      </div>

      {sections.map((section) => (
        <section key={section.title} className={CARD}>
          <h2 className="text-xl font-bold text-foreground">{section.title}</h2>
          <p className="text-foreground/70">{section.body}</p>
          {section.list && (
            <ul className="list-inside list-disc space-y-1 text-foreground/70">
              {section.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {contact && (
        <section className={CARD}>
          <h2 className="text-xl font-bold text-foreground">{contact.title}</h2>
          <p className="text-foreground/70">
            {contact.body}{" "}
            <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
              {contact.email}
            </a>
            .
          </p>
        </section>
      )}
    </div>
  );
}
