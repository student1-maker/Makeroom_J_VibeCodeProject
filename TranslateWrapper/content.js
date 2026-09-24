const REQUEST_TYPE = "TRANSLATE_WRAPPER_REQUEST";
const RESPONSE_TYPE = "TRANSLATE_WRAPPER_RESPONSE";
const PING_TYPE = "TRANSLATE_WRAPPER_PING";

window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== window.location.origin) {
    return;
  }

  const message = event.data;
  if (message?.type === PING_TYPE) {
    window.postMessage({ type: "TRANSLATE_WRAPPER_PONG" }, window.location.origin);
    return;
  }

  if (!message || message.type !== REQUEST_TYPE) {
    return;
  }

  chrome.runtime.sendMessage(
    {
      type: REQUEST_TYPE,
      requestId: message.requestId,
      text: message.text,
      sourceLanguage: message.sourceLanguage
    },
    (response) => {
      const runtimeError = chrome.runtime.lastError;
      window.postMessage(
        {
          type: RESPONSE_TYPE,
          requestId: message.requestId,
          translation: response?.translation || "",
          error: runtimeError?.message || response?.error || null
        },
        window.location.origin
      );
    }
  );
});