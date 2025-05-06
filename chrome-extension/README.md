# INNOQ Timesheet Import Chrome Extension

Diese Chrome-Extension ermöglicht den Import von Zeiteinträgen aus der R-Times App in das INNOQ Odoo Timesheet-System.

## Funktionen

- Import von Zeiteinträgen aus der Zwischenablage im JSON-Format
- Automatisches Eintragen der Daten in die entsprechenden Felder der Timesheet-Tabelle
- Fortschrittsanzeige und visuelle Rückmeldung beim Import
- Speicherung der importierten Daten für späteren erneuten Import

## Installation

1. Öffne Chrome und navigiere zu `chrome://extensions/`
2. Aktiviere den "Entwicklermodus" (oben rechts)
3. Klicke auf "Entpackte Erweiterung laden"
4. Wähle den `chrome-extension` Ordner aus

## Verwendung

1. In R-Times als JSON exportieren und kopieren:
   - Exportiere einen Monat aus R-Times im JSON-Format
   - Kopiere den Inhalt in die Zwischenablage

2. In INNOQ Odoo:
   - Navigiere zur Timesheet-Seite in Odoo
   - Klicke auf das Extension-Icon in der Toolbar
   - Klicke auf "Aus Zwischenablage importieren"
   - Überprüfe die Vorschau der importierten Daten
   - Klicke auf "In Tabelle eintragen", um den Import zu starten

## Format der Daten

Die Extension erwartet Daten im folgenden JSON-Format:

```json
[
  {
    "date": "2023-05-15",
    "hours": "8:30",
    "text": "Projekt A - Meeting; Projekt B - Entwicklung"
  },
  {
    "date": "2023-05-16",
    "hours": "7:45",
    "text": "Projekt C - Code-Review"
  }
]
```

## Hinweis zu den Icons

Für die Veröffentlichung der Extension müssen die Platzhalterdateien im `icons`-Ordner durch echte Icon-Dateien in den Größen 16x16, 48x48 und 128x128 Pixel ersetzt werden.

## Entwicklung

Die Extension besteht aus folgenden Hauptkomponenten:

- `manifest.json`: Konfiguration der Extension
- `popup/`: Popup-UI der Extension
- `content/`: Content-Script für die Interaktion mit der Odoo-Webseite

### Abhängigkeiten

Die Extension hat keine externen Abhängigkeiten und verwendet nur Standard-Web-Technologien.

### Lizenz

MIT 