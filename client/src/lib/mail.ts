// Client-side email utility for handling email-related operations
import { apiRequest } from "./queryClient";

interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send an email through the backend API
 * This provides a client-side wrapper around the SendGrid email functionality
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    const response = await apiRequest("POST", "/api/send-email", {
      ...params,
      from: "noreply@replit.com" // Use verified sender
    });

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

/**
 * Send a contact notification email
 * Helper function to standardize contact-related email notifications
 */
export async function sendContactNotification(
  to: string,
  subject: string,
  message: string
): Promise<boolean> {
  return sendEmail({
    to,
    subject,
    text: message,
    html: message.replace(/\n/g, '<br>')
  });
}