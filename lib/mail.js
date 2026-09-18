import nodemailer from "nodemailer";

let transporter = null;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!appUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_APP_URL is required in production.",
      );
    }

    return "http://localhost:3000";
  }

  return appUrl.replace(/\/+$/, "");
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const port = Number(process.env.SMTP_PORT || 465);

  if (!host || !user || !pass) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SMTP_HOST, SMTP_USER and SMTP_PASS are required in production.",
      );
    }

    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,

    auth: {
      user,
      pass,
    },

    ...(port === 587
      ? {
          requireTLS: true,
        }
      : {}),

    tls: {
      minVersion: "TLSv1.2",
    },
  });

  return transporter;
}

async function sendMail({
  to,
  subject,
  html,
  text,
}) {
  const mailer = getTransporter();

  if (!mailer) {
    console.warn(
      "[Suno] SMTP is not configured.",
    );

    return false;
  }

  const from =
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER?.trim();

  if (!from) {
    throw new Error(
      "SMTP_FROM or SMTP_USER is required.",
    );
  }

  await mailer.sendMail({
    from,
    to,
    subject,
    html,
    text,
  });

  return true;
}

export async function sendVerificationEmail({
  email,
  name,
  token,
}) {
  const url =
    `${getAppUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  const safeName = escapeHtml(name || "there");

  return sendMail({
    to: email,

    subject: "Verify your Suno email",

    text: [
      `Hi ${name || "there"},`,
      "",
      "Verify your Suno account:",
      url,
      "",
      "This link expires in 24 hours.",
    ].join("\n"),

    html: `
      <!doctype html>
      <html>
        <body style="margin:0;background:#07070b;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
          <div style="padding:40px 20px;">
            <div style="max-width:560px;margin:0 auto;background:#111117;border:1px solid #27272f;border-radius:24px;padding:36px;">

              <h1 style="margin:0 0 16px;font-size:32px;">
                Welcome to Suno
              </h1>

              <p style="color:#a1a1aa;">
                Hi ${safeName},
              </p>

              <p style="color:#a1a1aa;line-height:1.7;">
                Verify your email address to finish creating your Suno account.
              </p>

              <div style="margin:30px 0;">
                <a
                  href="${url}"
                  style="display:inline-block;padding:14px 22px;border-radius:999px;background:#ffffff;color:#000000;text-decoration:none;font-weight:700;"
                >
                  Verify email
                </a>
              </div>

              <p style="color:#71717a;font-size:13px;line-height:1.7;">
                This verification link expires in 24 hours.
              </p>

              <p style="color:#52525b;font-size:12px;line-height:1.7;word-break:break-all;">
                ${url}
              </p>

            </div>
          </div>
        </body>
      </html>
    `,
  });
}

export async function sendPasswordResetEmail({
  email,
  name,
  token,
}) {
  const url =
    `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;

  const safeName = escapeHtml(name || "there");

  return sendMail({
    to: email,

    subject: "Reset your Suno password",

    text: [
      `Hi ${name || "there"},`,
      "",
      "Reset your Suno password:",
      url,
      "",
      "This link expires in 30 minutes.",
    ].join("\n"),

    html: `
      <!doctype html>
      <html>
        <body style="margin:0;background:#07070b;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
          <div style="padding:40px 20px;">
            <div style="max-width:560px;margin:0 auto;background:#111117;border:1px solid #27272f;border-radius:24px;padding:36px;">

              <h1 style="margin:0 0 16px;font-size:32px;">
                Reset your Suno password
              </h1>

              <p style="color:#a1a1aa;">
                Hi ${safeName},
              </p>

              <p style="color:#a1a1aa;line-height:1.7;">
                Use the button below to choose a new password.
              </p>

              <div style="margin:30px 0;">
                <a
                  href="${url}"
                  style="display:inline-block;padding:14px 22px;border-radius:999px;background:#ffffff;color:#000000;text-decoration:none;font-weight:700;"
                >
                  Reset password
                </a>
              </div>

              <p style="color:#71717a;font-size:13px;line-height:1.7;">
                This link expires in 30 minutes and can only be used once.
              </p>

            </div>
          </div>
        </body>
      </html>
    `,
  });
}