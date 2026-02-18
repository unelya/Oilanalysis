type TFn = (key: string, vars?: Record<string, string | number>) => string;

export function getMethodLabel(name: string, t: TFn): string {
  const normalized = (name || "").trim().toLowerCase();
  const keyByName: Record<string, string> = {
    sara: "methods.sara",
    ir: "methods.ir",
    "mass spectrometry": "methods.mass_spectrometry",
    viscosity: "methods.viscosity",
    electrophoresis: "methods.electrophoresis",
    nmr: "methods.nmr",
  };
  const key = keyByName[normalized];
  return key ? t(key) : name;
}

export function getMethodLabelShort(name: string, t: TFn): string {
  const normalized = (name || "").trim().toLowerCase();
  const keyByName: Record<string, string> = {
    sara: "methodsShort.sara",
    ir: "methodsShort.ir",
    "mass spectrometry": "methodsShort.mass_spectrometry",
    viscosity: "methodsShort.viscosity",
    electrophoresis: "methodsShort.electrophoresis",
    nmr: "methodsShort.nmr",
  };
  const key = keyByName[normalized];
  return key ? t(key) : name;
}
