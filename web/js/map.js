// Amap (高德地图) loader — lazy-loads the JS SDK once, exposes a small
// renderMap helper. Falls back gracefully (caller checks window.vp.features.has_map
// before calling) so Plan can keep its striped placeholder when no key is set.

let loaderPromise = null;

export function loadAmap() {
  if (window.AMap) return Promise.resolve(window.AMap);
  if (loaderPromise) return loaderPromise;
  const { amap_key, amap_security } = window.vp.features || {};
  if (!amap_key) return Promise.reject(new Error('AMap key not configured'));

  window._AMapSecurityConfig = { securityJsCode: amap_security || '' };
  loaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(amap_key)}`;
    script.async = true;
    script.onload = () => resolve(window.AMap);
    script.onerror = () => reject(new Error('Failed to load AMap SDK'));
    document.head.appendChild(script);
  });
  return loaderPromise;
}

/**
 * Renders a map into `container` centered on `center` ({lng,lat}) with
 * numbered markers for `points` ([{lng,lat,label}]). Returns the AMap
 * instance, or null if AMap isn't available.
 */
export async function renderMap(container, { center, points = [], zoom = 13 } = {}) {
  let AMap;
  try {
    AMap = await loadAmap();
  } catch (_) {
    return null;
  }
  const map = new AMap.Map(container, {
    center: [center.lng, center.lat],
    zoom,
    resizeEnable: true,
  });
  points.forEach((p, i) => {
    const marker = new AMap.Marker({
      position: [p.lng, p.lat],
      map,
      label: { content: String(i + 1), direction: 'center' },
      content: `<div style="width:30px;height:30px;border-radius:50%;background:#a23728;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,.25)">${i + 1}</div>`,
    });
    if (p.label) marker.setTitle(p.label);
  });
  return map;
}
