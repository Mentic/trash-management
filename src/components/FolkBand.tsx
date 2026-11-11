// Bandă cu motiv tradițional (romburi și cruciulițe, ca la cusăturile de ie), în culoarea primăriei / ADI.
// Decorativă: aria-hidden; înălțime mică, ca să nu încarce interfața.
export function FolkBand({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={`block h-[10px] w-full text-[var(--accent)] ${className}`} preserveAspectRatio="none">
      <defs>
        <pattern id="ie" width="28" height="10" patternUnits="userSpaceOnUse">
          <path d="M7 0 L12 5 L7 10 L2 5 Z" fill="currentColor" />
          <path d="M21 1.5 L24.5 5 L21 8.5 L17.5 5 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <rect x="20.2" y="4.2" width="1.6" height="1.6" fill="currentColor" />
          <rect x="13.4" y="4.3" width="1.4" height="1.4" fill="currentColor" opacity=".55" />
          <rect x="26.6" y="4.3" width="1.4" height="1.4" fill="currentColor" opacity=".55" />
        </pattern>
      </defs>
      <rect width="100%" height="10" fill="url(#ie)" />
    </svg>
  );
}
