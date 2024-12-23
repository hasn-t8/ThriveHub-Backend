import mailgun from "mailgun-js";

const DOMAIN = process.env.MAILGUN_DOMAIN || "mg.thrivehub.ai";
const API_KEY = process.env.MAILGUN_API_KEY || "ENTER_API_KEY_HERE"; // Replace with your actual Mailgun API key

const mg = mailgun({ apiKey: API_KEY, domain: DOMAIN });

/**
 * Sends an email using Mailgun.
 * @param to Recipient's email address
 * @param subject Subject of the email
 * @param template Template name in Mailgun
 * @param variables Variables to pass into the template
 * @returns {Promise<void>}
 */
export const sendMail = async (
  to: string,
  subject: string,
  template: string,
  variables: Record<string, any>
): Promise<void> => {
  try {
    const data = {
      from: `ThriveHub <postmaster@${DOMAIN}>`,
      to,
      subject,
      template,
      "h:X-Mailgun-Variables": JSON.stringify(variables),
    };

    await mg.messages().send(data);
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};
