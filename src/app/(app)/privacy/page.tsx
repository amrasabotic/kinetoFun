import { LegalPage } from "@/components/legal/LegalPage";
import { getRequestMessages } from "@/lib/i18n/server";

export default async function PrivacyPage() {
  const { t } = await getRequestMessages();
  const p = t.legal.privacy;
  return (
    <LegalPage
      title={p.title}
      updated={t.legal.updated}
      sections={p.sections}
      contact={{ title: p.contactTitle, body: p.contactBody, email: "privacy@kinetofun.com" }}
    />
  );
}
