import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = createTransport();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"XOXO Finanzas" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    logger.info(`Email sent to ${options.to}: ${options.subject}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${options.to}: ${error}`);
    return false;
  }
}

// ── Modular email templates ──────────────────────────────────────────────────
// Edit these templates to customize the look & feel of emails.
// The `variables` object is injected via {{variable}} placeholders.

export interface TemplateVariables {
  username: string;
  resetUrl: string;
  expiresIn: string;
  [key: string]: string;
}

function renderTemplate(template: string, vars: TemplateVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

// ── Password Reset Email Template ────────────────────────────────────────────
// Edit the HTML below to change the email design. Placeholders: {{username}}, {{resetUrl}}, {{expiresIn}}

const PASSWORD_RESET_SUBJECT = 'Restablece tu contraseña — XOXO Finanzas';

const PASSWORD_RESET_TEMPLATE = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; background: #0A0A0F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 480px; margin: 0 auto; padding: 40px 24px; }
    .card { background: rgba(255,255,255,0.06); border: 1px solid rgba(124,58,237,0.2); border-radius: 16px; padding: 32px 24px; text-align: center; }
    .logo { width: 48px; height: 48px; background: linear-gradient(135deg, #7C3AED, #5B21B6); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
    .logo svg { width: 24px; height: 24px; fill: white; }
    h1 { color: #fff; font-size: 20px; font-weight: 700; margin: 0 0 8px; }
    p { color: #A0A0B8; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #7C3AED, #5B21B6); color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 12px; font-size: 14px; font-weight: 600; margin: 8px 0 24px; }
    .warning { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; padding: 12px; color: #F87171; font-size: 12px; margin: 16px 0; }
    .footer { color: #6B6B85; font-size: 11px; margin-top: 24px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
          <polyline points="16 7 22 7 22 13"/>
        </svg>
      </div>
      <h1>Restablecer contraseña</h1>
      <p>Hola <strong>{{username}}</strong>, recibimos una solicitud para restablecer la contraseña de tu cuenta en XOXO Finanzas.</p>
      <a href="{{resetUrl}}" class="btn">Restablecer mi contraseña</a>
      <p>Este enlace expirará en <strong>{{expiresIn}}</strong>.</p>
      <div class="warning">
        Si no solicitaste este cambio, ignora este correo. Tu contraseña permanecerá sin cambios.
      </div>
    </div>
    <div class="footer">
      <p>XOXO Finanzas — Finanzas inteligentes</p>
      <p>Este es un correo automático, por favor no respondas.</p>
    </div>
  </div>
</body>
</html>`;

export function buildPasswordResetEmail(vars: TemplateVariables): { subject: string; html: string } {
  return {
    subject: PASSWORD_RESET_SUBJECT,
    html: renderTemplate(PASSWORD_RESET_TEMPLATE, vars),
  };
}
