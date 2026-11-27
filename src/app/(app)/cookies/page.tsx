import { LegalPage } from "@/components/legal/LegalPage";
import { getRequestMessages } from "@/lib/i18n/server";

export default async function CookiesPage() {
  const { t } = await getRequestMessages();
  return <LegalPage title={t.legal.cookies.title} updated={t.legal.updated} sections={t.legal.cookies.sections} />;
}
