const browserAPI = typeof browser !== "undefined" ? browser : chrome;

const hints = {
    ru: (key) => `• Текст: выделите код и нажмите ПКМ → «Анализировать код»<br>• Скриншот: нажмите <b>${key}</b><br>• Окно можно свободно двигать за заголовок и растягивать за любые края`,
    uk: (key) => `• Текст: виділіть код і натисніть ПКМ → «Аналізувати код»<br>• Скриншот: натисніть <b>${key}</b><br>• Вікно можна вільно рухати за заголовок і розтягувати за будь-які краї`,
    en: (key) => `• Text: select code and right-click → "Analyze code"<br>• Screenshot: press <b>${key}</b><br>• The window can be dragged by the header and resized from any edge`
};

const notSetText = {
    ru: "не назначена",
    uk: "не призначена",
    en: "not set"
};

document.addEventListener('DOMContentLoaded', () => {
    const modelSelect = document.getElementById('modelSelect');
    const langSelect = document.getElementById('langSelect');
    const hintElement = document.getElementById('hintText');
    let currentShortcut = "Ctrl+Shift+X";

    function updateHint(lang) {
        if (!hintElement || !hints[lang]) return;
        const keyDisplay = currentShortcut || notSetText[lang] || notSetText.ru;
        hintElement.innerHTML = hints[lang](keyDisplay);
    }

    if (browserAPI.commands && browserAPI.commands.getAll) {
        browserAPI.commands.getAll((commands) => {
            const screenCmd = commands.find(c => c.name === "take-screenshot");
            if (screenCmd && screenCmd.shortcut) {
                currentShortcut = screenCmd.shortcut;
            } else if (screenCmd && !screenCmd.shortcut) {
                currentShortcut = "";
            }
            browserAPI.storage.local.get(['selectedLang'], (result) => {
                updateHint(result.selectedLang || 'ru');
            });
        });
    }

    browserAPI.storage.local.get(['selectedModel', 'selectedLang'], (result) => {
        if (result.selectedModel) {
            modelSelect.value = result.selectedModel;
        }
        if (result.selectedLang) {
            langSelect.value = result.selectedLang;
            updateHint(result.selectedLang);
        } else {
            updateHint('ru');
        }
    });

    modelSelect.addEventListener('change', () => {
        browserAPI.storage.local.set({ selectedModel: modelSelect.value });
    });

    langSelect.addEventListener('change', () => {
        const lang = langSelect.value;
        browserAPI.storage.local.set({ selectedLang: lang });
        updateHint(lang);
    });
});
