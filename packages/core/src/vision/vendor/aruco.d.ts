// Types for the vendored js-aruco2 detector (only what we use).
export type Corner = { x: number; y: number };
export type ArMarker = { id: number; corners: Corner[]; hammingDistance: number };
export type ArImage = { width: number; height: number; data: Uint8ClampedArray | Uint8Array };

export declare const AR: {
  Detector: new (config?: { dictionaryName?: string; maxHammingDistance?: number }) => {
    detect(image: ArImage): ArMarker[];
  };
  Dictionary: new (name: string) => {
    codeList: string[];
    markSize: number;
    nBits: number;
    generateSVG(id: number): string;
  };
};
