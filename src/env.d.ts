/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
declare global {
    var __LATEST_FLIGHTS__: {
      receivedAt: number;
      data: any;
    } | undefined;
  }
  
  export {};