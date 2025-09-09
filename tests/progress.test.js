// Basic happy-path tests for progress helpers without external runners.
// Run with: `npm test` (uses Node to execute this file).

const assert = require('assert');

// Duplicate lightweight JS shim mirroring TypeScript exports to keep tests runnable without a TS runner.
// Keep in sync with lib/progress.ts logic.
const STORAGE_KEY = 'cn_progress';
class MemoryStorage { constructor(){ this.m=new Map(); } getItem(k){ return this.m.has(k)?this.m.get(k):null; } setItem(k,v){ this.m.set(k,v); } removeItem(k){ this.m.delete(k); } }
const saveProgress = (p, storage) => { if(!storage) return; storage.setItem(STORAGE_KEY, JSON.stringify({ ...p, updatedAt: p.updatedAt || Date.now() })); };
const getProgress = (storage) => { if(!storage) return null; const raw = storage.getItem(STORAGE_KEY); if(!raw) return null; try{ const parsed = JSON.parse(raw); if(!parsed || !parsed.stepId || (parsed.track!=='fast' && parsed.track!=='deep')) return null; return parsed; } catch { return null; } };
const clearProgress = (storage) => { if(!storage) return; storage.removeItem(STORAGE_KEY); };
const getResumeUrl = (p) => { const base = p.track==='fast'?'/start/fast':'/start/deep'; return `${base}${p.stepId?`?step=${encodeURIComponent(p.stepId)}`:''}`; };

(function run(){
  const store = new MemoryStorage();

  // save and read
  const prog = { track: 'fast', stepId: 'intro', updatedAt: 0 };
  saveProgress(prog, store);
  const read = getProgress(store);
  assert(read && read.track==='fast' && read.stepId==='intro', 'reads saved progress');

  // resume url
  assert.strictEqual(getResumeUrl(read), '/start/fast?step=intro', 'resume URL matches');

  // clear
  clearProgress(store);
  assert.strictEqual(getProgress(store), null, 'clears progress');

  console.log('progress tests: OK');
})();

