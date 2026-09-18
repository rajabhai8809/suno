import nodemailer from "nodemailer";

let transporter;

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (appUrl) return appUrl.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL is required in production");
  }

  return "http://localhost:3000";
}

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP_HOST, SMTP_USER and SMTP_PASS are required in production");
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
    ...(port !== 465 ? { requireTLS: true } : {}),
    tls: {
      minVersion: "TLSv1.2",
    },
  });

  return transporter;
}

async function send({ to, subject, html, text }) {
  const mailer = getTransporter();

  if (!mailer) {
    console.warn("[Suno] SMTP is not configured. Email was not sent.");
    return false;
  }

  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text,
  });

  return true;
}

export async function sendVerificationEmail({ email, name, token }) {
  const url = `${getAppUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(name || "there");

  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== "production") {
    console.info(`[Suno] Verification URL for ${email}: ${url}`);
  }

  return send({
    to: email,
    subject: "Verify your Suno email",
    text: `Hi ${name || "there"}, verify your Suno account: ${url}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px;margin:0 auto;padding:32px">
        <h1 style="margin:0 0 12px">Welcome to Suno</h1>
        <p>Hi ${safeName},</p>
        <p>Verify your email to finish creating your account.</p>
        <p><a href="${url}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:999px">Verify email</a></p>
        <p style="color:#666;font-size:13px">This link expires in 24 hours.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail({ email, name, token }) {
  const url = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(name || "there");

  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== "production") {
    console.info(`[Suno] Password reset URL for ${email}: ${url}`);
  }

  return send({
    to: email,
    subject: "Reset your Suno password",
    text: `Hi ${name || "there"}, reset your Suno password: ${url}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px;margin:0 auto;padding:32px">
        <h1 style="margin:0 0 12px">Reset your Suno password</h1>
        <p>Hi ${safeName},</p>
        <p>Use the button below to choose a new password.</p>
        <p><a href="${url}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:999px">Reset password</a></p>
        <p style="color:#666;font-size:13px">This link expires in 30 minutes and can only be used once.</p>
      </div>
    `,
  });
}