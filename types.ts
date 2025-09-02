
export interface Zone {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  colorName: string;
  colorHex: string;
  isProcessing: boolean;
}

export interface ColorResponse {
  colorName: string;
  hexCode: string;
}
