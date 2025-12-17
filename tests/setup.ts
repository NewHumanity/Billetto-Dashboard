
import '@testing-library/jest-dom';
import React from 'react';

// Mock ResizeObserver for Recharts
// @ts-ignore
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Worker for tests
// @ts-ignore
globalThis.Worker = class Worker {
  constructor(stringUrl: string | URL, options?: WorkerOptions) {}
  postMessage(message: any, transfer: Transferable[]) {}
  onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null;
  onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null = null;
  terminate() {}
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {}
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) {}
  dispatchEvent(event: Event): boolean { return true; }
  onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null = null;
} as any;
