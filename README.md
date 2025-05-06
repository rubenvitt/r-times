# R-Times

Ein modernes Zeiterfassungstool mit Chrome-Extension für den Import in INNOQ Odoo Timesheet-System.

## Projektübersicht

Das R-Times Projekt besteht aus zwei Hauptkomponenten:

1. **Webapplikation**: Eine mit Svelte, TypeScript und Vite entwickelte App zur Zeiterfassung
2. **Chrome-Extension**: Ermöglicht den Import von Zeiteinträgen aus R-Times in das INNOQ Odoo Timesheet-System

## Technologie-Stack

- **Frontend**: Svelte 5, TypeScript, Tailwind CSS
- **Build-Tool**: Vite
- **Paketmanager**: pnpm
- **Icons**: Heroicons über @steeze-ui/heroicons

## Installation und Einrichtung

### Voraussetzungen

- Node.js (empfohlen: v18 oder höher)
- pnpm (`npm install -g pnpm`)

### Webapplikation

```bash
# Abhängigkeiten installieren
pnpm install

# Entwicklungsserver starten
pnpm dev

# Build für Produktion erstellen
pnpm build

# Build-Ergebnis lokal anzeigen
pnpm preview
```

### Chrome-Extension

1. Führe einen Build der Webapplikation aus (`pnpm build`)
2. Öffne Chrome und navigiere zu `chrome://extensions/`
3. Aktiviere den "Entwicklermodus" (oben rechts)
4. Klicke auf "Entpackte Erweiterung laden"
5. Wähle den `chrome-extension` Ordner aus

## Verwendung

### Webapplikation

Die Webapplikation ermöglicht das Erfassen und Verwalten von Zeiteinträgen mit folgenden Funktionen:

- Tägliche Zeiterfassung mit Projektzuordnung
- Übersicht über erfasste Zeiten
- Export von Zeiteinträgen im JSON-Format zur Verwendung mit der Chrome-Extension

### Chrome-Extension

Die Chrome-Extension ermöglicht den Import von Zeiteinträgen aus R-Times in das INNOQ Odoo Timesheet-System:

1. In R-Times als JSON exportieren und kopieren
2. In INNOQ Odoo die Extension öffnen und "Aus Zwischenablage importieren" wählen
3. Nach Prüfung der Vorschau auf "In Tabelle eintragen" klicken

## Entwicklung

### Code-Überprüfung

```bash
# TypeScript-Typenüberprüfung durchführen
pnpm check
```

### Projektstruktur

- `src/`: Webapplikation-Quellcode
- `chrome-extension/`: Chrome-Extension-Dateien
- `public/`: Statische Assets für die Webapplikation

## Lizenz

Dieses Projekt ist unter der MIT-Lizenz veröffentlicht.
