import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, pickLocale, type Locale } from "./config";
import { getMessages, type Messages } from "./index";

export async function getRequestLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return pickLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerStore.get("accept-language"));
}

export async function getRequestMessages(): Promise<{ locale: Locale; t: Messages }> {
  const locale = await getRequestLocale();
  return { locale, t: getMessages(locale) };
}
