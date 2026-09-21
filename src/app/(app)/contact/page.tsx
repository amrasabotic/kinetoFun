export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-12">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-foreground">Contact Us</h1>
        <p className="text-foreground/45">We'd love to hear from you. Get in touch with the KinetoFun team.</p>
      </div>

      <section className="space-y-6 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
        <div>
          <h2 className="mb-2 text-lg font-bold text-foreground">Email</h2>
          <p className="text-foreground/70">
            For general inquiries:{" "}
            <a href="mailto:hello@kinetofun.com" className="text-primary hover:underline">
              hello@kinetofun.com
            </a>
          </p>
          <p className="text-foreground/70">
            For support:{" "}
            <a href="mailto:support@kinetofun.com" className="text-primary hover:underline">
              support@kinetofun.com
            </a>
          </p>
        </div>

        <div className="h-px bg-white/[0.06]" />

        <div>
          <h2 className="mb-2 text-lg font-bold text-foreground">Social</h2>
          <p className="text-foreground/70">
            Follow us on social media for updates and announcements.
          </p>
        </div>

        <div className="h-px bg-white/[0.06]" />

        <div>
          <h2 className="mb-2 text-lg font-bold text-foreground">Response Time</h2>
          <p className="text-foreground/70">
            We typically respond to inquiries within 24-48 hours during business days.
          </p>
        </div>
      </section>
    </div>
  );
}
