document.addEventListener('DOMContentLoaded', () => {
    const importButton = document.getElementById('importButton');
    const fillTableButton = document.getElementById('fillTableButton');
    const openRTimeButton = document.getElementById('openRTimeButton');
    const statusEl = document.getElementById('status');
    const dataPreviewEl = document.getElementById('data-preview');
    const openSettingsLink = document.getElementById('openSettingsLink');

    let importedData = null;
    let isOnOdooPage = false;

    // Lade die Daten aus dem Storage, falls vorhanden
    chrome.storage.local.get(['timesheetData'], (result) => {
        if (result.timesheetData) {
            importedData = result.timesheetData;
            updateUI('Daten geladen', importedData, true);
        }
    });

    // Prüfen, ob wir auf der Odoo-Seite sind
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            const currentTab = tabs[0];
            isOnOdooPage = currentTab.url && currentTab.url.includes('odoo.innoq.io');

            // Wenn wir nicht auf der Odoo-Seite sind, zeigen wir einen Button an, um dorthin zu gelangen
            if (!isOnOdooPage) {
                const openOdooButton = document.createElement('button');
                openOdooButton.textContent = 'Zu Odoo wechseln';
                openOdooButton.className = 'button primary';
                openOdooButton.style.marginTop = '10px';
                openOdooButton.addEventListener('click', openOdooPage);

                // Button vor fillTableButton einfügen
                fillTableButton.parentElement.insertBefore(openOdooButton, fillTableButton);

                // Status aktualisieren
                statusEl.textContent = 'Du bist nicht auf der Odoo-Seite.';
                statusEl.className = 'status';
                fillTableButton.disabled = true;
            }
        }
    });

    // Einstellungen öffnen
    openSettingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });

    // Zu Odoo wechseln
    function openOdooPage() {
        chrome.runtime.sendMessage({ action: 'openOdooPage' }, () => {
            if (chrome.runtime.lastError) {
                console.error('Fehler beim Öffnen der Odoo-Seite:', chrome.runtime.lastError);
                return;
            }

            // Wir könnten das Popup schließen, aber das passiert automatisch, wenn der Benutzer klickt
        });
    }

    // R-Time App öffnen
    openRTimeButton.addEventListener('click', openRTimePage);

    function openRTimePage() {
        console.log('Öffne R-Time App...');

        chrome.runtime.sendMessage({ action: 'openRTimePage' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Fehler beim Öffnen der R-Time App:', chrome.runtime.lastError.message);
                statusEl.textContent = 'Fehler beim Öffnen der R-Time App';
                statusEl.className = 'status error';
                return;
            }

            console.log('R-Time App Antwort:', response);
            // Popup schließt automatisch beim Klick
        });
    }

    // Aus Zwischenablage importieren
    importButton.addEventListener('click', async () => {
        try {
            statusEl.textContent = 'Lese Zwischenablage...';
            statusEl.className = 'status';

            // Inhalt der Zwischenablage lesen
            const text = await navigator.clipboard.readText();

            if (!text) {
                throw new Error('Keine Daten in der Zwischenablage gefunden.');
            }

            // JSON parsen
            try {
                const data = JSON.parse(text);

                // Prüfen, ob es ein Array ist
                if (!Array.isArray(data)) {
                    throw new Error('Das Format der Daten ist ungültig. Bitte ein JSON-Array kopieren.');
                }

                // Prüfen, ob die erforderlichen Felder vorhanden sind
                if (!validateTimeData(data)) {
                    throw new Error('Die Datenstruktur ist ungültig. Bitte überprüfe das Format (date, hours, text).');
                }

                // Daten speichern
                importedData = data;
                chrome.storage.local.set({ timesheetData: data });

                // UI aktualisieren
                updateUI('Daten erfolgreich importiert!', importedData, isOnOdooPage);
            } catch (e) {
                throw new Error(`Fehler beim Parsen der JSON-Daten: ${e.message}`);
            }
        } catch (error) {
            statusEl.textContent = error.message;
            statusEl.className = 'status error';
            fillTableButton.disabled = true;
            dataPreviewEl.textContent = '';
        }
    });

    // Daten in die Tabelle eintragen
    fillTableButton.addEventListener('click', async () => {
        // Den aktuellen Tab abfragen
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) {
                statusEl.textContent = 'Kein aktiver Tab gefunden.';
                statusEl.className = 'status error';
                return;
            }

            const tab = tabs[0];

            // Prüfen, ob wir auf der richtigen Seite sind
            if (!tab.url.includes('odoo.innoq.io')) {
                statusEl.textContent = 'Bitte öffne die INNOQ Odoo-Seite.';
                statusEl.className = 'status error';
                return;
            }

            // Daten an Content-Script senden
            chrome.tabs.sendMessage(tab.id, {
                action: 'fillTimesheet',
                data: importedData
            }, (response) => {
                if (chrome.runtime.lastError) {
                    statusEl.textContent = `Fehler: ${chrome.runtime.lastError.message}`;
                    statusEl.className = 'status error';
                    return;
                }

                if (response && response.success) {
                    statusEl.textContent = 'Daten erfolgreich eingetragen!';
                    statusEl.className = 'status success';
                } else {
                    statusEl.textContent = response.error || 'Fehler beim Eintragen der Daten.';
                    statusEl.className = 'status error';
                }
            });
        });
    });

    // Hilfsfunktion zum Validieren der Daten
    function validateTimeData(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return false;
        }

        return data.every(item => {
            return (
                item &&
                typeof item === 'object' &&
                'date' in item &&
                'hours' in item &&
                'text' in item
            );
        });
    }

    // Hilfsfunktion zum Aktualisieren der UI
    function updateUI(statusText, data, enableButton) {
        statusEl.textContent = statusText;
        statusEl.className = enableButton ? 'status success' : 'status';
        fillTableButton.disabled = !enableButton;

        if (data) {
            // Vorschau für bis zu 3 Einträge erstellen
            const previewData = data.slice(0, 3).map(item => {
                return `${item.date}: ${item.hours} - ${truncateText(item.text, 50)}`;
            }).join('\n');

            dataPreviewEl.textContent = `${previewData}${data.length > 3 ? '\n...' : ''}`;
        } else {
            dataPreviewEl.textContent = '';
        }
    }

    // Text kürzen
    function truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substr(0, maxLength) + '...';
    }
}); 