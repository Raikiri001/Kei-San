interface EyeDropperOpenResult {
  sRGBHex: string;
}

interface EyeDropper {
  open(options?: { signal?: AbortSignal }): Promise<EyeDropperOpenResult>;
}

interface EyeDropperConstructor {
  new (): EyeDropper;
}

interface Window {
  EyeDropper?: EyeDropperConstructor;
}
