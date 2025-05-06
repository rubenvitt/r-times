// Background script für die INNOQ Timesheet Import Extension
console.log('Background script geladen');

// Standardwerte für die URLs
const DEFAULT_ODOO_URL = "https://odoo.innoq.io/innoq/users/";
const DEFAULT_RTIME_URL = "https://r-time.rubeen.dev";

// Listener für Chrome-Runtime-Nachrichten
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log('Nachricht empfangen:', message);

    if (message.action === 'openOdooPage') {
        console.log('Öffne Odoo-Seite');
        // Öffne die konfigurierte Odoo-URL in einem neuen Tab
        chrome.storage.sync.get(['odooUrl'], (result) => {
            const url = result.odooUrl || DEFAULT_ODOO_URL;
            console.log('Öffne URL:', url);
            chrome.tabs.create({ url: url }, (tab) => {
                console.log('Tab erstellt:', tab);
                sendResponse({ success: true, tabId: tab.id });
            });
        });
        return true; // Notwendig für asynchrone Antwort
    }

    if (message.action === 'openRTimePage') {
        console.log('Öffne R-Time App');
        // Öffne die konfigurierte R-Time-URL in einem neuen Tab
        try {
            chrome.storage.sync.get(['rTimeUrl'], (result) => {
                const url = result.rTimeUrl || DEFAULT_RTIME_URL;
                console.log('Öffne R-Time URL:', url);
                chrome.tabs.create({ url: url }, (tab) => {
                    console.log('R-Time Tab erstellt:', tab);
                    sendResponse({ success: true, tabId: tab.id });
                });
            });
            return true; // Notwendig für asynchrone Antwort
        } catch (error) {
            console.error('Fehler beim Öffnen der R-Time App:', error);
            sendResponse({ success: false, error: error.message });
            return true;
        }
    }

    // Wenn keine passende Aktion gefunden wurde
    console.warn('Unbekannte Aktion:', message.action);
    return false;
});

// Event Listener bei Installation der Extension
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installiert oder aktualisiert:', details.reason);

    // Bei Neuinstallation die Standard-URLs setzen, falls noch nicht vorhanden
    if (details.reason === "install") {
        chrome.storage.sync.get(['odooUrl', 'rTimeUrl'], (result) => {
            const newSettings = {};

            if (!result.odooUrl) {
                newSettings.odooUrl = DEFAULT_ODOO_URL;
            }

            if (!result.rTimeUrl) {
                newSettings.rTimeUrl = DEFAULT_RTIME_URL;
            }

            if (Object.keys(newSettings).length > 0) {
                console.log('Standardeinstellungen gesetzt:', newSettings);
                chrome.storage.sync.set(newSettings);
            }
        });
    }
}); 