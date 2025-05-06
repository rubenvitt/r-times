// Background script für die INNOQ Timesheet Import Extension

// Standardwert für die URL (wird verwendet, falls noch keine gespeichert wurde)
const DEFAULT_URL = "https://odoo.innoq.io/innoq/users/";

// Listener für Chrome-Runtime-Nachrichten
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'openOdooPage') {
        // Öffne die konfigurierte Odoo-URL in einem neuen Tab
        chrome.storage.sync.get(['odooUrl'], (result) => {
            const url = result.odooUrl || DEFAULT_URL;
            chrome.tabs.create({ url: url });
            sendResponse({ success: true });
        });
        return true; // Notwendig für asynchrone Antwort
    }
});

// Event Listener bei Installation der Extension
chrome.runtime.onInstalled.addListener((details) => {
    // Bei Neuinstallation die Standard-URL setzen, falls noch nicht vorhanden
    if (details.reason === "install") {
        chrome.storage.sync.get(['odooUrl'], (result) => {
            if (!result.odooUrl) {
                chrome.storage.sync.set({ odooUrl: DEFAULT_URL });
            }
        });
    }
}); 