/**
 * Minimal email helper.
 *
 * No email provider is wired up by default (keeps Phase 1 zero-config).
 * In development, "sending" an email just logs it to the server console
 * so you can copy the reset link and test the flow end-to-end.
 *
 * To send real emails later, plug a provider (Resend, SMTP, etc.) into
 * the body of this function - the call sites elsewhere never need to change.
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}) {
  if (process.env.NODE_ENV !== "production") {
    console.log("\n=== EMAIL (dev mode - not actually sent) ===");
    console.log("To:", options.to);
    console.log("Subject:", options.subject);
    console.log(options.html.replace(/<[^>]+>/g, " ").trim());
    console.log("=============================================\n");
    return { simulated: true };
  }

  // Production: no provider configured yet.
  console.warn(
    "[mailer] No email provider configured for production. " +
      "Set one up in lib/mailer.ts before deploying."
  );
  return { simulated: true };
}
