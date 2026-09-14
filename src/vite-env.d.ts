/** Vite asset-URL imports (binary world data). */
declare module "*?url" {
  const src: string;
  export default src;
}

/** Minimal Vite env typing (full vite/client reference would duplicate *?url). */
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
