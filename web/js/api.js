// Tiny fetch wrapper. Sends credentials for cookie sessions.

const baseHeaders = { 'Content-Type': 'application/json' };

async function request(method, path, body) {
  const init = { method, credentials: 'include', headers: { ...baseHeaders } };
  if (body !== undefined && body !== null) init.body = JSON.stringify(body);
  let res;
  try {
    res = await fetch(path, init);
  } catch (e) {
    const err = new Error('Network unavailable');
    err.code = 'network';
    throw err;
  }
  const ctype = res.headers.get('Content-Type') || '';
  const isJson = ctype.includes('application/json');
  const data = isJson ? await res.json().catch(() => ({})) : await res.text();
  if (!res.ok) {
    const err = new Error((isJson && data && data.error) || `${res.status} ${res.statusText}`);
    err.status = res.status;
    err.body = data;
    if (res.status === 401 && method !== 'GET') {
      window.dispatchEvent(new CustomEvent('vp:auth-required'));
    }
    throw err;
  }
  return data;
}

export const api = {
  get:    (p) => request('GET', p),
  post:   (p, b) => request('POST', p, b ?? {}),
  put:    (p, b) => request('PUT', p, b ?? {}),
  del:    (p) => request('DELETE', p),
  raw:    (p, init) => fetch(p, { credentials: 'include', ...init }),
};
