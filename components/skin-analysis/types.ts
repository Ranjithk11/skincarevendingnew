export type SkinConcernCode =
  | "F"
  | "DS"
  | "A"
  | "C"
  | "W"
  | "OP"
  | "R"
  | "DL"
  | "EB"
  | "DC"
  | "ST"
  | "P"
  | "SB"
  | "SP"
  | "UT"
  | "M"
  | "PA"
  | "ML";

export type Point2D = { x: number; y: number };

export type RegionStats = {
  lum: number;
  sd: number;
  red: number;
  dark: number;
  bright: number;
  r: number;
  g: number;
  b: number;
};

export type SkinConcernScore = {
  code: SkinConcernCode;
  name: string;
  value: number;
  level: string;
  color: string;
};

export type SkinAnalysisResult = {
  scores: SkinConcernScore[];
  topConcerns: SkinConcernScore[];
  values: Record<string, number>;
  analyzedAt: string;
};

export type SkinScanDisplayOptions = {
  showLabels: boolean;
  showHotspots: boolean;
  showMesh: boolean;
  showZones: boolean;
};

export type SkinScanStatus = "idle" | "loading-model" | "scanning" | "ready" | "no-face" | "error";
