// ═══════════════════════════════════════════════════════════
// js/cleanup.js — QUẢN LÝ TÀI NGUYÊN & DỌN DẸP (Giai đoạn 3)
// ═══════════════════════════════════════════════════════════

const resourceRegistry = {
  charts: new Map(),
  eventListeners: new Map(),
  intervals: new Map(),
  timeouts: new Map(),
  resizeObservers: new Map(),
  mutationObservers: new Map(),
  intersectionObservers: new Map(),
  virtualScrolls: new Map(),
  workers: new Map(),
  abortControllers: new Map()
};

export function registerChart(key, chart) {
  if (resourceRegistry.charts.has(key)) {
    try { resourceRegistry.charts.get(key).destroy(); } catch (e) {}
  }
  resourceRegistry.charts.set(key, chart);
  return chart;
}

export function getChart(key) {
  return resourceRegistry.charts.get(key);
}

export function registerEventListener(key, element, event, handler, options) {
  if (!element) return;
  if (resourceRegistry.eventListeners.has(key)) unregisterEventListener(key);
  element.addEventListener(event, handler, options);
  resourceRegistry.eventListeners.set(key, { element, event, handler, options });
}

export function unregisterEventListener(key) {
  const entry = resourceRegistry.eventListeners.get(key);
  if (entry) {
    entry.element.removeEventListener(entry.event, entry.handler, entry.options);
    resourceRegistry.eventListeners.delete(key);
  }
}

export function registerInterval(key, intervalId) {
  if (resourceRegistry.intervals.has(key)) clearInterval(resourceRegistry.intervals.get(key));
  resourceRegistry.intervals.set(key, intervalId);
}

export function registerTimeout(key, timeoutId) {
  if (resourceRegistry.timeouts.has(key)) clearTimeout(resourceRegistry.timeouts.get(key));
  resourceRegistry.timeouts.set(key, timeoutId);
}

export function registerResizeObserver(key, observer) {
  if (resourceRegistry.resizeObservers.has(key)) resourceRegistry.resizeObservers.get(key).disconnect();
  resourceRegistry.resizeObservers.set(key, observer);
}

export function registerMutationObserver(key, observer) {
  if (resourceRegistry.mutationObservers.has(key)) resourceRegistry.mutationObservers.get(key).disconnect();
  resourceRegistry.mutationObservers.set(key, observer);
}

export function registerIntersectionObserver(key, observer) {
  if (resourceRegistry.intersectionObservers.has(key)) resourceRegistry.intersectionObservers.get(key).disconnect();
  resourceRegistry.intersectionObservers.set(key, observer);
}

export function registerVirtualScroll(key, instance) {
  if (resourceRegistry.virtualScrolls.has(key)) {
    try { resourceRegistry.virtualScrolls.get(key).destroy(); } catch (e) {}
  }
  resourceRegistry.virtualScrolls.set(key, instance);
}

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

export { resourceRegistry };