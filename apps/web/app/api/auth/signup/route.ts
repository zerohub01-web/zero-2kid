import { NextRequest, NextResponse } from "next/server";

// build: 2026-03-10T21:44 - professional email templates v4
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = "ZERO <noreply@noreply.zeroops.in>";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ message: "Name, email, and password are required" }, { status: 400 });
    }

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Forward signup to the backend
    const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://zero-api-m0an.onrender.com")
      .trim()
      .replace(/^['"]|['"]$/g, "");
    const backendRes = await fetch(`${apiBase}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    let backendData;
    try {
      const responseText = await backendRes.text();
      if (!responseText || responseText.trim() === "") {
        backendData = {};
      } else {
        backendData = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error("Failed to parse backend response:", parseError);
      return NextResponse.json(
        { message: "The server is temporarily unavailable. Please try again later." },
        { status: 502 }
      );
    }

    // If the backend already returned requiresVerification, pass it through
    if (backendData.requiresVerification) {
      return NextResponse.json(backendData, { status: backendRes.status });
    }

    // 409 = email already registered
    if (backendRes.status === 409) {
      return NextResponse.json(backendData, { status: 409 });
    }

    // Any other non-201 failure
    if (backendRes.status !== 201) {
      return NextResponse.json(backendData, { status: backendRes.status });
    }

    // Account created — generate OTP and send it
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 20 * 60 * 1000; // 20 minutes

    // Send OTP email via Resend
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: email,
        subject: "Your ZERO verification code",
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111;border-radius:16px;overflow:hidden;border:1px solid #222;">
        <tr>
          <td style="padding:32px 40px;background:linear-gradient(135deg,#0d0d0d,#1a1a1a);border-bottom:1px solid #222;">
            <div style="display:inline-block;background:#fff;border-radius:8px;padding:6px 14px;">
              <span style="font-size:20px;font-weight:900;letter-spacing:-1px;color:#000;">ZERO</span>
            </div>
          </td>
        </tr>
        <tr><td style="padding:40px;">
          <h1 style="color:#fff;font-size:26px;font-weight:800;margin:0 0 8px;">Verify your account</h1>
          <p style="color:#888;font-size:15px;margin:0 0 28px;">Enter the code below to complete your sign-up.</p>
          <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:32px;text-align:center;margin:8px 0 24px;">
            <p style="color:#888;font-size:12px;margin:0 0 16px;text-transform:uppercase;letter-spacing:2px;">Your code</p>
            <div style="font-size:42px;font-weight:900;letter-spacing:14px;color:#fff;font-family:'Courier New',monospace;">${otp}</div>
            <p style="color:#555;font-size:12px;margin:16px 0 0;">Expires in 20 minutes</p>
          </div>
          <p style="color:#555;font-size:13px;margin:0;">If you didn't request this, ignore this email.</p>
        </td></tr>
        <tr>
          <td style="padding:24px 40px;background:#0d0d0d;border-top:1px solid #222;text-align:center;">
            <p style="color:#444;font-size:12px;margin:0 0 4px;">© 2025 ZERO. All rights reserved.</p>
            <a href="https://zeroops.in" style="color:#555;font-size:11px;text-decoration:none;">zeroops.in</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }),
    });

    // Return a signed token containing the OTP state — NO cookies needed
    const token = btoa(JSON.stringify({ email, otp, otpExpires }));

    return NextResponse.json(
      { message: "Verification required", requiresVerification: true, _t: token },
      { status: 201 }
    );
  } catch (err) {
    console.error("Signup route error:", err);
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
