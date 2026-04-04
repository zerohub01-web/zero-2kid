"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { api } from "../../lib/api";
import { toast } from "react-hot-toast";
import { ZeroLogo } from "../../components/brand/ZeroLogo";
import { SiteHeader } from "../../components/SiteHeader";
import styles from "./login.module.css";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (opts: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

type GoogleState = "loading" | "ready" | "unavailable";

export default function LoginPage() {
  const adminEmail = "zerohub01@gmail.com";
  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim().replace(/^['"]|['"]$/g, "") ?? "";

  const [form, setForm] = useState({ email: "", password: "" });
  const [sending, setSending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleState, setGoogleState] = useState<GoogleState>("loading");
  const googleRef = useRef<HTMLDivElement | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);

    const loadingId = toast.loading("Authenticating...");
    try {
      await api.post("/api/auth/client-login", form);
      const isAdminEmail = form.email.trim().toLowerCase() === adminEmail;

      if (isAdminEmail) {
        toast.loading("Upgrading to admin session...", { id: loadingId });
        await api.post("/api/admin/customer-bridge");
      }

      toast.success("Login successful! Redirecting...", { id: loadingId });
      window.location.href = isAdminEmail ? "/zero-control" : "/client-dashboard";
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Login failed";
      toast.error(msg ?? "Login failed", { id: loadingId });
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (!clientId) {
      setGoogleState("unavailable");
      return;
    }

    const attachGoogleButton = () => {
      if (!window.google || !googleRef.current) {
        setGoogleState("unavailable");
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          const loadingId = toast.loading("Verifying Google account...");
          try {
            const loginPayload = { credential, clientId };

            const primary = await fetch("/internal/google-auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(loginPayload)
            });

            const response =
              primary.ok || primary.status < 500
                ? primary
                : await fetch("/api/auth/google", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ credential })
                  });

            const data = (await response.json().catch(() => ({}))) as {
              customer?: { email?: string };
              message?: string;
              error?: string;
            };

            if (!response.ok) {
              const message =
                data?.message ||
                data?.error ||
                `Google login failed${response.status ? ` (${response.status})` : ""}`;
              toast.error(message, { id: loadingId });
              return;
            }

            const isAdminEmail = data?.customer?.email?.trim().toLowerCase() === adminEmail;

            if (isAdminEmail) {
              toast.loading("Upgrading to admin session...", { id: loadingId });
              await api.post("/api/admin/customer-bridge");
            }

            toast.success("Signed in with Google", { id: loadingId });
            window.location.href = isAdminEmail ? "/zero-control" : "/client-dashboard";
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Google login failed";
            toast.error(message, { id: loadingId });
          }
        }
      });

      googleRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleRef.current, {
        theme: "filled_blue",
        size: "large",
        text: "continue_with",
        shape: "pill",
        logo_alignment: "left",
        width: 360
      });

      setGoogleState("ready");
    };

    if (window.google) {
      attachGoogleButton();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = attachGoogleButton;
    script.onerror = () => setGoogleState("unavailable");
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [adminEmail, clientId]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <SiteHeader />
      <main className={styles.page}>
        <div className={styles.shell}>
          <aside className={styles.infoPane}>
            <span className={styles.badge}>ZERO Access</span>
            <h1 className={styles.infoTitle}>Client Portal Sign-In</h1>
            <p className={styles.infoText}>
              Access your project timeline, approvals, milestone updates, and delivery files from one secure workspace.
            </p>
            <ul className={styles.points}>
              <li>Real-time project progress tracking</li>
              <li>Secure role-based dashboard routing</li>
              <li>Email and Google sign-in support</li>
            </ul>
          </aside>

          <section className={styles.formPane}>
            <div className={styles.formCard}>
              <div className={styles.logoWrap}>
                <ZeroLogo variant="inverted" />
              </div>
              <h2 className={styles.title}>Welcome Back</h2>
              <p className={styles.subtitle}>Sign in to continue managing your ZERO project operations.</p>

              <form onSubmit={onSubmit} className={styles.form}>
                <div>
                  <label className={styles.label} htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    className={styles.input}
                    placeholder="you@company.com"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className={styles.label} htmlFor="password">
                    Password
                  </label>
                  <div className={styles.inputWrap}>
                    <input
                      id="password"
                      className={`${styles.input} ${styles.passwordInput}`}
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button className={styles.primaryButton} disabled={sending}>
                  {sending ? "Authenticating..." : "Login Securely"}
                </button>
              </form>

              <div className={styles.divider}>Or continue with Google</div>

              <div className={styles.googleShell}>
                <div className={styles.googleButtonHost} ref={googleRef} />
                {googleState === "loading" && <p className={styles.metaText}>Preparing Google sign-in...</p>}
                {googleState === "unavailable" && (
                  <p className={`${styles.metaText} ${styles.metaError}`}>
                    Google login unavailable. Check Google client ID setup.
                  </p>
                )}
                {process.env.NODE_ENV === "development" && !clientId && (
                  <p style={{ color: "red" }}>⚠️ NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set</p>
                )}
              </div>

              <p className={styles.bottomText}>
                New here? <a href="/signup">Create account</a>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
