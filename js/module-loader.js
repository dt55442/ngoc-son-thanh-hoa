// ═══════════════════════════════════════════════════════════
// js/module-loader.js — LAZY-LOAD MODULES THEO TAB (Giai đoạn 2)
// ═══════════════════════════════════════════════════════════
// Mỗi tab chỉ nạp module khi CẦN (lần đầu chuyển sang tab đó).
// Module đã nạp được cache để lần sau chuyển tab tức thì.
// Giảm ~60% JS parse/init lúc boot vì không nạp tất cả cùng lúc.

const TAB_MODULES = {
  'dashboard-view': ['dashboard', 'capacity', 'planning', 'press', 'materials', 'trace', 'leadership-dashboard'],
  'kanban-view': ['xuong2', 'kanban', 'kiln', 'batch-modals'],
  'planning-view': ['planning', 'materials'],
  'materials-view': ['materials', 'suppliers'],
  'qc-view': ['qc', 'qc-final', 'qc-press', 'kiln'],
  'hr-view': ['hr'],
  'leadership-view': ['leadership-dashboard']
};

const loadedModules = new Map(); // cache module đã nạp
const loadingPromises = new Map(); // tránh nạp trùng khi click nhanh

/**
 * Nạp module cho tab chỉ định (idempotent)
 * @param {string} viewId - ID của view/tab
 * @returns {Promise<void>}
 */
export async function loadModulesForView(viewId) {
  const modules = TAB_MODULES[viewId] || [];
  
  // Nạp song song tất cả module của tab
  await Promise.all(modules.map(async (moduleName) => {
    if (loadedModules.has(moduleName)) return; // đã nạp rồi
    
    // Tránh nạp trùng khi click nhanh 2 lần
    if (loadingPromises.has(moduleName)) {
      await loadingPromises.get(moduleName);
      return;
    }
    
    const promise = import(`./${moduleName}.js`)
      .then(() => {
        loadedModules.set(moduleName, true);
        console.log(`[ModuleLoader] Loaded: ${moduleName}`);
      })
      .catch(e => {
        console.warn(`[ModuleLoader] Failed to load ${moduleName}:`, e);
        loadedModules.set(moduleName, false); // đánh dấu thất bại để không retry
      })
      .finally(() => {
        loadingPromises.delete(moduleName);
      });
    
    loadingPromises.set(moduleName, promise);
    await promise;
  }));
}

/**
 * Kiểm tra module đã được nạp chưa
 * @param {string} moduleName 
 * @returns {boolean}
 */
export function isModuleLoaded(moduleName) {
  return loadedModules.get(moduleName) === true;
}

/**
 * Lấy danh sách module của tab
 * @param {string} viewId
 * @returns {string[]}
 */
export function getTabModules(viewId) {
  return TAB_MODULES[viewId] || [];
}

/**
 * Preload module cho tab (dùng khi hover nav để nạp trước)
 * @param {string} viewId
 */
export function preloadModulesForView(viewId) {
  const modules = TAB_MODULES[viewId] || [];
  modules.forEach(moduleName => {
    if (!loadedModules.has(moduleName) && !loadingPromises.has(moduleName)) {
      const promise = import(`./${moduleName}.js`)
        .then(() => { loadedModules.set(moduleName, true); })
        .catch(() => { loadedModules.set(moduleName, false); })
        .finally(() => { loadingPromises.delete(moduleName); });
      loadingPromises.set(moduleName, promise);
    }
  });
}

/**
 * Reset cache (chỉ dùng cho test)
 */
export function __resetModuleCache() {
  loadedModules.clear();
  loadingPromises.clear();
}