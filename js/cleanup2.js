// ═══════════════════════════════════════════════════════════
// js/cleanup2.js — QUẢN LÝ TÀI NGUYÊN (PHẦN 2) - Cleanup functions
// ═══════════════════════════════════════════════════════════

import { resourceRegistry } from './cleanup.js';

export function registerWorker(key, worker) {
  if (resourceRegistry.workers.has(key)) {
    try { resourceRegistry.workers.get(key).terminate(); } catch (e) {}
  }
  resourceRegistry.workers.set(key, worker);
}

export function registerAbortController(key, controller) {
  if (resourceRegistry.abortControllers.has(key)) {
    try { resourceRegistry.abortControllers.get(key).abort(); } catch (e) {}
  }
  resourceRegistry.abortControllers.set(key, controller);
}

export function cleanupAll() {
  resourceRegistry.charts.forEach((chart, key) => {
    try { chart.destroy(); } catch (e) { console.warn(`[Cleanup] Error destroying chart "${key}":`, e); }
  });
  resourceRegistry.charts.clear();
  
  resourceRegistry.eventListeners.forEach((entry, key) => {
    try { entry.element.removeEventListener(entry.event, entry.handler, entry.options); } catch (e) {}
  });
  resourceRegistry.eventListeners.clear();
  
  resourceRegistry.intervals.forEach((id) => clearInterval(id));
  resourceRegistry.intervals.clear();
  
  resourceRegistry.timeouts.forEach((id) => clearTimeout(id));
  resourceRegistry.timeouts.clear();
  
  resourceRegistry.resizeObservers.forEach((obs) => obs.disconnect());
  resourceRegistry.resizeObservers.clear();
  
  resourceRegistry.mutationObservers.forEach((obs) => obs.disconnect());
  resourceRegistry.mutationObservers.clear();
  
  resourceRegistry.intersectionObservers.forEach((obs) => obs.disconnect());
  resourceRegistry.intersectionObservers.clear();
  
  resourceRegistry.virtualScrolls.forEach((instance) => {
    try { instance.destroy(); } catch (e) {}
  });
  resourceRegistry.virtualScrolls.clear();
  
  resourceRegistry.workers.forEach((worker) => {
    try { worker.terminate(); } catch (e) {}
  });
  resourceRegistry.workers.clear();
  
  resourceRegistry.abortControllers.forEach((controller) => {
    try { controller.abort(); } catch (e) {}
  });
  resourceRegistry.abortControllers.clear();
  
  console.log('[Cleanup] All resources cleaned up');
}

export function cleanupByPrefix(prefix) {
  let count = 0;
  
  resourceRegistry.charts.forEach((chart, key) => {
    if (key.startsWith(prefix)) { try { chart.destroy(); } catch (e) {}; resourceRegistry.charts.delete(key); count++; }
  });
  
  resourceRegistry.eventListeners.forEach((entry, key) => {
    if (key.startsWith(prefix)) { try { entry.element.removeEventListener(entry.event, entry.handler, entry.options); } catch (e) {}; resourceRegistry.eventListeners.delete(key); count++; }
  });
  
  resourceRegistry.intervals.forEach((id, key) => {
    if (key.startsWith(prefix)) { clearInterval(id); resourceRegistry.intervals.delete(key); count++; }
  });
  
  resourceRegistry.timeouts.forEach((id, key) => {
    if (key.startsWith(prefix)) { clearTimeout(id); resourceRegistry.timeouts.delete(key); count++; }
  });
  
  ['resizeObservers', 'mutationObservers', 'intersectionObservers'].forEach(type => {
    resourceRegistry[type].forEach((obs, key) => {
      if (key.startsWith(prefix)) { obs.disconnect(); resourceRegistry[type].delete(key); count++; }
    });
  });
  
  resourceRegistry.virtualScrolls.forEach((instance, key) => {
    if (key.startsWith(prefix)) { try { instance.destroy(); } catch (e) {}; resourceRegistry.virtualScrolls.delete(key); count++; }
  });
  
  resourceRegistry.workers.forEach((worker, key) => {
    if (key.startsWith(prefix)) { try { worker.terminate(); } catch (e) {}; resourceRegistry.workers.delete(key); count++; }
  });
  
  resourceRegistry.abortControllers.forEach((controller, key) => {
    if (key.startsWith(prefix)) { try { controller.abort(); } catch (e) {}; resourceRegistry.abortControllers.delete(key); count++; }
  });
  
  if (count > 0) console.log(`[Cleanup] Cleaned up ${count} resources with prefix "${prefix}"`);
  return count;
}

export function safeSetInterval(key, callback, delay) {
  const id = setInterval(callback, delay);
  registerInterval(key, id);
  return id;
}

export function safeSetTimeout(key, callback, delay) {
  const id = setTimeout(() => { resourceRegistry.timeouts.delete(key); callback(); }, delay);
  registerTimeout(key, id);
  return id;
}

export function safeAddEventListener(key, element, event, handler, options) {
  registerEventListener(key, element, event, handler, options);
}

export { resourceRegistry };