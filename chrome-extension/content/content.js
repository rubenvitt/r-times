// Listener für Nachrichten vom Popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'fillTimesheet') {
        fillTimesheet(message.data)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Gibt an, dass wir die Antwort asynchron senden werden
    }
});

/**
 * Füllt die Timesheet-Tabelle mit den Daten
 * @param {Array} data - Array mit Einträgen (date, hours, text)
 * @returns {Promise<Object>} - Ergebnis des Imports
 */
async function fillTimesheet(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('Keine gültigen Daten zum Eintragen vorhanden.');
    }

    // Überprüfen, ob wir auf der richtigen Seite sind
    const table = document.querySelector('table.table-hover.table-light');
    if (!table) {
        throw new Error('Timesheet-Tabelle nicht gefunden. Bist du auf der richtigen Seite?');
    }

    // Import-Modal anzeigen
    const modal = createImportModal();
    document.body.appendChild(modal.element);

    try {
        // Daten gruppieren nach Datum
        const dataByDate = groupDataByDate(data);

        // Alle Datumszeilen der Tabelle finden
        const rows = Array.from(table.querySelectorAll('tbody tr'));

        // Zähler für den Import-Fortschritt
        let processed = 0;
        let succeeded = 0;
        let failed = 0;

        // Für jede Zeile in der Tabelle prüfen, ob wir Daten dafür haben
        for (const row of rows) {
            try {
                // Datum aus der Tabellenzeile extrahieren
                const dateCell = row.querySelector('td.datelabel');
                if (!dateCell) continue;

                // Extrahiere Datum aus dem Label (Format: "01 Do - Tag XYZ")
                const dateMatch = dateCell.textContent.trim().match(/^(\d{2})/);
                if (!dateMatch) continue;

                const day = dateMatch[1];

                // Datum im Format YYYY-MM-DD aus den Daten extrahieren
                // und Tag daraus isolieren, um zu vergleichen
                const entries = findEntriesForDay(dataByDate, day);

                if (entries && entries.length > 0) {
                    // Einträge für diesen Tag gefunden
                    await fillRowWithData(row, entries[0]);
                    succeeded++;
                }

                processed++;
                updateProgress(modal, processed, rows.length, succeeded, failed);
            } catch (error) {
                console.error('Fehler beim Verarbeiten einer Zeile:', error);
                failed++;
                updateProgress(modal, processed, rows.length, succeeded, failed);
            }
        }

        // Abschließen des Imports
        if (failed > 0) {
            modal.statusElement.textContent = `Import abgeschlossen. ${succeeded} von ${processed} Einträgen erfolgreich importiert, ${failed} fehlgeschlagen.`;
            modal.statusElement.classList.add('error');
        } else {
            modal.statusElement.textContent = `Import erfolgreich! ${succeeded} von ${processed} Einträgen importiert.`;
            modal.statusElement.classList.add('success');
        }

        // Modal nach 3 Sekunden ausblenden, wenn alles erfolgreich war
        if (failed === 0) {
            setTimeout(() => {
                document.body.removeChild(modal.element);
            }, 3000);
        }

        return {
            success: true,
            total: processed,
            succeeded,
            failed
        };
    } catch (error) {
        console.error('Fehler beim Importieren:', error);
        modal.statusElement.textContent = `Fehler: ${error.message}`;
        modal.statusElement.classList.add('error');

        setTimeout(() => {
            document.body.removeChild(modal.element);
        }, 5000);

        throw error;
    }
}

/**
 * Gruppiert die Daten nach Datum
 * @param {Array} data - Daten aus dem JSON-Import
 * @returns {Object} - Gruppierte Daten nach Datum
 */
function groupDataByDate(data) {
    return data.reduce((acc, item) => {
        if (!item.date) return acc;

        // Datum im Format YYYY-MM-DD erwarten
        // Wenn das Datum nicht im korrekten Format ist, überspringen
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return acc;

        if (!acc[item.date]) {
            acc[item.date] = [];
        }

        acc[item.date].push(item);
        return acc;
    }, {});
}

