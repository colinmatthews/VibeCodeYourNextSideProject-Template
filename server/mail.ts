import { MailService } from "@sendgrid/mail";

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from?: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    // Log the start of the sendEmail process
    console.debug("Starting sendEmail function", { params });

    // Validate email parameters (sender can be provided via env)
    if (!params.to || !params.subject || !params.text) {
      console.error(
        "SendGrid error: Missing required email parameters",
        params,
      );
      return false;
    }

    // Log validation success
    console.log("[SendGrid] Email parameters validation passed", { params });

    // Use verified sender from configuration (required by SendGrid)
    const from = process.env.SENDGRID_FROM || params.from;
    if (!from) {
      console.error("[SendGrid] Missing SENDGRID_FROM environment variable or 'from' param");
      return false;
    }
    console.log("[SendGrid] Preparing to send email:", {
      from,
      to: params.to,
      subject: params.subject
    });

    // Log email sending action with full details
    console.log("[SendGrid] Attempting to send email", {
      to: params.to,
      from: from,
      subject: params.subject,
      hasText: !!params.text,
      hasHtml: !!params.html,
      apiKeyPresent: !!process.env.SENDGRID_API_KEY
    });

    // Send email
    await mailService.send({
      to: params.to,
      from: from, // Use verified sender
      subject: params.subject,
      text: params.text,
      html: params.html || params.text.replace(/\n/g, "<br>"),
    });

    console.log("[SendGrid] Email sent successfully to:", params.to);
    return true;
  } catch (error) {
    console.error("[SendGrid] Email sending failed:", error);
    
    if (error instanceof Error) {
      console.error("[SendGrid] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    if (error && typeof error === 'object' && 'response' in error) {
      const errorWithResponse = error as { response: { status: number; statusText: string; body: any; headers: any } };
      console.error("[SendGrid] API error response:", {
        status: errorWithResponse.response.status,
        statusText: errorWithResponse.response.statusText,
        body: errorWithResponse.response.body,
        headers: errorWithResponse.response.headers
      });
    }
    return false;
  }
}
