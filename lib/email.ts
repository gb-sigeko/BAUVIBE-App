export type SendEmailAttachment = {
  filename: string;
  /** Base64 ohne data:-Prefix */
  contentBase64: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  attachments?: SendEmailAttachment[];
};

export type SendEmailResult = { ok: boolean; mode: "resend" | "stub" | "mock"; status?: number };

/**
 * Versand: mit RESEND_API_KEY über Resend, sonst Stub (Konsolen-Log).
 * `EMAIL_MOCK=1`: kein Netzwerk, immer ok (für Tests / lokale Grind-Läufe).
 */
export async function sendTransactionalEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (process.env.EMAIL_MOCK === "1") {
    console.info("[email mock]", {
      to: input.to,
      subject: input.subject,
      attachments: input.attachments?.map((a) => a.filename) ?? [],
    });
    return { ok: true, mode: "mock" };
  }

  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "BAUVIBE <onboarding@resend.dev>";

  if (key) {
    const body: Record<string, unknown> = {
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    };
    if (input.attachments?.length) {
      body.attachments = input.attachments.map((a) => ({
        filename: a.filename,
        content: a.contentBase64,
      }));
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const bodyText = await res.text();
      console.error("[email] Resend error", res.status, bodyText);
      return { ok: false, mode: "resend", status: res.status };
    }
    return { ok: true, mode: "resend", status: res.status };
  }

  console.info("[email stub]", { to: input.to, subject: input.subject });
  return { ok: true, mode: "stub" };
}
