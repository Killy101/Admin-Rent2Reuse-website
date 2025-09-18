import { NextResponse } from "next/server";
import emailjs from "@emailjs/nodejs";

export async function POST(request: Request) {
  try {
    // Verify EmailJS credentials
    if (
      !process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID ||
      !process.env.NEXT_PUBLIC_EMAILJS_TEAM_REQUEST_TEMPLATE_ID ||
      !process.env.NEXT_PUBLIC_EMAILJS_USER_ID ||
      !process.env.EMAILJS_PRIVATE_KEY
    ) {
      return NextResponse.json(
        { error: "Email service not configured properly" },
        { status: 500 }
      );
    }

    // Initialize EmailJS
    emailjs.init({
      publicKey: process.env.NEXT_PUBLIC_EMAILJS_USER_ID,
      privateKey: process.env.EMAILJS_PRIVATE_KEY,
    });

    const body = await request.json();

    // DEBUG: Log the incoming request body
    console.log(
      "📧 Incoming email request body:",
      JSON.stringify(body, null, 2)
    );

    const {
      to_email,
      to_name,
      user_role,
      request_status,
      request_id,
      admin_name,
      platform_name,
      custom_message,
    } = body;

    // DEBUG: Log individual extracted fields
    console.log("📧 Extracted fields:");
    console.log("  to_email:", to_email);
    console.log("  to_name:", to_name);
    console.log("  user_role:", user_role);
    console.log("  request_status:", request_status);

    // Validate required fields
    if (!to_email || !to_name || !user_role || !request_status) {
      console.error("❌ Missing required fields:", {
        to_email: !!to_email,
        to_name: !!to_name,
        user_role: !!user_role,
        request_status: !!request_status,
      });

      return NextResponse.json(
        {
          error: "Missing required fields",
          missing: {
            to_email: !to_email,
            to_name: !to_name,
            user_role: !user_role,
            request_status: !request_status,
          },
          received: { to_email, to_name, user_role, request_status },
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to_email)) {
      console.error("❌ Invalid email format:", to_email);
      return NextResponse.json(
        { error: "Invalid email format", email: to_email },
        { status: 400 }
      );
    }

    const isApproved = request_status === "approved";
    // Updated templateParams in your API route:
    const templateParams = {
      to_email, // Make sure this matches your EmailJS template "To Email" field
      to_name,
      user_role: user_role.charAt(0).toUpperCase() + user_role.slice(1),
      request_status:
        request_status.charAt(0).toUpperCase() + request_status.slice(1),
      request_id: request_id || "N/A",
      admin_name: admin_name || "Admin Team",
      platform_name: platform_name || "Rent2Reuse",
      message:
        custom_message || `Your access request has been ${request_status}`,
      support_email: "rentoreuse.2025@gmail.com",
      current_date: new Date().toLocaleDateString(),

      // New variables for the template:
      status_class: isApproved ? "status-approved" : "status-rejected",
      additional_message: isApproved
        ? "You can now access the platform using your registered email address."
        : "If you have any questions about this decision, please contact our support team.",
      button_text: isApproved ? "Access Platform" : "Contact Support",
      button_url: isApproved
        ? `${
            process.env.NEXT_PUBLIC_APP_URL || "https://rent2reuse.com"
          }/admin/login`
        : `mailto:rentoreuse.2025@gmail.com`,
    };
    // DEBUG: Log the template parameters being sent to EmailJS
    console.log("📧 Template parameters being sent to EmailJS:");
    console.log(JSON.stringify(templateParams, null, 2));

    const result = await emailjs.send(
      process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
      process.env.NEXT_PUBLIC_EMAILJS_TEAM_REQUEST_TEMPLATE_ID,
      templateParams
    );

    console.log("✅ Email sent successfully:", result);

    return NextResponse.json({
      success: true,
      status: "Email sent successfully",
      messageId: result.status,
    });
  } catch (error: any) {
    console.error("❌ Email sending failed:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.status,
      text: error.text,
    });

    return NextResponse.json(
      {
        error: "Failed to send email",
        message: error.message,
        status: error.status,
        text: error.text,
      },
      { status: 500 }
    );
  }
}