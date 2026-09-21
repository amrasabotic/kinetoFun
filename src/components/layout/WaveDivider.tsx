/** Soft SVG wave that bleeds one section's bottom into the next section's color. */
export function WaveDivider({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] leading-[0]" aria-hidden>
      <svg className="block h-[44px] w-full sm:h-[72px]" viewBox="0 0 1440 72" preserveAspectRatio="none">
        <path
          fill={color}
          d="M0,34 C160,72 320,72 480,48 C680,18 760,6 960,30 C1120,49 1280,66 1440,38 L1440,72 L0,72 Z"
        />
      </svg>
    </div>
  );
}
