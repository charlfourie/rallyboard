/** The game's logo, or its first letter on the accent colour when there's no logo. */
export function GameMark({
  name,
  logoUrl,
  size = 32,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-lg object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-lg bg-accent font-bold text-accent-contrast"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {name.trim().slice(0, 1).toUpperCase() || "R"}
    </span>
  );
}
