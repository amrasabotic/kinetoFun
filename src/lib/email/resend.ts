// Server-only transactional email via Resend.
//
// A missing RESEND_API_KEY doesn't crash the app — it logs the email to the
// console instead, so registration/reset flows stay testable without a real
// provider configured (same "fail open in dev, required in prod" spirit as
// `auth/config.ts`'s JWT_SECRET handling).

import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "KinetoFun <onboarding@resend.dev>";

let client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/** Send an email, or log it to the console when no provider is configured. */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const resend = getClient();

  if (!resend) {
    console.warn(
      "[email] RESEND_API_KEY not set — logging email instead of sending:\n" +
        `  to: ${input.to}\n  subject: ${input.subject}`,
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  if (error) {
    console.error("[email] Resend send failed:", error);
    throw new Error("Failed to send email.");
  }
}