/**
 * Findet Einträge für einen bestimmten Tag
 * @param {Object} dataByDate - Gruppierte Daten nach Datum
 * @param {string} day - Tag als String (01, 02, etc.)
 * @returns {Array|null} - Gefundene Einträge oder null
 */
function findEntriesForDay(dataByDate, day) {
    // Das komplette Datum (YYYY-MM-DD) durchsuchen und prüfen, ob der Tag übereinstimmt
    for (const [date, entries] of Object.entries(dataByDate)) {
        // Tag aus dem Datum extrahieren (YYYY-MM-DD -> DD)
        const entryDay = date.split('-')[2];

        if (entryDay === day) {
            return entries;
        }
    }

    return null;
}

/**
 * Füllt eine Tabellenzeile mit den Daten
 * @param {HTMLElement} row - Tabellenzeile
 * @param {Object} data - Daten für die Zeile
 * @returns {Promise<void>}
 */
async function fillRowWithData(row, data) {
    // Wenn die Zeile eine Weekend-Klasse hat (Wochenende oder Feiertag),
    // prüfen, ob die Felder nicht readonly sind
    const isReadonly = row.classList.contains('weekend');

    // Hours und Text Input-Felder finden
    const hoursInput = row.querySelector('input.hoursinput');
    const textInput = row.querySelector('input.textinput');

    if (!hoursInput || !textInput) {
        throw new Error('Eingabefelder in der Zeile nicht gefunden.');
    }

    // Prüfen, ob die Felder schreibbar sind
    if (isReadonly && hoursInput.readOnly) {
        // Wenn die Zeile readonly ist, überspringen
        return;
    }

    // Highlight der Felder
    hoursInput.classList.add('innoq-highlight');
    textInput.classList.add('innoq-highlight');

    // Wert setzen (stündliche Notation 8:30 oder 8.5h akzeptieren)
    hoursInput.value = data.hours;

    // Wenn das Text-Feld ausgefüllt werden kann
    textInput.value = data.text;

    // Ein change-Event auslösen, damit die Seite auf die Änderungen reagiert
    hoursInput.dispatchEvent(new Event('change', { bubbles: true }));
    textInput.dispatchEvent(new Event('change', { bubbles: true }));

    // Kurze Pause, um visuelles Feedback zu geben
    await new Promise(resolve => setTimeout(resolve, 100));

    // Highlighting nach einiger Zeit entfernen
    setTimeout(() => {
        hoursInput.classList.remove('innoq-highlight');
        textInput.classList.remove('innoq-highlight');
    }, 2000);
}

/**
 * Erstellt das Modal für den Import-Fortschritt
 * @returns {Object} - Modal-Elemente
 */
function createImportModal() {
    const overlay = document.createElement('div');
    overlay.className = 'innoq-import-overlay';

    const modal = document.createElement('div');
    modal.className = 'innoq-import-modal';

    const title = document.createElement('h2');
    title.textContent = 'Timesheet-Daten werden importiert...';

    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress';

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.style.width = '0%';

    const status = document.createElement('div');
    status.className = 'status';
    status.textContent = 'Import wird vorbereitet...';

    progressContainer.appendChild(progressBar);
    modal.appendChild(title);
    modal.appendChild(progressContainer);
    modal.appendChild(status);
    overlay.appendChild(modal);

    return {
        element: overlay,
        progressBar,
        statusElement: status
    };
}

/**
 * Aktualisiert den Fortschritt im Modal
 * @param {Object} modal - Modal-Elemente
 * @param {number} current - Aktueller Fortschritt
 * @param {number} total - Gesamtzahl
 * @param {number} succeeded - Erfolgreiche Einträge
 * @param {number} failed - Fehlgeschlagene Einträge
 */
function updateProgress(modal, current, total, succeeded, failed) {
    const percentage = Math.round((current / total) * 100);
    modal.progressBar.style.width = `${percentage}%`;
    modal.statusElement.textContent = `Import läuft... ${current} von ${total} Einträgen verarbeitet. Erfolgreich: ${succeeded}, Fehlgeschlagen: ${failed}`;
} 