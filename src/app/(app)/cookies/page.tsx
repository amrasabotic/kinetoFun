export default function CookiesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-12">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-foreground">Cookie Policy</h1>
        <p className="text-sm text-foreground/45">Last updated: June 2026</p>
      </div>

      <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-foreground">What Are Cookies?</h2>
        <p className="text-foreground/70">
          Cookies are small pieces of data stored on your device that help us remember your preferences and login information.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-foreground">How We Use Cookies</h2>
        <p className="text-foreground/70">
          We use cookies to:
        </p>
        <ul className="list-inside list-disc space-y-1 text-foreground/70">
          <li>Keep you logged in to your account</li>
          <li>Remember your display preferences</li>
          <li>Analyze how you use KinetoFun to improve our service</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-foreground">Session Cookies</h2>
        <p className="text-foreground/70">
          KinetoFun uses secure, httpOnly session cookies to maintain your login session. These cookies are deleted when you log out or close your browser.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-foreground">Managing Cookies</h2>
        <p className="text-foreground/70">
          You can control cookie settings in your browser. However, disabling cookies may affect your ability to use KinetoFun.
        </p>
      </section>
    </div>
  );
}
