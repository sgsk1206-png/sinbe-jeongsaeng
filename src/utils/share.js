// Unicode-safe base64 encode/decode for share URL params
// btoa/atob only handle Latin-1, so we percent-encode the UTF-8 bytes first.

export function encodeShareData(data) {
  try {
    const json = JSON.stringify(data);
    // encodeURIComponent → percent-encoded ASCII → btoa-safe
    return btoa(unescape(encodeURIComponent(json)));
  } catch {
    return null;
  }
}

export function decodeShareData(encoded) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch {
    return null;
  }
}
