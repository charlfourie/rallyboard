export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Black or white, whichever reads better on the given background colour. */
export function contrastText(hex: string): string {
  if (!HEX_COLOR.test(hex)) return "#ffffff";
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return luminance > 0.4 ? "#0b0b10" : "#ffffff";
}
