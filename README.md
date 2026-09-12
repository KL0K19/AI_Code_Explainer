[English](README.md) | [Русский](README.ru.md) | [Українська](README.uk.md)

---

# AI Code Explainer

A cross-browser extension for line-by-line source code analysis and explanation powered by **Google Gemini Flash** models. It allows you to instantly inspect code snippets on web pages using the context menu or an interactive screen capture tool.

---

## Features

* **Selected text analysis:** select any code snippet on a page → right-click → choose **"Analyze code"**.
* **Screen area capture (Screenshot):** press the hotkey (`Ctrl+Shift+X` by default) and drag to select any screen area containing code.
* **Interactive modal window:**
  * Free window movement by dragging the header (Drag-and-Drop).
  * 8-directional resizing from all 4 borders and 4 corners.
  * High-contrast syntax highlighting and inline code badges.
* **Multilingual support:** automatically generates explanations in English, Ukrainian, or Russian based on popup preferences.
* **Cross-browser support:** single Manifest V3 codebase compatible with both **Google Chrome** (Chromium) and **Mozilla Firefox**.
* **Instant cancellation:** press `Escape` or click `✕` to immediately abort in-flight API requests.

---

## Tech Stack

* **JavaScript (ES6+)**
* **WebExtensions API / Chrome Extensions API (Manifest V3)**
* **Google Gemini API** (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.5-flash`, `gemini-3.8-flash`, `gemini-3.6-flash`)
* **OffscreenCanvas API** (for background image cropping within Service Worker)

---

## Installation & Setup

### 1. Clone repository
```bash
git clone [https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git](https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git)
cd AI_Code_Explainer

2. Add API key

    Get a free API key from Google AI Studio.

    Create a config.js file in the project root:

    const API_KEY = "YOUR_ACTIVE_GEMINI_KEY";

3. Load into browser

Google Chrome / Chromium (Brave, Edge, Opera)

    Navigate to chrome://extensions/.

    Enable the "Developer mode" toggle in the upper-right corner.

    Click the "Load unpacked" button.

    Select the extension directory.

Mozilla Firefox

    Navigate to about:debugging#/runtime/this-firefox.

    Click the "Load Temporary Add-on..." button.

    Select the manifest.json file in the project root.

Adding New Gemini Models

The extension dynamically injects the model name directly into the Google AI API endpoint (/models/${modelName}:generateContent), which means you do not need to change any networking logic to add new models:

    Open the popup.html file.

    Locate the dropdown element <select id="modelSelect">.

    Add a new <option> entry using the exact model ID from Google AI Studio:
    HTML

    <option value="model-id">Display Name (e.g., Gemini 3.5 Flash)</option>

    (Optional) If you want the newly added model to be selected by default on fresh installs, update the fallback in background.js:

    const modelName = result.selectedModel || 'new-model-id';

    Reload the extension on chrome://extensions/ or about:debugging.