const REQUEST_TYPE = "TRANSLATE_WRAPPER_REQUEST";
const MAX_TEXT_LENGTH = 5000;
const RESULT_TIMEOUT_MS = 20000;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request?.type !== REQUEST_TYPE || typeof request.text !== "string") {
    return false;
  }

  const text = request.text.trim();
  if (!text) {
    sendResponse({ error: "Enter some text to translate." });
    return false;
  }

  if (text.length > MAX_TEXT_LENGTH) {
    sendResponse({ error: `Text is limited to ${MAX_TEXT_LENGTH} characters.` });
    return false;
  }

  const sourceLanguage = /^[a-z]{2,8}$/i.test(request.sourceLanguage || "")
    ? request.sourceLanguage.toLowerCase()
    : "auto";
  const targetUrl = `https://translate.google.com/?sl=${encodeURIComponent(sourceLanguage)}&tl=en&text=${encodeURIComponent(text)}&op=translate`;
  let settled = false;
  let timeoutId;

  const finish = (response) => {
    if (settled) {
      return;
    }
    settled = true;
    clearTimeout(timeoutId);
    sendResponse(response);
  };

  const closeTab = (tabId) => {
    chrome.tabs.remove(tabId).catch(() => {});
  };

  chrome.tabs.create({ url: targetUrl, active: false }, (tab) => {
    if (chrome.runtime.lastError || !tab?.id) {
      finish({ error: "The translation tab could not be opened." });
      return;
    }

    const tabId = tab.id;
    timeoutId = setTimeout(() => {
      closeTab(tabId);
      finish({ error: "Google Translate took too long to respond." });
    }, RESULT_TIMEOUT_MS);

    const onUpdated = (updatedTabId, changeInfo) => {
      if (updatedTabId !== tabId || changeInfo.status !== "complete") {
        return;
      }

      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const selectors = [
            "[data-result-index]",
            ".ryNqvb",
            ".lRu31",
            ".JLqJ4b"
          ];
          const result = selectors
            .map((selector) => document.querySelector(selector)?.innerText?.trim())
            .find(Boolean);
          return result || null;
        }
      }).then((results) => {
        const translation = results?.[0]?.result;
        closeTab(tabId);
        finish(translation
          ? { translation }
          : { error: "Google Translate returned no result. Try again." });
      }).catch(() => {
        closeTab(tabId);
        finish({ error: "The translation page could not be read." });
      });
    };

    chrome.tabs.onUpdated.addListener(onUpdated);
  });

  return true;
});