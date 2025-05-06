// Warten bis das DOM vollständig geladen ist
document.addEventListener('DOMContentLoaded', () => {
    const odooUrlInput = document.getElementById('odooUrl');
    const saveButton = document.getElementById('saveButton');
    const resetButton = document.getElementById('resetButton');
    const statusElement = document.getElementById('status');

    // Standardwert für die URL (wird verwendet, falls noch keine gespeichert wurde)
    const DEFAULT_URL = "https://odoo.innoq.io/innoq/users/";

    // Gespeicherte URL aus dem Storage laden
    loadSavedSettings();

    // Event-Listener für den Speichern-Button
    saveButton.addEventListener('click', saveSettings);

    // Event-Listener für den Zurücksetzen-Button
    resetButton.addEventListener('click', resetSettings);

    /**
     * Lädt die gespeicherten Einstellungen aus dem Chrome Storage
     */
    function loadSavedSettings() {
        chrome.storage.sync.get(['odooUrl'], (result) => {
            odooUrlInput.value = result.odooUrl || DEFAULT_URL;
        });
    }

    /**
     * Speichert die Einstellungen im Chrome Storage
     */
    function saveSettings() {
        const odooUrl = odooUrlInput.value.trim();

        // Einfache Validierung der URL
        if (!odooUrl || !isValidUrl(odooUrl)) {
            showStatus('Bitte gib eine gültige URL ein.', 'error');
            return;
        }

        // Einstellungen speichern
        chrome.storage.sync.set({ odooUrl }, () => {
            showStatus('Einstellungen gespeichert!', 'success');
        });
    }

    /**
     * Setzt die Einstellungen auf die Standardwerte zurück
     */
    function resetSettings() {
        odooUrlInput.value = DEFAULT_URL;
        chrome.storage.sync.set({ odooUrl: DEFAULT_URL }, () => {
            showStatus('Einstellungen zurückgesetzt!', 'success');
        });
    }

    /**
     * Zeigt eine Statusmeldung an
     * @param {string} message - Die anzuzeigende Nachricht
     * @param {string} type - Der Typ der Nachricht (success, error)
     */
    function showStatus(message, type = 'info') {
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;

        // Status nach 3 Sekunden ausblenden
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'status';
        }, 3000);
    }

    /**
     * Prüft, ob eine URL gültig ist
     * @param {string} url - Die zu prüfende URL
     * @returns {boolean} - True, wenn die URL gültig ist
     */
    function isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    }
}); 