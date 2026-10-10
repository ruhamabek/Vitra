export function parse(buffer: ArrayBuffer): any;
export function load(url: string, callback: (err: any, font: any) => void): void;
declare const opentype: {
  parse(buffer: ArrayBuffer): any;
  load(url: string, callback: (err: any, font: any) => void): void;
  default: any;
};
export default opentype;
