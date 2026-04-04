"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import {
  executeRecaptchaAction,
  extractCaptchaErrorCode,
  getCaptchaErrorMessage,
  getRecaptchaMode
} from "../../lib/recaptcha";
import { RecaptchaCheckbox, RecaptchaCheckboxHandle } from "../security/RecaptchaCheckbox";

type StepType = "text" | "options";
type ChatRole = "bot" | "user";

interface ChatStep {
  id: string;
  question: string;
  type: StepType;
  placeholder?: string;
  options?: string[];
  allowOther?: boolean;
}

const STORAGE_KEY = "zero_lead_answers";

const CHAT_STEPS: ChatStep[] = [
  {
    id: "name",
    question: "Hi! I'm the ZERO AI Lead Assistant. What's your name?",
    type: "text",
    placeholder: "Your name..."
  },
  {
    id: "email",
    question: "Great, {name}. What is your email address?",
    type: "text",
    placeholder: "your@email.com"
  },
  {
    id: "phone",
    question: "Please share your phone number so we can send updates.",
    type: "text",
    placeholder: "+91 00000 00000"
  },
  {
    id: "businessType",
    question: "What type of business do you run?",
    type: "options",
    allowOther: true,
    options: [
      "E-commerce / Retail",
      "Food and Restaurant",
      "Healthcare / Clinic",
      "Real Estate",
      "Education / Coaching",
      "Agency / Consulting",
      "Manufacturing",
      "Tech / SaaS Startup",
      "Local Service Business"
    ]
  },
  {
    id: "service",
    question: "What service are you looking for?",
    type: "options",
    allowOther: true,
    options: [
      "Website Development",
      "Business Automation",
      "Email Marketing (Resend)",
      "Digital Marketing / Ads",
      "Analytics Dashboard",
      "AI Chatbot Integration",
      "Security and Maintenance",
      "Full Growth Ops Package"
    ]
  },
  {
    id: "teamSize",
    question: "How big is your team?",
    type: "options",
    allowOther: false,
    options: ["Just me (Solo)", "2 - 10 people", "11 - 50 people", "51 - 200 people", "200+ people"]
  },
  {
    id: "budget",
    question: "What is your monthly budget range?",
    type: "options",
    allowOther: false,
    options: [
      "Under INR 15,000",
      "INR 15,000 - INR 30,000",
      "INR 30,000 - INR 60,000",
      "INR 60,000 - INR 1,00,000",
      "Above INR 1,00,000"
    ]
  },
  {
    id: "message",
    question: "Anything else you'd like us to know? (optional)",
    type: "text",
    placeholder: "Tell us about your specific requirement..."
  }
];

