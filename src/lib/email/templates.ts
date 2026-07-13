// Plain-HTML email templates. Kept dependency-free (no react-email) since the
// platform only needs one transactional email today.

export function passwordResetEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: "Reset your KinetoFun password",
    html: `
      <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h1 style="font-size: 20px; margin: 0 0 16px;">Reset your password</h1>
        <p style="font-size: 15px; line-height: 1.5; color: #333;">
          We received a request to reset your KinetoFun password. Click the button below to choose a new one.
          This link expires in 30 minutes.
        </p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}"
             style="display: inline-block; background: #6D5DFC; color: #fff; text-decoration: none;
                    padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">
            Reset password
          </a>
        </p>
        <p style="font-size: 13px; color: #777; line-height: 1.5;">
          If you didn't request this, you can safely ignore this email — your password won't change.
        </p>
        <p style="font-size: 12px; color: #aaa; word-break: break-all;">${resetUrl}</p>
      </div>
    `,
  };
}
