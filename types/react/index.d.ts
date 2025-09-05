declare const React: any;
export default React;
export const useState: any;
export const useEffect: any;
export const useMemo: any;
export const useRef: any;
export const Fragment: any;
export interface FC<P = {}> {
  (props: P & { children?: any }): any;
}
export type ReactNode = any;
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elem: string]: any;
    }
  }
}
