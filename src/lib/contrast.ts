/** WCAG 2 contrast, for the colour notes on the brand page and for choosing ink on an accent. */

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match?.[1]) throw new RangeError(`Expected a colour like #1F1410, received ${hex}.`);
  const value = Number.parseInt(match[1], 16);
  const [red, green, blue] = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(
    channel,
  ) as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrast(first: string, second: string): number {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

/** Whichever ink reads better on the background. */
export function bestInk(background: string, light: string, dark: string): string {
  return contrast(background, light) >= contrast(background, dark) ? light : dark;
}
