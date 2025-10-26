declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var process: any;
}
declare module 'fs' {}
declare module 'path' {}
declare module 'assert' {
  type AssertFunction = (value: unknown, message?: string) => asserts value;
  interface AssertModule {
    (value: unknown, message?: string): asserts value;
    ok: AssertFunction;
    strictEqual<T>(actual: T, expected: T, message?: string): void;
  }
  const assert: AssertModule;
  export = assert;
}
export {};
