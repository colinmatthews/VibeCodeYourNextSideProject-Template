import { MailService } from '@sendgrid/mail';

const mailService = new MailService();
let configuredApiKey: string | null = null;

function ensureConfigured() {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    configuredApiKey = null;
    return null;
  }

  if (configuredApiKey !== apiKey) {
    mailService.setApiKey(apiKey);
    configuredApiKey = apiKey;
  }

  return apiKey;
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    if (!ensureConfigured()) {
      console.warn('[SendGrid] SENDGRID_API_KEY not configured; skipping email send.');
      return false;
    }

    const emailData: any = {
      to: params.to,
      from: params.from,
      subject: params.subject,
    };
    
    if (params.text) {
      emailData.text = params.text;
    }
    
    if (params.html) {
      emailData.html = params.html;
    }

    await mailService.send(emailData);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}
