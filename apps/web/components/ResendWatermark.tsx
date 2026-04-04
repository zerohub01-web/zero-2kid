"use client";

export function ResendWatermark() {
  return (
    <a
      href="https://resend.com"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="In partnership with Resend"
      className="fixed left-4 bottom-4 z-[70] inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-2 text-[11px] text-[var(--muted)] backdrop-blur-md shadow-[0_8px_24px_rgba(8,23,38,0.12)] transition hover:bg-white/90 hover:text-[var(--ink)]"
    >
      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#00c896] shadow-[0_0_8px_rgba(0,200,150,0.6)]" aria-hidden />
      <span className="uppercase tracking-[0.12em]">In Partnership with</span>
      <span className="inline-flex items-center justify-center rounded-md border border-black/10 bg-black/5 px-2 py-0.5 font-mono font-extrabold text-[11px] leading-none text-[var(--ink)]">
        resend
      </span>
    </a>
  );
}

