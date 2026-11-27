import { LegalPage } from "@/components/legal/LegalPage";
import { getRequestMessages } from "@/lib/i18n/server";

export default async function TermsPage() {
  const { t } = await getRequestMessages();
  const p = t.legal.terms;
  return (
    <LegalPage
      title={p.title}
      updated={t.legal.updated}
      sections={p.sections}
      contact={{ title: p.contactTitle, body: p.contactBody, email: "legal@kinetofun.com" }}
    />
  );
}
