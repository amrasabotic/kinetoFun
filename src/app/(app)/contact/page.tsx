import { getRequestMessages } from "@/lib/i18n/server";

export default async function ContactPage() {
  const { t } = await getRequestMessages();
  const c = t.legal.contact;
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-12">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-foreground">{c.title}</h1>
        <p className="text-foreground/45">{c.subtitle}</p>
      </div>

      <section className="space-y-6 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
        <div>
          <h2 className="mb-2 text-lg font-bold text-foreground">{c.email}</h2>
          <p className="text-foreground/70">
            {c.general}{" "}
            <a href="mailto:hello@kinetofun.com" className="text-primary hover:underline">
              hello@kinetofun.com
            </a>
          </p>
          <p className="text-foreground/70">
            {c.support}{" "}
            <a href="mailto:support@kinetofun.com" className="text-primary hover:underline">
              support@kinetofun.com
            </a>
          </p>
        </div>

        <div className="h-px bg-white/[0.06]" />

        <div>
          <h2 className="mb-2 text-lg font-bold text-foreground">{c.social}</h2>
          <p className="text-foreground/70">{c.socialBody}</p>
        </div>

        <div className="h-px bg-white/[0.06]" />

        <div>
          <h2 className="mb-2 text-lg font-bold text-foreground">{c.response}</h2>
          <p className="text-foreground/70">{c.responseBody}</p>
        </div>
      </section>
    </div>
  );
}
