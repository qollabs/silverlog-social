// Flutter WebView ↔ Web bridge.
//
// Flutter injects the FCM token into the WebView via JavaScript:
//   controller.runJavaScript(
//     'window.dispatchEvent(new CustomEvent("silverlog:fcm_token",{detail:"$token"}))'
//   );
//
// To send a message TO Flutter (e.g. "login complete"):
//   SilverlogChannel.postMessage(JSON.stringify({type:"login_complete", userId:"..."}))
// where SilverlogChannel is a JavascriptChannel registered in the Flutter WebViewController.

declare global {
  interface Window {
    silverlogBridge?: { fcmToken?: string };
    SilverlogChannel?: { postMessage: (msg: string) => void };
  }
}

type BridgeEventType = 'silverlog:login' | 'silverlog:logout';

export function postToFlutter(payload: Record<string, unknown>): void {
  try {
    window.SilverlogChannel?.postMessage(JSON.stringify(payload));
  } catch {
    // not running inside Flutter WebView — safe to ignore
  }
}

export function listenForFcmToken(callback: (token: string) => void): () => void {
  const handler = (e: Event) => {
    const token = (e as CustomEvent<string>).detail;
    if (typeof token === 'string' && token.length > 10) callback(token);
  };
  window.addEventListener('silverlog:fcm_token', handler);

  // Flutter may pre-populate before page load
  const preloaded = window.silverlogBridge?.fcmToken;
  if (typeof preloaded === 'string' && preloaded.length > 10) {
    setTimeout(() => callback(preloaded), 0);
  }

  return () => window.removeEventListener('silverlog:fcm_token', handler);
}

export function emitBridgeEvent(type: BridgeEventType, detail?: unknown): void {
  window.dispatchEvent(new CustomEvent(type, { detail }));
}
