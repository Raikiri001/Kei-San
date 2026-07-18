/** The browser-native EyeDropper API (Chrome/Edge; not yet in Firefox/Safari) —
 * lets the user sample any on-screen pixel, not just ones inside this app's own
 * canvas, so it's a straightforward feature-detected wrapper rather than a
 * hand-rolled screen-capture/pixel-sampling implementation. */
export function isEyeDropperSupported(): boolean {
  return typeof window !== "undefined" && "EyeDropper" in window;
}

/** Opens the native eyedropper and resolves the picked color as a #rrggbb hex
 * string, or null if the API is unsupported or the user cancelled (Escape). */
export async function pickColorWithEyeDropper(): Promise<string | null> {
  if (!isEyeDropperSupported()) return null;
  try {
    const eyeDropper = new window.EyeDropper();
    const result = await eyeDropper.open();
    return result.sRGBHex;
  } catch {
    return null;
  }
}
