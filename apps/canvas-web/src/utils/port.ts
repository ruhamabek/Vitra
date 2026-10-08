export function parseTargetPort(): string {
  if (typeof window === 'undefined') return '9876';
  const search = window.location.search.replace(/^\?/, '').trim();
  const hash = window.location.hash.replace(/^#/, '').trim();
  const params = new URLSearchParams(window.location.search);
  const explicitPort = params.get('port') || params.get('p');
  if (explicitPort && /^\d+$/.test(explicitPort)) {
    return explicitPort;
  }
  if (/^\d+$/.test(search)) {
    return search;
  }
  if (/^\d+$/.test(hash)) {
    return hash;
  }
  for (const key of params.keys()) {
    if (/^\d+$/.test(key)) {
      return key;
    }
  }
   if (window.location.port && window.location.port !== '5173') {
    return window.location.port;
  }
  return '9876';
}
