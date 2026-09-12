const browserAPI = typeof browser !== "undefined" ? browser : chrome;
let currentAbortController = null;

const loadingTexts = {
    ru: "Анализирую код, подождите пару секунд...",
    uk: "Аналізую код, зачекайте пару секунд...",
    en: "Analyzing code, please wait a couple of seconds..."
};

const errorPrefixes = {
    ru: "Ошибка: ",
    uk: "Помилка: ",
    en: "Error: "
};

browserAPI.runtime.onInstalled.addListener(() => {
    browserAPI.contextMenus.removeAll(() => {
        browserAPI.contextMenus.create({
            id: "analyze-selection",
            title: "Анализировать код",
            contexts: ["selection"]
        });
    });
});

browserAPI.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "analyze-selection" && info.selectionText) {
        browserAPI.storage.local.get(['selectedModel', 'selectedLang'], (result) => {
            const modelName = result.selectedModel || 'gemini-2.0-flash';
            const langCode = result.selectedLang || 'ru';
            processTextAnalysis(info.selectionText, tab.id, modelName, langCode);
        });
    }
});


browserAPI.commands.onCommand.addListener((command) => {
    if (command === "take-screenshot") {
        browserAPI.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
            if (tabs[0]?.id) {
                browserAPI.tabs.sendMessage(tabs[0].id, { action: "START_SELECTION" });
            }
        });
    }
});

// Сообщения от content.js
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "CAPTURE_AREA") {
        browserAPI.storage.local.get(['selectedModel', 'selectedLang'], async (result) => {
            const modelName = result.selectedModel || 'gemini-2.0-flash';
            const langCode = result.selectedLang || 'ru';
            processScreenshot(request.coords, sender.tab.id, modelName, langCode);
        });
    } else if (request.action === "CANCEL_REQUEST") {
        if (currentAbortController) {
            currentAbortController.abort();
            currentAbortController = null;
        }
    }
});

async function processTextAnalysis(codeText, tabId, modelName, langCode) {
    const currentLoading = loadingTexts[langCode] || loadingTexts.ru;
    const currentErr = errorPrefixes[langCode] || errorPrefixes.ru;

    try {
        if (currentAbortController) currentAbortController.abort();
        currentAbortController = new AbortController();

        browserAPI.tabs.sendMessage(tabId, { action: "SHOW_RESULT", text: currentLoading });

        const resultText = await askGeminiText(codeText, modelName, langCode, currentAbortController.signal);
        browserAPI.tabs.sendMessage(tabId, { action: "SHOW_RESULT", text: resultText });

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log("Запрос отменен пользователем");
        } else {
            browserAPI.tabs.sendMessage(tabId, { action: "SHOW_RESULT", text: currentErr + error.message });
        }
    } finally {
        currentAbortController = null;
    }
}


async function processScreenshot(coords, tabId, modelName, langCode) {
    const currentLoading = loadingTexts[langCode] || loadingTexts.ru;
    const currentErr = errorPrefixes[langCode] || errorPrefixes.ru;

    try {
        if (currentAbortController) currentAbortController.abort();
        currentAbortController = new AbortController();

        browserAPI.tabs.sendMessage(tabId, { action: "SHOW_RESULT", text: currentLoading });

        const dataUrl = await browserAPI.tabs.captureVisibleTab(null, { format: "png" });
        const croppedBase64 = await cropImage(dataUrl, coords);

        const aiResponse = await askGeminiImage(croppedBase64, modelName, langCode, currentAbortController.signal);
        browserAPI.tabs.sendMessage(tabId, { action: "SHOW_RESULT", text: aiResponse });

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log("Запрос отменен пользователем");
        } else {
            browserAPI.tabs.sendMessage(tabId, { action: "SHOW_RESULT", text: currentErr + error.message });
        }
    } finally {
        currentAbortController = null;
    }
}

function getPromptText(langCode) {
    let langInstruction = "YOUR ENTIRE RESPONSE AND ALL EXPLANATIONS MUST BE WRITTEN STRICTLY IN THE RUSSIAN LANGUAGE.";
    if (langCode === 'uk') langInstruction = "YOUR ENTIRE RESPONSE AND ALL EXPLANATIONS MUST BE WRITTEN STRICTLY IN THE UKRAINIAN LANGUAGE.";
    if (langCode === 'en') langInstruction = "YOUR ENTIRE RESPONSE AND ALL EXPLANATIONS MUST BE WRITTEN STRICTLY IN THE ENGLISH LANGUAGE.";

    return `Analyze this code snippet line by line: explain exactly what each line of executable code does and why it is necessary for the algorithm. Strictly ignore any comments in the code (e.g., lines starting with //, #, <!--, or /*). Do not mention comments at all. For executable code elements, wrap them in backticks (e.g., \`code\`). At the end, provide a brief summary of how the entire code works as a whole. ${langInstruction}`;
}

async function askGeminiText(codeText, modelName, langCode, signal) {
    const cleanModel = encodeURIComponent(modelName.trim());
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${API_KEY}`;
    const basePrompt = getPromptText(langCode);
    const fullPrompt = `${basePrompt}\n\n\`\`\`\n${codeText}\n\`\`\``;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }]
        }),
        signal: signal
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text;
}

async function askGeminiImage(base64Data, modelName, langCode, signal) {
    const cleanModel = encodeURIComponent(modelName.trim());
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${API_KEY}`;
    const cleanBase64 = base64Data.split(',')[1];
    const promptText = getPromptText(langCode);

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: promptText },
                    { inline_data: { mime_type: "image/jpeg", data: cleanBase64 } }
                ]
            }]
        }),
        signal: signal
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text;
}

async function cropImage(dataUrl, coords) {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const dpr = coords.pixelRatio || 1;
    const width = Math.round(coords.width * dpr);
    const height = Math.round(coords.height * dpr);

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, coords.x * dpr, coords.y * dpr, width, height, 0, 0, width, height);

    const croppedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.95 });
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(croppedBlob);
    });
}
