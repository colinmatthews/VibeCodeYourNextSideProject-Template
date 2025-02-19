// Client-side email utility for handling email-related operations
import { apiRequest } from "./queryClient";

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Send an email through the backend API
 * This provides a client-side wrapper around the SendGrid email functionality
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await apiRequest("POST", "/api/send-email", params);
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
    from: "noreply@contactmanager.com",
    subject,
    text: message,
  });
}
