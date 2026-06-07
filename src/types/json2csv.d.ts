declare module 'json2csv' {
  export class Parser<T = Record<string, unknown>> {
    constructor(options?: { fields?: string[] });
    parse(data: T[]): string;
  }
}
