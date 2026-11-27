// Plain-HTML email templates. Kept dependency-free (no react-email) since the
// platform only needs one transactional email today.

import { getMessages, type Locale } from "@/lib/i18n";

export function passwordResetEmail(resetUrl: string, locale: Locale = "en"): { subject: string; html: string } {
  const m = getMessages(locale).auth.email_reset;
  return {
    subject: m.subject,
    html: `
      <div lang="${locale}" style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h1 style="font-size: 20px; margin: 0 0 16px;">${m.heading}</h1>
        <p style="font-size: 15px; line-height: 1.5; color: #333;">
          ${m.body}
        </p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}"
             style="display: inline-block; background: #6D5DFC; color: #fff; text-decoration: none;
                    padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">
            ${m.button}
          </a>
        </p>
        <p style="font-size: 13px; color: #777; line-height: 1.5;">
          ${m.ignore}
        </p>
        <p style="font-size: 12px; color: #aaa; word-break: break-all;">${resetUrl}</p>
      </div>
    `,
  };
}
