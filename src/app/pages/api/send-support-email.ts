import type { NextApiRequest, NextApiResponse } from "next";
import emailjs from "@emailjs/nodejs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    to_email,
    subject,
    message,
    ticketId,
    ticket_subject,
    to_name,
    from_name,
  } = req.body;

  // Validate required fields
  if (!to_email || !subject || !message) {
    return res.status(400).json({
      error: "Missing required fields: to_email, subject, message",
    });
  }

  // Log the received data for debugging
  console.log("API received data:", {
    to_email,
    subject,
    message,
    ticketId,
    ticket_subject,
    to_name,
    from_name,
  });

  try {
    const templateParams = {
      to_email,
      to_name: to_name || to_email.split("@")[0],
      from_name: from_name || "R2R Support Team",
      subject: subject,
      ticketId: ticketId || "N/A", // ← Changed to ticketId
      message: message,
      ticket_subject: ticket_subject || subject,
      support_email: "rentoreuse.2025@gmail.com",
    };

    console.log("Sending email with template params:", templateParams);

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_EMAILJS_SUPPORT_SERVICE_ID) {
      throw new Error(
        "Missing NEXT_PUBLIC_EMAILJS_SERVICE_ID environment variable"
      );
    }
    if (!process.env.NEXT_PUBLIC_EMAILJS_SUPPORT_TEMPLATE_ID) {
      throw new Error(
        "Missing NEXT_PUBLIC_EMAILJS_TEMPLATE_ID environment variable"
      );
    }
    if (!process.env.NEXT_PUBLIC_EMAILJS_SUPPORT_PUBLIC_KEY) {
      throw new Error(
        "Missing NEXT_PUBLIC_EMAILJS_SUPPORT_PUBLIC_KEY environment variable"
      );
    }
    if (!process.env.EMAILJS_SUPPORT_PRIVATE_KEY) {
      throw new Error(
        "Missing EMAILJS_SUPPORT_PRIVATE_KEY environment variable"
      );
    }

    const result = await emailjs.send(
      process.env.NEXT_PUBLIC_EMAILJS_SUPPORT_SERVICE_ID,
      process.env.NEXT_PUBLIC_EMAILJS_SUPPORT_TEMPLATE_ID,
      templateParams, // Use the complete template params object
      {
        publicKey: process.env.NEXT_PUBLIC_EMAILJS_SUPPORT_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_SUPPORT_PRIVATE_KEY,
      }
    );

    console.log("Email sent successfully:", result);
    return res.status(200).json({
      success: true,
      result,
      ticketId: ticketId, // Return the ticketId for confirmation
    });
  } catch (err) {
    console.error("EmailJS error details:", err);

    // More detailed error handling
    if (err instanceof Error) {
      return res.status(500).json({
        error: "Failed to send email",
        details: err.message,
        ticketId: ticketId, // Include ticketId even in error response
      });
    }

    return res.status(500).json({
      error: "Failed to send email",
      details: "Unknown error occurred",
      ticketId: ticketId,
    });
  }
}
