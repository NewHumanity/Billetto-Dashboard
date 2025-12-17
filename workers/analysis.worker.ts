import * as Comlink from 'comlink';
import { analyzeAudience, analyzePerformance } from '../utils/analysisLogic';

const exports = {
    analyzeAudience,
    analyzePerformance
};

export type AnalysisWorkerApi = typeof exports;

// Only expose if in a worker context to avoid issues during main thread imports/tests
if (typeof self !== 'undefined' && typeof self.importScripts === 'function' || (typeof self !== 'undefined' && self.constructor.name === 'DedicatedWorkerGlobalScope')) {
    Comlink.expose(exports);
}

// Default export to prevent "does not provide an export named 'default'" errors
// when the file is imported as a standard module (e.g. in tests or if ?worker plugin fails).
export default {} as any;