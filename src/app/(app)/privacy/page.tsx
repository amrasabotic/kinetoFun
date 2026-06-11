export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-12">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-foreground">Privacy Policy</h1>
        <p className="text-sm text-foreground/45">Last updated: June 2026</p>
      </div>

      <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-foreground">Introduction</h2>
        <p className="text-foreground/70">
          KinetoFun is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-foreground">Information We Collect</h2>
        <p className="text-foreground/70">
          We collect information you provide directly to us, such as when you create an account, including your email address, username, and profile information.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-foreground">How We Use Your Information</h2>
        <p className="text-foreground/70">
          We use your information to provide, maintain, and improve our services, as well as to communicate with you about updates and changes to our platform.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-foreground">Contact Us</h2>
        <p className="text-foreground/70">
          If you have questions about this Privacy Policy, please contact us at{" "}
          <a href="mailto:privacy@kinetofun.com" className="text-primary hover:underline">
            privacy@kinetofun.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
