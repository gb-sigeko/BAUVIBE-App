export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

export type SendEmailResult = { ok: boolean; mode: "resend" | "stub"; status?: number };

/**
 * Versand: mit RESEND_API_KEY über Resend, sonst Stub (Konsolen-Log, ok für Dev).
 */
export async function sendTransactionalEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "BAUVIBE <onboarding@resend.dev>";

  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Resend error", res.status, body);
      return { ok: false, mode: "resend", status: res.status };
    }
    return { ok: true, mode: "resend", status: res.status };
  }

  console.info("[email stub]", { to: input.to, subject: input.subject });
  return { ok: true, mode: "stub" };
}
