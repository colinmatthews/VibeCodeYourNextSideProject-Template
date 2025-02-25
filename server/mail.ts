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
    console.debug("Email parameters validation passed", { params });

    // Ensure we're using a verified sender domain
    const from = "carlos@kindnessengineering.com";
    console.log("Sending email from:", from, "to:", params.to);

    // Log email sending action
    console.debug("Sending email through SendGrid", {
      to: params.to,
      from: from,
      subject: params.subject,
      text: params.text,
      html: params.html || params.text.replace(/\n/g, "<br>"),
    });

    // Send email
    await mailService.send({
      to: params.to,
      from: from, // Use verified sender
      subject: params.subject,
      text: params.text,
      html: params.html || params.text.replace(/\n/g, "<br>"),
    });

    console.log("Email sent successfully to:", params.to);
    return true;
  } catch (error) {
    console.error("SendGrid email error:", error);
    console.debug("Error details", { error });
    if (error.response) {
      console.error("SendGrid API response:", {
        status: error.response.status,
        body: error.response.body,
      });
      console.debug("API response received from SendGrid", {
        status: error.response.status,
        body: error.response.body,
      });
    }
    return false;
  }
}
