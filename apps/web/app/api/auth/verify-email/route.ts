import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp, _t } = body;
    const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://zero-api-m0an.onrender.com")
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (!email || !otp) {
      return NextResponse.json({ message: "Email and code are required" }, { status: 400 });
    }

    // --- Vercel-layer stateless token validation ---
    if (_t) {
      try {
        const payload = JSON.parse(atob(_t));

        if (Date.now() > payload.otpExpires) {
          return NextResponse.json(
            { message: "Verification code has expired. Please sign up again." },
            { status: 400 }
          );
        }

        if (payload.email.toLowerCase() !== email.toLowerCase()) {
          return NextResponse.json({ message: "Invalid verification code" }, { status: 400 });
        }

        const safeOtp = typeof otp === "string" ? otp : String(otp);
        const cleanOtp = safeOtp.replace(/\D/g, "");
        if (payload.otp !== cleanOtp) {
          return NextResponse.json({ message: "Invalid verification code" }, { status: 400 });
        }

        // OTP is valid! Try to mark as verified on the backend
        const backendRes = await fetch(`${apiBase}/api/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp }),
        });

        if (backendRes.ok) {
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
            return NextResponse.json({ message: "The server is temporarily unavailable." }, { status: 502 });
          }
          const response = NextResponse.json(backendData, { status: 200 });
          const setCookie = backendRes.headers.get("set-cookie");
          if (setCookie) {
            response.headers.set("set-cookie", setCookie);
          }
          return response;
        }

        // Backend is old (no verify endpoint) — log the user in directly
        const loginRes = await fetch(`${apiBase}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: body.password ?? "" }),
        });

        // Can't log in without the password — tell user to log in manually
        return NextResponse.json(
          { message: "Email verified! Please log in to continue.", verified: true, needsLogin: true },
          { status: 200 }
        );
      } catch {
        return NextResponse.json(
          { message: "Invalid verification state. Please sign up again." },
          { status: 400 }
        );
      }
    }

    // --- Fallback: forward to backend directly ---
    const backendRes = await fetch(`${apiBase}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
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
      console.error("Failed to parse backend response (fallback):", parseError);
      return NextResponse.json({ message: "The server is temporarily unavailable." }, { status: 502 });
    }
    const response = NextResponse.json(backendData, { status: backendRes.status });
    const setCookie = backendRes.headers.get("set-cookie");
    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }
    return response;
  } catch (err) {
    console.error("Verify email route error:", err);
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
