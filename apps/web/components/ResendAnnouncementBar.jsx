"use client";

export default function ResendAnnouncementBar() {
  return (
    <>
      <a
        href="https://resend.com"
        target="_blank"
        rel="noopener noreferrer"
        className="resend-announcement-bar"
        aria-label="Email Automation powered by Resend. Learn more."
      >
        <div className="resend-announcement-content">
          <span className="resend-dot" aria-hidden />

          <span className="resend-pill" aria-hidden>
            resend
          </span>

          <span className="resend-desktop-copy">
            <span className="resend-copy-muted">Email Automation powered by </span>
            <strong className="resend-copy-strong">Resend</strong>
            <span className="resend-copy-muted"> {" "}{"\u2192"} Learn more</span>
          </span>

          <span className="resend-mobile-copy">
            <span className="resend-copy-muted">Powered by </span>
            <strong className="resend-copy-strong">Resend</strong>
            <span className="resend-copy-muted"> {"\u2192"}</span>
          </span>
        </div>
      </a>

      <style jsx>{`
        .resend-announcement-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          background: linear-gradient(90deg, #000000, #001a12, #000000);
          background-size: 200% auto;
          animation: shimmer 4s linear infinite;
          transition: background 0.3s ease;
          letter-spacing: 0.03em;
        }

        .resend-announcement-bar:hover {
          background: linear-gradient(
            90deg,
            rgba(0, 0, 0, 0.98),
            rgba(0, 26, 18, 0.98),
            rgba(0, 0, 0, 0.98)
          );
          box-shadow: inset 0 0 0 999px rgba(0, 200, 150, 0.06);
        }

        .resend-announcement-content {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          white-space: nowrap;
          font-size: 12px;
          line-height: 1;
        }

        .resend-dot {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: #00c896;
          box-shadow: 0 0 6px #00c896, 0 0 12px rgba(0, 200, 150, 0.4);
          animation: pulse 2s infinite;
        }

        .resend-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 2px 10px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          font-family: monospace;
          font-weight: 800;
          font-size: 13px;
          letter-spacing: -0.5px;
        }

        .resend-copy-muted {
          color: rgba(255, 255, 255, 0.7);
        }

        .resend-copy-strong {
          color: #ffffff;
          font-weight: 600;
        }

        .resend-mobile-copy {
          display: none;
        }

        @media (max-width: 639px) {
          .resend-desktop-copy {
            display: none;
          }

          .resend-mobile-copy {
            display: inline-flex;
            align-items: center;
            gap: 2px;
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.85);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }
      `}</style>
    </>
  );
}
