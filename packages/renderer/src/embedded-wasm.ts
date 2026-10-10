import zlib from "node:zlib";

let wasm: any = null;
let initialized = false;
let initPromise: Promise<void> | null = null;

const heap = new Array(128).fill(void 0);
heap.push(void 0, null, true, false);
let heap_next = heap.length;

function addHeapObject(obj: any): number {
  if (heap_next === heap.length) heap.push(heap.length + 1);
  const idx = heap_next;
  heap_next = heap[idx];
  heap[idx] = obj;
  return idx;
}

function getObject(idx: number): any {
  return heap[idx];
}

function dropObject(idx: number): void {
  if (idx < 132) return;
  heap[idx] = heap_next;
  heap_next = idx;
}

function takeObject(idx: number): any {
  const ret = getObject(idx);
  dropObject(idx);
  return ret;
}

let WASM_VECTOR_LEN = 0;
let cachedUint8Memory0: Uint8Array | null = null;

function getUint8Memory0(): Uint8Array {
  if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
    cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8Memory0;
}

const cachedTextEncoder = new TextEncoder();

function passStringToWasm0(arg: string, malloc: any, _realloc?: any): number {
  const buf = cachedTextEncoder.encode(arg);
  const ptr = malloc(buf.length);
  getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
  WASM_VECTOR_LEN = buf.length;
  return ptr;
}

let cachedInt32Memory0: Int32Array | null = null;

function getInt32Memory0(): Int32Array {
  if (cachedInt32Memory0 === null || cachedInt32Memory0.byteLength === 0) {
    cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
  }
  return cachedInt32Memory0;
}

const cachedTextDecoder = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });

function getStringFromWasm0(ptr: number, len: number): string {
  return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

export class RenderedImage {
  private ptr: number;

  constructor(ptr: number) {
    this.ptr = ptr;
  }

  static __wrap(ptr: number): RenderedImage {
    return new RenderedImage(ptr);
  }

  free(): void {
    const ptr = this.ptr;
    this.ptr = 0;
    wasm.__wbg_renderedimage_free(ptr);
  }

  get width(): number {
    return wasm.renderedimage_width(this.ptr) >>> 0;
  }

  get height(): number {
    return wasm.renderedimage_height(this.ptr) >>> 0;
  }

  asPng(): Buffer {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.renderedimage_asPng(retptr, this.ptr);
      const r0 = getInt32Memory0()[retptr / 4 + 0];
      const r1 = getInt32Memory0()[retptr / 4 + 1];
      const r2 = getInt32Memory0()[retptr / 4 + 2];
      if (r2) throw takeObject(r1!);

      const uint8 = takeObject(r0!) as Uint8Array;
      return Buffer.from(uint8);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
}

export class EmbeddedResvg {
  private ptr: number;

  constructor(svg: string, options?: any) {
    if (!initialized) {
      throw new Error("EmbeddedResvg WASM engine has not been initialized. Call initEmbeddedResvg() first.");
    }
    const optStr = options ? JSON.stringify(options) : undefined;
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = optStr ? passStringToWasm0(optStr, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc) : 0;
      const len0 = WASM_VECTOR_LEN;
      wasm.resvg_new(retptr, addHeapObject(svg), ptr0, len0);
      const r0 = getInt32Memory0()[retptr / 4 + 0];
      const r1 = getInt32Memory0()[retptr / 4 + 1];
      const r2 = getInt32Memory0()[retptr / 4 + 2];
      if (r2) throw takeObject(r1!);

      this.ptr = r0!;
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }

  free(): void {
    const ptr = this.ptr;
    this.ptr = 0;
    wasm.__wbg_resvg_free(ptr);
  }

  render(): RenderedImage {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm.resvg_render(retptr, this.ptr);
      const r0 = getInt32Memory0()[retptr / 4 + 0];
      const r1 = getInt32Memory0()[retptr / 4 + 1];
      const r2 = getInt32Memory0()[retptr / 4 + 2];
      if (r2) throw takeObject(r1!);

      return RenderedImage.__wrap(r0!);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
}

export async function initEmbeddedResvg(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { RESVG_WASM_GZIP_BASE64 } = await import("./wasm-data.js");
    const compressed = Buffer.from(RESVG_WASM_GZIP_BASE64, "base64");
    const wasmBytes = zlib.gunzipSync(compressed);

    const imports: any = {
      wbg: {
        __wbg_new_15d3966e9981a196: (arg0: number, arg1: number) => addHeapObject(new Error(getStringFromWasm0(arg0, arg1))),
        __wbindgen_memory: () => addHeapObject(wasm.memory),
        __wbg_buffer_cf65c07de34b9a08: (arg0: number) => addHeapObject(getObject(arg0).buffer),
        __wbg_newwithbyteoffsetandlength_9fb2f11355ecadf5: (arg0: number, arg1: number, arg2: number) =>
          addHeapObject(new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0)),
        __wbindgen_object_drop_ref: (arg0: number) => { takeObject(arg0); },
        __wbg_new_537b7341ce90bb31: (arg0: number) => addHeapObject(new Uint8Array(getObject(arg0))),
        __wbg_instanceof_Uint8Array_01cebe79ca606cca: (arg0: number) => getObject(arg0) instanceof Uint8Array,
        __wbindgen_string_get: (arg0: number, arg1: number) => {
          const obj = getObject(arg1);
          const ret = typeof obj === "string" ? obj : void 0;
          const ptr0 = ret ? passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc) : 0;
          getInt32Memory0()[arg0 / 4 + 1] = WASM_VECTOR_LEN;
          getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        },
        __wbg_new_b525de17f44a8943: () => addHeapObject([]),
        __wbindgen_string_new: (arg0: number, arg1: number) => addHeapObject(getStringFromWasm0(arg0, arg1)),
        __wbg_push_49c286f04dd3bf59: (arg0: number, arg1: number) => getObject(arg0).push(getObject(arg1)),
        __wbg_length_27a2afe8ab42b09f: (arg0: number) => getObject(arg0).length,
        __wbg_set_17499e8aa4003ebd: (arg0: number, arg1: number, arg2: number) => {
          getObject(arg0).set(getObject(arg1), arg2 >>> 0);
        },
        __wbindgen_throw: (arg0: number, arg1: number) => {
          throw new Error(getStringFromWasm0(arg0, arg1));
        },
      },
    };

    const compiled = await WebAssembly.instantiate(wasmBytes, imports);
    wasm = compiled.instance.exports;
    cachedUint8Memory0 = null;
    cachedInt32Memory0 = null;
    initialized = true;
  })();

  return initPromise;
}
