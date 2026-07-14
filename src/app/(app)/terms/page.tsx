export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-12">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-foreground">Terms of Service</h1>
        <p className="text-sm text-foreground/45">Last updated: June 2026</p>
      </div>

      <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-foreground">Agreement to Terms</h2>
        <p className="text-foreground/70">
          By accessing and using KinetoFun, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-foreground">User Responsibilities</h2>
        <p className="text-foreground/70">
          You agree to use KinetoFun only for lawful purposes and in a way that does not infringe upon the rights of others or restrict their use and enjoyment of the service.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-foreground">Limitation of Liability</h2>
        <p className="text-foreground/70">
          KinetoFun is provided on an "as is" basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, and non-infringement of intellectual property or other violation of rights.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-foreground">Contact Us</h2>
        <p className="text-foreground/70">
          If you have questions about these Terms of Service, please contact us at{" "}
          <a href="mailto:legal@kinetofun.com" className="text-primary hover:underline">
            legal@kinetofun.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
