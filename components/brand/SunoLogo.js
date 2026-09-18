import Link from "next/link";

export default function SunoLogo({
  href = "/",
  showWordmark = true,
  size = "md",
}) {
  const sizes = {
    sm: {
      icon: "h-8 w-8",
      text: "text-lg",
      iconInner: "h-4 w-4",
    },
    md: {
      icon: "h-10 w-10",
      text: "text-xl",
      iconInner: "h-5 w-5",
    },
    lg: {
      icon: "h-12 w-12",
      text: "text-2xl",
      iconInner: "h-6 w-6",
    },
  };

  const current = sizes[size] ?? sizes.md;

  return (
    <Link
      href={href}
      aria-label="Suno home"
      className="group inline-flex items-center gap-3"
    >
      <span
        className={`relative grid ${current.icon} place-items-center overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.07] shadow-[0_0_30px_rgba(139,92,246,0.18)] backdrop-blur-xl`}
      >
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.24),transparent_35%),linear-gradient(135deg,rgba(124,58,237,0.95),rgba(236,72,153,0.88))]" />

        <svg
          viewBox="0 0 32 32"
          className={`relative z-10 ${current.iconInner} text-white transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110`}
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M6 17.5C9.2 17.5 9.2 11 12.5 11C15.8 11 15.8 21 19 21C22.3 21 22.3 14.5 26 14.5"
            stroke="currentColor"
            strokeWidth="2.7"
            strokeLinecap="round"
          />
          <path
            d="M6 22C9.1 22 9.1 17.5 12.4 17.5C15.7 17.5 15.7 26 19 26C22.2 26 22.2 20 26 20"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.45"
          />
        </svg>
      </span>

      {showWordmark && (
        <span
          className={`${current.text} font-semibold tracking-[-0.04em] text-white`}
        >
          Suno
        </span>
      )}
    </Link>
  );
}