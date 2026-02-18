type TFn = (key: string, vars?: Record<string, string | number>) => string;

export function getMethodLabel(name: string, t: TFn): string {
  const normalized = (name || "").trim().toLowerCase();
  const keyByName: Record<string, string> = {
    sara: "methods.sara",
    ir: "methods.ir",
    "mass spectrometry": "methods.mass_spectrometry",
    viscosity: "methods.viscosity",
    nmr: "methods.nmr",
  };
  const key = keyByName[normalized];
  return key ? t(key) : name;
}
