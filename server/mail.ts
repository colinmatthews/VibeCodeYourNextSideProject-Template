import { MailService } from "@sendgrid/mail";

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    // Log the start of the sendEmail process
    console.debug("Starting sendEmail function", { params });

    // Validate email parameters
    if (!params.to || !params.from || !params.subject || !params.text) {
      console.error(
        "SendGrid error: Missing required email parameters",
        params,
      );
      return false;
    }

    // Log validation success
    console.log("[SendGrid] Email parameters validation passed", { params });

    // Ensure we're using a verified sender domain
    const from = "carlos@kindnessengineering.com";
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
    console.error("[SendGrid] Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    if (error.response) {
      console.error("[SendGrid] API error response:", {
        status: error.response.status,
        statusText: error.response.statusText,
        body: error.response.body,
        headers: error.response.headers
      });
    }
    return false;
  }
}
