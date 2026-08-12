// Hand-vectorized from the club's logo (ellipse + paddle + stylized "R" leg, in
// white line art, with the canoe kept solid red) — no source vector file exists
// to import, so the paths are inlined here rather than referencing an asset.
export function OrccLogo({ className }) {
  return (
    <svg viewBox="0 0 300 340" className={className} xmlns="http://www.w3.org/2000/svg" aria-label="ORCC">
      <line x1="150" y1="6" x2="150" y2="334" stroke="currentColor" strokeWidth="11" strokeLinecap="round" />
      <ellipse cx="150" cy="14" rx="10" ry="22" fill="currentColor" />
      <ellipse cx="150" cy="326" rx="10" ry="22" fill="currentColor" />
      <path
        d="M 232 193 C 268 210, 288 246, 278 280 C 273 300, 278 316, 302 314"
        fill="none"
        stroke="currentColor"
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="150" cy="160" rx="120" ry="58" fill="none" stroke="currentColor" strokeWidth="15" transform="rotate(-22 150 160)" />
      <ellipse cx="150" cy="160" rx="98" ry="24" fill="#eb3c12" transform="rotate(-22 150 160)" />
      <ellipse cx="95" cy="160" rx="15" ry="8" fill="currentColor" transform="rotate(-22 150 160)" />
    </svg>
  )
}