function ZeroChatMark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border border-white/30 bg-[#071426] shadow-[0_6px_18px_rgba(7,20,38,0.42)] ${
        compact ? "h-6 w-6" : "h-9 w-9"
      }`}
      aria-hidden
    >
      <svg
        viewBox="0 0 48 48"
        className={compact ? "h-3.5 w-3.5" : "h-5 w-5"}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10 12H38L14.5 24H38L12 36"
          stroke="#EEF6FF"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="38" cy="10" r="3" fill="#67D5EE" />
      </svg>
    </span>
  );
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function validateTextAnswer(stepId: string, value: string): string {
  const clean = value.trim();

  if (stepId === "name" && clean.length < 2) {
    return "Please enter your full name.";
  }

  if (stepId === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return "Please provide a valid email address.";
  }

  if (stepId === "phone" && clean.replace(/[^\d]/g, "").length < 7) {
    return "Please provide a valid phone number.";
  }

  return "";
}

function formatLeadTime(): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata"
  }).format(new Date());
}

function getNextUnansweredIndex(source: Record<string, string>): number {
  const nextIndex = CHAT_STEPS.findIndex((step) => !source[step.id]?.trim());
  return nextIndex === -1 ? CHAT_STEPS.length - 1 : nextIndex;
}

function sanitizeErrorMessage(message: string): string {
  const value = String(message || "").trim();
  if (!value) return "Submission failed. Please try again.";

  const lowered = value.toLowerCase();
  const captchaKeywords = [
    "captcha",
    "recaptcha",
    "verification failed",
    "verify",
    "robot",
    "human",
    "challenge",
    "token",
    "expired token"
  ];

  const isCaptchaError = captchaKeywords.some((keyword) => lowered.includes(keyword));
  if (isCaptchaError) {
    return getCaptchaErrorMessage("captcha_invalid");
  }

  return value;
}

function saveToStorage(source: Record<string, string>): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        name: source.name || "",
        email: source.email || "",
        phone: source.phone || "",
        businessType: source.businessType || ""
      })
    );
  } catch {
    // no-op
  }
}

export function LeadCaptureWidget() {
  const [open, setOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Array<{ role: ChatRole; text: string }>>([]);
  const [inputValue, setInputValue] = useState("");
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminWhatsAppLink, setAdminWhatsAppLink] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [awaitingCaptcha, setAwaitingCaptcha] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<Record<string, string> | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaStatusCode, setCaptchaStatusCode] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const otherInputRef = useRef<HTMLInputElement>(null);
  const recaptchaRef = useRef<RecaptchaCheckboxHandle | null>(null);

  const currentStep = useMemo(() => CHAT_STEPS[currentStepIndex], [currentStepIndex]);
  const recaptchaMode = getRecaptchaMode();

  const adminWhatsAppNumber =
    (process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ?? "918590464379").replace(/\D/g, "") || "918590464379";

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setMessages([{ role: "bot", text: CHAT_STEPS[0].question }]);
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, string>;
      const hydrated = {
        name: String(parsed.name ?? "").trim(),
        email: String(parsed.email ?? "").trim(),
        phone: String(parsed.phone ?? "").trim(),
        businessType: String(parsed.businessType ?? "").trim()
      };

      if (!hydrated.name) {
        setMessages([{ role: "bot", text: CHAT_STEPS[0].question }]);
        return;
      }

      setAnswers((prev) => ({ ...prev, ...hydrated }));
      setSavedAnswers(hydrated);
      setShowWelcomeBack(true);
      setMessages([
        {
          role: "bot",
          text: `Welcome back ${hydrated.name.split(" ")[0]}. Shall we pick up where we left off, or start fresh?`
        }
      ]);
    } catch {
      setMessages([{ role: "bot", text: CHAT_STEPS[0].question }]);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, showWelcomeBack]);

  useEffect(() => {
    if (showOtherInput) {
      setTimeout(() => otherInputRef.current?.focus(), 50);
    }
  }, [showOtherInput]);

  const resetCaptcha = () => {
    recaptchaRef.current?.reset();
    setCaptchaToken("");
    setCaptchaStatusCode("");
  };

  const handleFinalSubmit = async (finalAnswers: Record<string, string>, token: string) => {
    setIsTyping(true);
    setIsSubmitting(true);
    setCanRetry(false);
    try {
      const res = await fetch("/internal/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalAnswers.name,
          email: finalAnswers.email,
          phone: finalAnswers.phone,
          service: finalAnswers.service,
          teamSize: finalAnswers.teamSize,
          budget: finalAnswers.budget,
          businessType: finalAnswers.businessType,
          message: [
            finalAnswers.businessType ? `Business: ${finalAnswers.businessType}` : "",
            finalAnswers.budget ? `Budget: ${finalAnswers.budget}` : "",
            finalAnswers.message || ""
          ]
            .filter(Boolean)
            .join(" | "),
          recaptchaAction: "chatbot_submit",
          recaptchaToken: token
        })
      });

      const data = await res.json().catch(() => ({
        success: false,
        error: "Unexpected response from lead service."
      }));
      const isSuccess = res.ok && data?.fallback !== true && data?.success !== false;
      setIsTyping(false);

      if (isSuccess) {
        setAwaitingCaptcha(false);
        setPendingSubmission(null);
        setIsSubmitted(true);
        setCanRetry(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: `All done, ${finalAnswers.name?.split(" ")[0] || "there"}. We received your details and will reach out within 24 hours.`
          }
        ]);

        const adminMessage = [
          "*New Chatbot Lead - ZeroOps*",
          "-----------------------------",
          `Name: ${finalAnswers.name}`,
          `Email: ${finalAnswers.email}`,
          `Phone: ${finalAnswers.phone}`,
          `Business: ${finalAnswers.businessType || "Not specified"}`,
          `Service: ${finalAnswers.service || "Not specified"}`,
          `Team: ${finalAnswers.teamSize || "Not specified"}`,
          `Budget: ${finalAnswers.budget || "Not specified"}`,
          `Notes: ${finalAnswers.message || "None"}`,
          "-----------------------------",
          `Time: ${formatLeadTime()}`
        ].join("\n");

        setAdminWhatsAppLink(`https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(adminMessage)}`);

        await wait(1200);
        setMessages((prev) => [...prev, { role: "bot", text: "__WHATSAPP_CTA__" }]);
      } else {
        const captchaCode = extractCaptchaErrorCode(data);
        const errMsg = data?.error || data?.message || "Something went wrong. Please try again.";
        const safeMessage = captchaCode ? getCaptchaErrorMessage(captchaCode) : sanitizeErrorMessage(String(errMsg));
        resetCaptcha();
        setCanRetry(!captchaCode);
        setMessages((prev) => [...prev, { role: "bot", text: `❌ ${safeMessage}` }]);
      }
    } catch {
      resetCaptcha();
      setIsTyping(false);
      setCanRetry(true);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "❌ Network error. Please check your connection and try again."
        }
      ]);
    } finally {
      setIsTyping(false);
      setIsSubmitting(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    const step = CHAT_STEPS[currentStepIndex];
    if (!step || isSubmitted || isSubmitting) return;
    setCanRetry(false);

    const trimmed = answer.trim();
    const optionalMessage = step.id === "message";

    if (!trimmed && !optionalMessage) return;

    if (step.type === "text" || showOtherInput) {
      const validationError = validateTextAnswer(step.id, trimmed);
      if (validationError) {
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: `❌ ${sanitizeErrorMessage(validationError)}` }
        ]);
        return;
      }
    }

    const finalAnswer = trimmed || "No additional notes";

    const newAnswers = {
      ...answers,
      [step.id]: finalAnswer
    };
    setAnswers(newAnswers);
    saveToStorage(newAnswers);

    setInputValue("");
    setShowOtherInput(false);
    setMessages((prev) => [...prev, { role: "user", text: finalAnswer }]);

    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= CHAT_STEPS.length) {
      setIsTyping(true);
      await wait(1000);
      setIsTyping(false);
      setPendingSubmission(newAnswers);
      if (recaptchaMode === "checkbox") {
        setAwaitingCaptcha(true);
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: "Almost done. Complete the security check below, then send your request."
          }
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "bot", text: "Perfect. Processing your details now..." }]);
        try {
          const token = await executeRecaptchaAction("chatbot_submit");
          await handleFinalSubmit(newAnswers, token);
        } catch (error) {
          const code = error instanceof Error ? error.message : "captcha_unavailable";
          setMessages((prev) => [...prev, { role: "bot", text: `❌ ${getCaptchaErrorMessage(code)}` }]);
          setCanRetry(true);
        }
      }
      return;
    }

    setIsTyping(true);
    await wait(700);
    setIsTyping(false);

    let nextQuestion = CHAT_STEPS[nextIndex].question;
    if (newAnswers.name) {
      nextQuestion = nextQuestion.replace("{name}", newAnswers.name.split(" ")[0]);
    }

    setMessages((prev) => [...prev, { role: "bot", text: nextQuestion }]);
    setCurrentStepIndex(nextIndex);
  };

  const handleTextSubmit = () => {
    if (!currentStep) return;
    const value = inputValue.trim();

    if (!value && currentStep.id === "message") {
      void handleAnswer("");
      return;
    }

    if (!value) return;
    void handleAnswer(value);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    handleTextSubmit();
  };

  const continueFromSaved = () => {
    const merged = { ...answers, ...savedAnswers };
    setAnswers(merged);
    setShowWelcomeBack(false);
    setCanRetry(false);

    const nextIndex = getNextUnansweredIndex(merged);
    setCurrentStepIndex(nextIndex);

    let question = CHAT_STEPS[nextIndex].question;
    if (merged.name) {
      question = question.replace("{name}", merged.name.split(" ")[0]);
    }

    setMessages((prev) => [...prev, { role: "bot", text: question }]);
  };

  const startFresh = () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // no-op
    }

    setAnswers({});
    setSavedAnswers({});
    setCurrentStepIndex(0);
    setShowWelcomeBack(false);
    setShowOtherInput(false);
    setInputValue("");
    setIsSubmitted(false);
    setCanRetry(false);
    setRetryCount(0);
    setAwaitingCaptcha(false);
    setPendingSubmission(null);
    resetCaptcha();
    setMessages([{ role: "bot", text: CHAT_STEPS[0].question }]);
  };

  const handleCaptchaSubmit = async () => {
    if (!pendingSubmission || isSubmitting) return;

    if (recaptchaMode === "v3") {
      setMessages((prev) => [...prev, { role: "bot", text: "Perfect. Processing your details now..." }]);
      try {
        const token = await executeRecaptchaAction("chatbot_submit");
        await handleFinalSubmit(pendingSubmission, token);
      } catch (error) {
        const code = error instanceof Error ? error.message : "captcha_unavailable";
        setMessages((prev) => [...prev, { role: "bot", text: `❌ ${getCaptchaErrorMessage(code)}` }]);
        setCanRetry(true);
      }
      return;
    }

    if (!captchaToken) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: `❌ ${getCaptchaErrorMessage(captchaStatusCode || "captcha_required")}` }
      ]);
      return;
    }

    setMessages((prev) => [...prev, { role: "bot", text: "Perfect. Processing your details now..." }]);
    await handleFinalSubmit(pendingSubmission, captchaToken);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-5 right-5 z-[80] rounded-full h-14 w-14 border border-white/35 bg-[rgba(7,20,38,0.92)] text-white shadow-[0_12px_32px_rgba(7,20,38,0.35)] backdrop-blur-md hover:opacity-95 transition inline-flex items-center justify-center"
        aria-label={open ? "Close chat assistant" : "Open chat assistant"}
      >
        {open ? <X size={20} /> : <ZeroChatMark />}
      </button>

      {open ? (
        <section className="chatbot-widget fixed bottom-24 right-5 z-[80] w-[min(92vw,370px)] overflow-hidden rounded-[1.4rem] border border-white/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.8),rgba(255,255,255,0.58))] shadow-[0_24px_64px_rgba(8,23,38,0.24)] backdrop-blur-xl">
          <header className="px-4 py-3 flex items-center gap-2 border-b border-white/30 bg-[linear-gradient(120deg,rgba(7,20,38,0.92),rgba(7,20,38,0.82))]">
            <ZeroChatMark compact />
            <div>
              <p className="text-sm font-semibold text-white">ZERO AI Lead Assistant</p>
              <p className="text-[11px] text-white/80">Smart capture in under 1 minute</p>
            </div>
          </header>

          <div className="messages-scroll">
            {messages.map((msg, i) => (
              <div key={`${msg.role}-${i}`} className={`bubble-row ${msg.role}`}>
                {msg.role === "bot" ? (
                  msg.text === "__WHATSAPP_CTA__" ? (
                    <div className="bubble bot wa-cta">
                      <p>Also ping us on WhatsApp for faster response:</p>
                      <a
                        href={adminWhatsAppLink || `https://wa.me/${adminWhatsAppNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="wa-button"
                      >
                        Chat on WhatsApp
                      </a>
                    </div>
                  ) : (
                    <div className="bubble bot">{msg.text}</div>
                  )
                ) : (
                  <div className="bubble user">{msg.text}</div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="bubble-row bot">
                <div className="bubble bot typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {showWelcomeBack ? (
            <div className="input-area">
              <div className="options-wrapper">
                <div className="options-scroll-grid">
                  <button type="button" className="option-pill" onClick={continueFromSaved}>
                    Continue
                  </button>
                  <button type="button" className="option-pill" onClick={startFresh}>
                    Start Fresh
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {!isSubmitted && !isTyping && !showWelcomeBack && !awaitingCaptcha ? (
            <div className="input-area">
              {currentStep?.type === "options" && !showOtherInput ? (
                <div className="options-wrapper">
                  <div className="options-scroll-grid">
                    {currentStep.options?.map((opt, idx) => (
                      <button key={`${opt}-${idx}`} type="button" className="option-pill" onClick={() => void handleAnswer(opt)}>
                        {opt}
                      </button>
                    ))}
                  </div>

                  {currentStep.allowOther && !showOtherInput ? (
                    <div className="other-btn-row">
                      <button type="button" className="option-pill other" onClick={() => setShowOtherInput(true)}>
                        ✏️ Other - type your own
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : currentStep?.type === "options" && showOtherInput ? (
                <div className="options-wrapper">
                  <div className="other-input-row">
                    <button type="button" className="back-btn" onClick={() => setShowOtherInput(false)}>
                      ← back
                    </button>
                    <input
                      ref={otherInputRef}
                      type="text"
                      placeholder="Describe your business..."
                      value={inputValue}
                      onChange={(event) => setInputValue(event.target.value)}
                      onKeyDown={onInputKeyDown}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="send-pill-btn"
                      onClick={() => {
                        if (inputValue.trim()) {
                          void handleAnswer(inputValue.trim());
                        }
                      }}
                      disabled={!inputValue.trim()}
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-input-wrap">
                  <div className="text-input-row">
                    <input
                      ref={otherInputRef}
                      type="text"
                      value={inputValue}
                      onChange={(event) => setInputValue(event.target.value)}
                      onKeyDown={onInputKeyDown}
                      placeholder={currentStep?.placeholder || "Type here..."}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="send-btn"
                      onClick={handleTextSubmit}
                      disabled={currentStep?.id !== "message" && !inputValue.trim()}
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {recaptchaMode === "checkbox" && awaitingCaptcha && !isSubmitted && !isTyping ? (
            <div className="input-area captcha-panel">
              <div className="captcha-card">
                <p className="captcha-title">Security Check</p>
                <p className="captcha-copy">Complete the CAPTCHA before we send your request to the ZERO OPS team.</p>
                <div className="captcha-widget-wrap">
                  <RecaptchaCheckbox
                    ref={recaptchaRef}
                    theme="dark"
                    onTokenChange={(token) => {
                      setCaptchaToken(token);
                      setCanRetry(false);
                    }}
                    onStatusChange={(status) => {
                      setCaptchaStatusCode(status.code ?? "");
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="captcha-submit-btn"
                  onClick={() => void handleCaptchaSubmit()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Send Request"}
                </button>
              </div>
            </div>
          ) : null}

          {canRetry && !isSubmitted ? (
            <div className="retry-container">
              <p className="retry-text">
                Something went wrong. Your answers are saved.
                {retryCount > 0 ? ` Retry attempt: ${retryCount}.` : ""}
              </p>
              <button
                type="button"
                className="retry-btn"
                onClick={() => {
                  setCanRetry(false);
                  setRetryCount((prev) => prev + 1);
                  if (pendingSubmission) {
                    void handleCaptchaSubmit();
                  }
                }}
              >
                🔄 Try Again
              </button>
            </div>
          ) : null}

          <style jsx>{`
            .messages-scroll {
              padding: 12px 16px;
              height: 360px;
              overflow-y: auto;
              display: flex;
              flex-direction: column;
              gap: 10px;
            }

            .bubble-row {
              display: flex;
              width: 100%;
            }

            .bubble-row.user {
              justify-content: flex-end;
            }

            .bubble-row.bot {
              justify-content: flex-start;
            }

            .bubble {
              max-width: 88%;
              border-radius: 14px;
              padding: 10px 13px;
              font-size: 14px;
              line-height: 1.45;
              white-space: pre-wrap;
            }

            .bubble.bot {
              background: rgba(255, 255, 255, 0.8);
              border: 1px solid rgba(255, 255, 255, 0.5);
              color: #0f1a2a;
            }

            .bubble.user {
              background: rgba(7, 20, 38, 0.92);
              border: 1px solid rgba(255, 255, 255, 0.2);
              color: #ffffff;
            }

            .input-area {
              border-top: 1px solid rgba(255, 255, 255, 0.22);
              background: rgba(255, 255, 255, 0.42);
              backdrop-filter: blur(8px);
            }

            .options-wrapper {
              display: flex;
              flex-direction: column;
              gap: 0;
              border-top: 1px solid rgba(255, 255, 255, 0.06);
              background: #0a0a0f;
            }

            .options-scroll-grid {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              padding: 14px 14px 8px;
              max-height: 180px;
              overflow-y: auto;
              scrollbar-width: thin;
              scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
            }

            .other-btn-row {
              padding: 0 14px 14px;
              border-top: 1px dashed rgba(255, 255, 255, 0.06);
              padding-top: 8px;
            }

            .option-pill {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 8px 16px;
              background: #1a1f2e;
              border: 1px solid rgba(255, 255, 255, 0.12);
              border-radius: 999px;
              color: #f0ede8;
              font-size: 13px;
              font-family: inherit;
              cursor: pointer;
              transition: all 0.18s ease;
              white-space: nowrap;
              text-align: left;
            }

            .option-pill:hover {
              background: #252d40;
              border-color: rgba(0, 200, 150, 0.5);
              color: #ffffff;
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(0, 200, 150, 0.15);
            }

            .option-pill.other {
              width: 100%;
              justify-content: center;
              background: transparent;
              border: 1.5px dashed rgba(255, 255, 255, 0.2);
              color: rgba(255, 255, 255, 0.55);
              font-style: italic;
              font-size: 12px;
              padding: 9px 16px;
              border-radius: 999px;
              cursor: pointer;
              transition: all 0.2s;
              display: flex;
              align-items: center;
              gap: 6px;
            }

            .option-pill.other:hover {
              border-color: #00c896;
              color: #00c896;
              font-style: normal;
              background: rgba(0, 200, 150, 0.04);
            }

            .other-input-row {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 10px 14px 14px;
            }

            .other-input-row input {
              flex: 1;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(0, 200, 150, 0.3);
              border-radius: 999px;
              padding: 10px 16px;
              color: #fff;
              font-size: 13px;
              outline: none;
            }

            .other-input-row input:focus {
              border-color: #00c896;
              box-shadow: 0 0 0 3px rgba(0, 200, 150, 0.1);
            }

            .send-pill-btn {
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background: #00c896;
              color: #000;
              border: none;
              cursor: pointer;
              font-size: 14px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              transition: background 0.2s;
            }

            .send-pill-btn:disabled {
              background: rgba(255, 255, 255, 0.1);
              color: rgba(255, 255, 255, 0.3);
              cursor: not-allowed;
            }

            .back-btn {
              background: none;
              border: none;
              color: rgba(255, 255, 255, 0.35);
              font-size: 11px;
              cursor: pointer;
              padding: 0;
              white-space: nowrap;
              flex-shrink: 0;
            }

            .back-btn:hover {
              color: #00c896;
            }

            .text-input-wrap {
              padding: 10px 12px 12px;
            }

            .text-input-row {
              display: flex;
              gap: 10px;
            }

            .text-input-row input {
              flex: 1;
              border-radius: 12px;
              border: 1px solid rgba(7, 20, 38, 0.2);
              background: rgba(255, 255, 255, 0.82);
              color: #0f1a2a;
              padding: 10px 12px;
              font-size: 15px;
              outline: none;
            }

            .text-input-row input::placeholder {
              color: #5c6f8c;
            }

            .text-input-row input:focus {
              border-color: rgba(0, 200, 150, 0.5);
              box-shadow: 0 0 0 3px rgba(0, 200, 150, 0.14);
            }

            .send-btn {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 40px;
              height: 40px;
              border-radius: 12px;
              border: 1px solid rgba(255, 255, 255, 0.3);
              background: rgba(7, 20, 38, 0.9);
              color: #ffffff;
              cursor: pointer;
            }

            .send-btn:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }

            .bubble.typing {
              display: flex;
              gap: 5px;
              align-items: center;
              padding: 14px 18px;
            }

            .bubble.typing span {
              width: 7px;
              height: 7px;
              background: rgba(255, 255, 255, 0.4);
              border-radius: 50%;
              animation: typingDot 1.2s infinite;
            }

            .bubble.typing span:nth-child(2) {
              animation-delay: 0.2s;
            }

            .bubble.typing span:nth-child(3) {
              animation-delay: 0.4s;
            }

            @keyframes typingDot {
              0%,
              60%,
              100% {
                transform: translateY(0);
                opacity: 0.4;
              }
              30% {
                transform: translateY(-5px);
                opacity: 1;
              }
            }

            .bubble.wa-cta {
              display: flex;
              flex-direction: column;
              gap: 10px;
            }

            .wa-button {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              background: #25d366;
              color: #ffffff;
              font-weight: 600;
              font-size: 13px;
              padding: 10px 20px;
              border-radius: 8px;
              text-decoration: none;
              transition: background 0.2s;
              width: fit-content;
            }

            .wa-button:hover {
              background: #1ebe5d;
            }

            .retry-container {
              padding: 16px;
              border-top: 1px solid rgba(255, 255, 255, 0.06);
              text-align: center;
            }

            .captcha-panel {
              padding: 12px;
            }

            .captcha-card {
              border-radius: 16px;
              border: 1px solid rgba(255, 255, 255, 0.12);
              background: rgba(7, 20, 38, 0.96);
              padding: 14px;
            }

            .captcha-title {
              font-size: 13px;
              font-weight: 700;
              color: #ffffff;
            }

            .captcha-copy {
              margin-top: 4px;
              font-size: 12px;
              line-height: 1.5;
              color: rgba(255, 255, 255, 0.72);
            }

            .captcha-widget-wrap {
              margin-top: 12px;
              overflow-x: auto;
            }

            .captcha-submit-btn {
              margin-top: 12px;
              width: 100%;
              border-radius: 12px;
              border: 1px solid rgba(0, 200, 150, 0.24);
              background: #00c896;
              color: #031016;
              font-size: 13px;
              font-weight: 700;
              padding: 11px 14px;
              cursor: pointer;
              transition: transform 0.18s ease, opacity 0.18s ease;
            }

            .captcha-submit-btn:disabled {
              cursor: not-allowed;
              opacity: 0.6;
            }

            .retry-text {
              font-size: 12px;
              color: rgba(255, 255, 255, 0.5);
              margin-bottom: 10px;
            }

            .retry-btn {
              background: rgba(0, 200, 150, 0.15);
              border: 1px solid rgba(0, 200, 150, 0.3);
              color: #00c896;
              padding: 10px 24px;
              border-radius: 999px;
              font-size: 13px;
              cursor: pointer;
              transition: all 0.2s;
              font-family: inherit;
            }

            .retry-btn:hover {
              background: rgba(0, 200, 150, 0.25);
              border-color: #00c896;
            }
          `}</style>
        </section>
      ) : null}
    </>
  );
}
