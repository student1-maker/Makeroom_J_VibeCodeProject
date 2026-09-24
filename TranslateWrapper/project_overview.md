# Web-to-Extension Automation Bridge (Service Wrapper Overview)

## 📌 Project Concept
A cross-origin automation tool designed to bypass standard web service API rate limits (e.g., Google Translate) by routing local webpage requests through a custom **Chrome Extension**. By leveraging the extension's elevated system permissions, the system circumvents the browser's **Same-Origin Policy (SOP)**, automates interactions inside automated browser tabs, extracts data out of target DOM endpoints, and feeds structured results back down to a clean, custom HTML interface.

---

## 🏗️ Architectural Overview
The system relies on a decoupled, asynchronous, 4-tier communication pipeline to bridge an unprivileged web application with an elevated system browser profile.

```
┌─────────────────────────────────┐
│     1. Local User Interface     │  ◄── [ Standard Webpage Script ]
│        (mysite.html)            │
└────────────────┬────────────────┘
                 │ (window.postMessage)
                 ▼
┌─────────────────────────────────┐
│   2. Content Script Bridge      │  ◄── [ Injected by Chrome Extension ]
│        (content.js)             │
└────────────────┬────────────────┘
                 │ (chrome.runtime.sendMessage)
                 ▼
┌─────────────────────────────────┐
│  3. Extension Service Worker    │  ◄── [ Orchestration Brain ]
│       (background.js)           │
└────────────────┬────────────────┘
                 │ (chrome.tabs / chrome.scripting)
                 ▼
┌─────────────────────────────────┐
│   4. Automated Web Target       │  ◄── [ Scraping & Element Extraction ]
│    (translate.google.com)       │
└─────────────────────────────────┘
```

### Component Breakdown

#### 1. Frontend Web App (`mysite.html`)
* **Role:** Acts as the primary control center and workflow manager.
* **Capabilities:** Handles string processing arrays, inputs user parameters, dispatches transaction objects via `window.postMessage`, and parses incoming runtime responses.
* **Security Context:** Standard browser sandbox. No access to foreign domains or system operations.

#### 2. The Content Script (`content.js`)
* **Role:** Operates as a transparent middleware relay.
* **Capabilities:** Injected natively onto the local domain target via matching rules. It acts as an internal listener, catching `window` post messages and translating them safely into internal system execution calls (`chrome.runtime.sendMessage`).

#### 3. The Extension Background Worker (`background.js`)
* **Role:** Orchestrates browser workflows and state execution.
* **Capabilities:** Persistent environment with elevated manifest permissions. It programmatically instantiates background tabs, monitors page generation cycles, dynamically injects evaluation blocks into targets, parses extracted DOM results, handles tab lifecycle cleanups, and responds to internal messengers asynchronously.

#### 4. The Targeted Web Service (e.g., Google Translate)
* **Role:** Unwitting execution context processing target actions.
* **Capabilities:** Renders UI layouts containing processing output. Manipulated via specific element injection scripts to extract processed strings before tab self-termination.

---

## 📋 System Manifest & Code Schematics

### 1. `manifest.json`
Declares host privileges, internal script mapping rules, and execution rules.
```json
{
  "manifest_version": 3,
  "name": "Web-to-Extension Bridge",
  "version": "1.0",
  "permissions": ["scripting", "tabs"],
  "host_permissions": [
    "https://translate.google.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["http://localhost/*", "https://your-website-domain.com/*"],
      "js": ["content.js"]
    }
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

### 2. `content.js`
Bi-directional data relay bridging user page contexts and extension system calls.
```javascript
window.addEventListener("message", (event) => {
  // Catch outgoing jobs from local site script
  if (event.data && event.data.type === "FROM_PAGE_TO_EXTENSION") {
    
    // Send payload to systemic background service worker
    chrome.runtime.sendMessage({ text: event.data.text }, (response) => {
      // Catch processing output and push down to local DOM frame window
      window.postMessage({ 
        type: "FROM_EXTENSION_TO_PAGE", 
        translation: response.translation 
      }, "*");
    });
  }
});
```

### 3. `background.js`
The state engine navigating execution parameters and DOM harvesting routines.
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const targetUrl = `https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(request.text)}&op=translate`;
  
  // 1. Instantiates a hidden/inactive tab to obscure pipeline visually
  chrome.tabs.create({ url: targetUrl, active: false }, (tab) => {
    
    // 2. Poll page state transitions until fully interactive
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);

        // 3. Evaluate target DOM elements via script injection
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            // Dynamic Selector Target matching Google Translate application nodes
            const resultSpan = document.querySelector('.ryNtos') || document.querySelector('[data-language]');
            return resultSpan ? resultSpan.innerText : null;
          }
        }, (results) => {
          const translatedText = (results && results[0]) ? results[0].result : "Translation failed";
          
          // 4. Return processed payload to middleware relay script
          sendResponse({ translation: translatedText });
          
          // 5. Destruct tab instance to preserve system resources
          chrome.tabs.remove(tab.id);
        });
      }
    });
  });

  return true; // Keeps async transaction channel open for execution lifetime
});
```

### 4. `mysite.html` (Local Client Interface)
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Service Wrapper Dashboard</title>
</head>
<body>
  <h2>Web Automation Bridge Dashboard</h2>
  <textarea id="inputBox" placeholder="Enter source text context here..."></textarea>
  <button id="sendBtn">Execute Request via Extension</button>
  <h3>Response Pipeline Output:</h3>
  <div id="resultBox" style="border:1px solid #ccc; padding:10px; min-height:50px;"></div>

  <script>
    const sendBtn = document.getElementById('sendBtn');
    const inputBox = document.getElementById('inputBox');
    const resultBox = document.getElementById('resultBox');

    // Handle payload responses arriving from content script layer
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === "FROM_EXTENSION_TO_PAGE") {
        resultBox.innerText = event.data.translation;
      }
    });

    // Deploy payload request parameters into system relay framework
    sendBtn.addEventListener('click', () => {
      window.postMessage({ 
        type: "FROM_PAGE_TO_EXTENSION", 
        text: inputBox.value 
      }, "*");
    });
  </script>
</body>
</html>
```

---

## ⚠️ Known Technical Limitations & Constraints

### 1. DOM Layout Fragility
The extension relies directly on explicit target class targets (e.g. `.ryNtos`). Any changes to target production node codebases will halt string extraction pipelines immediately.
* **AI Agent Prompt Hint:** System logic should decouple DOM evaluation selectors into flexible arrays or query fallbacks to survive minor class updates.

### 2. High-Volume Rate Tracking & IP Mitigation
Rapid tab cycling triggers automated anti-bot actions (such as CAPTCHAs) or temporary network-layer blocks from the web host.
* **AI Agent Prompt Hint:** Require agents to build an array-based **throttling or sequencing queue** into `mysite.html` or `background.js` to bound maximum concurrent windows and stagger executions with variable intervals.

### 3. Installation Overhead
This architecture works exclusively if the operator manually installs the extension package via Chrome Developer Mode (`chrome://extensions`). It cannot be deployed purely client-side or served from a remote context.
