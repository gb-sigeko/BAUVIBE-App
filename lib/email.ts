export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
};

export type SendEmailResult = { ok: boolean; mode: "resend" | "stub" | "nodemailer"; status?: number };

/**
 * Versand: EMAIL_MOCK=1 nur Log; sonst EMAIL_SERVER (nodemailer), RESEND_API_KEY, sonst Stub.
 */
export async function sendTransactionalEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (process.env.EMAIL_MOCK === "1") {
    console.info("[email mock]", {
      to: input.to,
      subject: input.subject,
      attachments: input.attachments?.map((a) => a.filename),
    });
    return { ok: true, mode: "stub" };
  }

  const from = process.env.EMAIL_FROM ?? "BAUVIBE <onboarding@resend.dev>";
  const smtp = process.env.EMAIL_SERVER;

  if (smtp) {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport(smtp);
    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
    return { ok: true, mode: "nodemailer" };
  }

  const key = process.env.RESEND_API_KEY;

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
        content: a.content.toString("base64"),
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
      const errBody = await res.text();
      console.error("[email] Resend error", res.status, errBody);
      return { ok: false, mode: "resend", status: res.status };
    }
    return { ok: true, mode: "resend", status: res.status };
  }

  console.info("[email stub]", { to: input.to, subject: input.subject });
  return { ok: true, mode: "stub" };
}
