<script lang="ts">
  // Imports zuerst
  import {
    ChevronDown,
    ClipboardDocument,
    Clock,
    DocumentText,
    PlusCircle,
  } from "@steeze-ui/heroicons";
  import { Icon } from "@steeze-ui/svelte-icon";
  import { onMount } from "svelte";

  // Interfaces
  interface Activity {
    title: string;
    minutes: number;
    notes: string[];
    isTitleWithParentheses: boolean;
    hasMissingEntries: boolean;
  }

  interface DayEntry {
    date: string;
    minutes: number;
    activities: Activity[];
    hasIncompleteActivities: boolean;
    hasCriticalActivities: boolean;
    missingEntries: {
      activity: string;
      start: string;
      end: string;
      isCritical: boolean;
    }[];
    isExpanded: boolean;
  }

  // Interface für Metadaten
  interface ReportMetadata {
    startDate: string;
    endDate: string;
    entryCount: number;
    totalMinutes: number;
    lastUpdated: string;
  }

  // Interface für monatliche Gruppierung
  interface MonthGroup {
    month: string;
    days: DayEntry[];
  }

  // Reaktive Variablen
  let days: DayEntry[] = [];
  let metadata: ReportMetadata | null = null;
  let rounding = 15;
  const roundOptions = [5, 10, 15, 30, 60];
  let monthGroups: MonthGroup[] = [];

  // Laden der gespeicherten Daten beim Initialisieren
  onMount(() => {
    loadFromStorage();
  });

  // Speichert Daten im sessionStorage
  function saveToStorage() {
    if (days.length > 0 && metadata) {
      const dataToSave = {
        days,
        metadata,
        rounding,
      };
      sessionStorage.setItem("timesheetData", JSON.stringify(dataToSave));
    }
  }

  // Lädt Daten aus dem sessionStorage
  function loadFromStorage() {
    const savedData = sessionStorage.getItem("timesheetData");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        days = parsed.days || [];
        metadata = parsed.metadata || null;
        rounding = parsed.rounding || 15;

        // Nach dem Laden Monatsgruppen aktualisieren
        updateMonthGroups();
      } catch (e) {
        console.error("Fehler beim Laden der gespeicherten Daten", e);
      }
    }
  }

  // Gruppiert Tage nach Monaten
  function updateMonthGroups() {
    if (!days.length) {
      monthGroups = [];
      return;
    }

    const groups = new Map<string, DayEntry[]>();

    days.forEach((day) => {
      // Monat aus dem Datum extrahieren (YYYY-MM)
      const month = day.date.substring(0, 7);
      if (!groups.has(month)) {
        groups.set(month, []);
      }
      groups.get(month)!.push(day);
    });

    monthGroups = Array.from(groups.entries())
      .map(([month, days]) => ({
        month,
        days,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  // Kopiert alle Aktivitäten eines Monats als JSON
  function copyMonthAsJson(month: MonthGroup) {
    const jsonData = month.days.map((day) => {
      // Aktivitäten für einen Tag zusammenfassen (wie bei copyActivities)
      const activitiesText = day.activities
        .map((act) => {
          const notes = act.notes.join(", ");
          return notes ? `${act.title} # ${notes}` : act.title;
        })
        .join("; ");

      return {
        date: day.date,
        hours: formatMins(day.minutes),
        text: activitiesText,
      };
    });

    navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
  }

  // Kopiert alle Aktivitäten als JSON
  function copyAllAsJson() {
    const jsonData = days.map((day) => {
      // Aktivitäten für einen Tag zusammenfassen (wie bei copyActivities)
      const activitiesText = day.activities
        .map((act) => {
          const notes = act.notes.join(", ");
          return notes ? `${act.title} # ${notes}` : act.title;
        })
        .join("; ");

      return {
        date: day.date,
        hours: formatMins(day.minutes),
        text: activitiesText,
      };
    });

    navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
  }

  // Formatiert den Monatsnamen für die Anzeige
  function formatMonthName(monthStr: string): string {
    const date = new Date(monthStr + "-01");
    return date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  }

  // Prüft, ob der Titel im Format "Title(Text)" ist
  function isTitleWithParentheses(title: string): boolean {
    return /^.+\(.+\)$/.test(title.trim());
  }

  function formatMins(mins: number) {
    const rounded = Math.round(mins / rounding) * rounding;
    const h = Math.floor(rounded / 60);
    const m = rounded % 60;
    return `${h}:${m.toString().padStart(2, "0")}`;
  }

  function handleFileChange(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (!files?.length) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        processData(data);
      } catch {
        alert("Ungültiges JSON-Format");
      }
    };
    reader.readAsText(files[0]);
  }

  function processData(data: any) {
    const records: any[] = Array.isArray(data)
      ? data
      : (data.records ?? data.activities ?? []);

    // Metadaten initialisieren
    let startDate = "";
    let endDate = "";
    let totalMinutes = 0;

    // Erste Verarbeitung: Einträge nach Tag und Aktivität gruppieren
    const dayMap = new Map<
      string,
      {
        total: number;
        map: Map<
          string,
          {
            mins: number;
            notes: string[];
            isTitleWithParentheses: boolean;
            entries: { hasNotes: boolean; start: string; end: string }[];
          }
        >;
      }
    >();

    // Alle Einträge sammeln
    records.forEach((rec) => {
      const start = new Date(rec.start || rec.startDate);
      const end = new Date(rec.end || rec.endDate || rec.stopDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

      const date = start.toISOString().split("T")[0];
      const durMins = Math.round((end.getTime() - start.getTime()) / 60000);

      // Metadaten aktualisieren
      if (!startDate || date < startDate) startDate = date;
      if (!endDate || date > endDate) endDate = date;
      totalMinutes += durMins;

      if (!dayMap.has(date))
        dayMap.set(date, {
          total: 0,
          map: new Map(),
        });

      const day = dayMap.get(date)!;
      day.total += durMins;

      const title = rec.activityTitle || rec.project || "Ohne Titel";
      const note = rec.notes ?? "";
      const hasParentheses = isTitleWithParentheses(title);

      // Zeit für den Eintrag
      const startTime = new Date(rec.start || rec.startDate)
        .toISOString()
        .split("T")[1]
        .substr(0, 5);
      const endTime = new Date(rec.end || rec.endDate || rec.stopDate)
        .toISOString()
        .split("T")[1]
        .substr(0, 5);

      // Aktivität zur Map hinzufügen
      if (!day.map.has(title)) {
        day.map.set(title, {
          mins: 0,
          notes: [],
          isTitleWithParentheses: hasParentheses,
          entries: [],
        });
      }

      const act = day.map.get(title)!;
      act.mins += durMins;
      act.isTitleWithParentheses = hasParentheses;

      // Notiz hinzufügen und Einträge verfolgen
      if (note && !act.notes.includes(note)) act.notes.push(note);

      // Eintrag hinzufügen
      act.entries.push({
        hasNotes: !!note || hasParentheses,
        start: startTime,
        end: endTime,
      });
    });

    // Zweite Verarbeitung: Nach Tag die Aktivitäten auswerten und fehlende Notizen identifizieren
    days = Array.from(dayMap.entries())
      .map(([date, { total, map }]) => {
        const activities: Activity[] = [];
        const missingEntries: {
          activity: string;
          start: string;
          end: string;
          isCritical: boolean;
        }[] = [];

        let hasCriticalActivities = false;
        let hasIncompleteActivities = false;

        // Für jede Aktivität an diesem Tag
        for (const [
          title,
          { mins, notes, isTitleWithParentheses, entries },
        ] of map.entries()) {
          // Anzahl Einträge ohne Notizen
          const entriesWithoutNotes = entries.filter((e) => !e.hasNotes);

          // Wenn diese Aktivität gar keine Notizen hat und nicht im Title(Text) Format ist,
          // dann ist sie kritisch
          const isActivityCritical =
            notes.length === 0 && !isTitleWithParentheses;

          if (isActivityCritical) {
            hasCriticalActivities = true;
          }

          // Wenn es Einträge ohne Notizen gibt, aber die Aktivität selbst nicht kritisch ist
          const hasMissingEntries =
            entriesWithoutNotes.length > 0 && !isActivityCritical;

          if (hasMissingEntries) {
            hasIncompleteActivities = true;
          }

          // Aktivität zur Liste hinzufügen
          activities.push({
            title,
            minutes: mins,
            notes,
            isTitleWithParentheses,
            hasMissingEntries,
          });

          // Einträge ohne Notizen zur Liste der fehlenden Einträge hinzufügen
          entriesWithoutNotes.forEach((entry) => {
            missingEntries.push({
              activity: title,
              start: entry.start,
              end: entry.end,
              isCritical: isActivityCritical,
            });
          });
        }

        return {
          date,
          minutes: total,
          activities: activities.sort((a, b) => b.minutes - a.minutes), // Nach Dauer sortieren
          hasIncompleteActivities,
          hasCriticalActivities,
          missingEntries,
          isExpanded: false,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // Metadaten aktualisieren
    metadata = {
      startDate,
      endDate,
      entryCount: records.length,
      totalMinutes,
      lastUpdated: new Date().toISOString(),
    };

    // Nach der Verarbeitung Monatsgruppen aktualisieren
    updateMonthGroups();

    // Speichern im sessionStorage
    saveToStorage();
  }

  function formatDate(isoDate: string): string {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    return date.toLocaleDateString("de-DE");
  }

  function copyDuration(day: DayEntry) {
    navigator.clipboard.writeText(formatMins(day.minutes));
  }
  function copyActivities(day: DayEntry) {
    const lines = day.activities.map((act) => {
      const notes = act.notes.join(", ");
      return notes ? `${act.title} # ${notes}` : act.title;
    });
    navigator.clipboard.writeText(lines.join("; "));
  }
  function copyActivity(act: Activity) {
    const notesStr = act.notes.join(", ");
    navigator.clipboard.writeText(
      notesStr ? `${act.title} # ${notesStr}` : act.title,
    );
  }

  function toggleDay(day: DayEntry, event?: KeyboardEvent) {
    if (event && event.key !== "Enter" && event.key !== " ") return;
    day.isExpanded = !day.isExpanded;
    days = [...days]; // Ensure reactivity
    saveToStorage(); // Speichern bei Änderungen
  }
</script>

<main class="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
  <div
    class="w-full mx-auto px-4 sm:px-6 md:max-w-3xl lg:max-w-4xl xl:max-w-5xl"
  >
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Timesheet Formatter
      </h1>
    </div>
    <div class="mb-4">
      <details class="bg-indigo-50 dark:bg-gray-800 rounded p-4 shadow">
        <summary
          class="font-semibold cursor-pointer text-indigo-700 dark:text-indigo-300"
          >Schnellanleitung: Export aus Timing</summary
        >
        <ul
          class="list-disc pl-6 mt-3 text-sm text-gray-800 dark:text-gray-200 space-y-1"
        >
          <li>Wechsle im Export-Dialog von Timing auf <b>Erweitert</b>.</li>
          <li>
            Wähle bei <b>Gruppieren nach</b>: <b>Rohdaten (für Export)</b>.
          </li>
          <li>Aktiviere nur <b>Tätigkeiten</b> (alles andere deaktivieren).</li>
          <li>Wähle als <b>Dateiformat</b>: <b>JSON</b>.</li>
          <li>Stelle <b>Format für Zeitdauer</b> auf <b>XX:YY:ZZ</b>.</li>
          <li>Klicke auf <b>Export…</b> und wähle die Datei aus.</li>
        </ul>
        <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          <b>Tipp:</b> Notizen werden nur exportiert, wenn sie in Timing sichtbar
          sind und die Option aktiviert ist.
        </div>
      </details>
    </div>
    <div class="mb-6 grid gap-6 sm:grid-cols-2">
      <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
        <h3 class="font-semibold text-gray-900 dark:text-white mb-4">
          Datei importieren
        </h3>
        <label class="block w-full cursor-pointer">
          <span
            class="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg font-medium text-sm text-center transition-colors w-full"
          >
            <Icon src={PlusCircle} class="w-5 h-5" />
            JSON-Datei auswählen
          </span>
          <input
            type="file"
            accept="application/json"
            on:change={handleFileChange}
            class="hidden"
          />
        </label>
      </div>

      <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
        <h3 class="font-semibold text-gray-900 dark:text-white mb-4">
          Einstellungen
        </h3>
        <div class="flex flex-col">
          <label
            for="rounding"
            class="text-sm text-gray-700 dark:text-gray-300 mb-2"
            >Zeitrundung:</label
          >
          <select
            id="rounding"
            bind:value={rounding}
            on:change={saveToStorage}
            class="block w-full rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2.5 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            {#each roundOptions as opt}
              <option value={opt}>{opt} Minuten</option>
            {/each}
          </select>
        </div>
      </div>
    </div>

    {#if metadata}
      <div class="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Übersicht
        </h2>
        <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div class="text-gray-600 dark:text-gray-400">Zeitraum:</div>
          <div class="text-gray-900 dark:text-gray-100">
            {formatDate(metadata.startDate)} bis {formatDate(metadata.endDate)}
          </div>

          <div class="text-gray-600 dark:text-gray-400">Anzahl Einträge:</div>
          <div class="text-gray-900 dark:text-gray-100">
            {metadata.entryCount}
          </div>

          <div class="text-gray-600 dark:text-gray-400">Gesamtdauer:</div>
          <div class="text-gray-900 dark:text-gray-100">
            {formatMins(metadata.totalMinutes)}
          </div>
        </div>
        <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Die Daten bleiben bis zum Schließen des Browsers gespeichert.
        </div>

        <!-- Bereich für "Alle kopieren" Funktionalität -->
        <div class="mt-4 flex justify-end space-x-3">
          {#if monthGroups.length > 1}
            <div class="dropdown inline-block relative">
              <button
                class="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-800/40 text-purple-600 dark:text-purple-400 rounded transition-colors"
              >
                <Icon src={ClipboardDocument} class="w-4 h-4" />
                <span>Alle als JSON kopieren</span>
                <Icon src={ChevronDown} class="w-4 h-4" />
              </button>
              <div
                class="dropdown-content hidden absolute right-0 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-lg z-10 min-w-48"
              >
                <div class="p-2">
                  <button
                    on:click={copyAllAsJson}
                    class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded flex items-center gap-2"
                  >
                    <Icon src={ClipboardDocument} class="w-4 h-4" />
                    <span>Alle Einträge</span>
                  </button>
                  <div
                    class="border-t border-gray-200 dark:border-gray-700 my-1"
                  ></div>
                  {#each monthGroups as monthGroup}
                    <button
                      on:click={() => copyMonthAsJson(monthGroup)}
                      class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded flex items-center gap-2"
                    >
                      <Icon src={ClipboardDocument} class="w-4 h-4" />
                      <span>{formatMonthName(monthGroup.month)}</span>
                    </button>
                  {/each}
                </div>
              </div>
            </div>
          {:else}
            <button
              on:click={copyAllAsJson}
              class="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-800/40 text-purple-600 dark:text-purple-400 rounded transition-colors"
            >
              <Icon src={ClipboardDocument} class="w-4 h-4" />
              <span>Alle als JSON kopieren</span>
            </button>
          {/if}
        </div>
      </div>
    {/if}

    {#each days as day}
      <section
        class="mt-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden"
      >
        <div
          class="flex flex-wrap items-center border-b border-gray-200 dark:border-gray-700"
        >
          <button
            class="flex-grow px-4 py-3 text-left flex flex-wrap items-center gap-2 cursor-pointer focus:outline-none hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            on:click={() => toggleDay(day)}
            on:keydown={(e) => toggleDay(day, e)}
            aria-expanded={day.isExpanded}
            aria-controls={`day-content-${day.date}`}
          >
            <span
              class="font-semibold text-gray-900 dark:text-gray-100 mr-2 whitespace-nowrap"
            >
              {day.date}
            </span>
            <span
              class="text-gray-700 dark:text-gray-300 whitespace-nowrap flex items-center gap-1"
            >
              <Icon src={Clock} class="w-4 h-4" />
              {formatMins(day.minutes)}
            </span>
            {#if day.hasCriticalActivities}
              <span
                class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white whitespace-nowrap"
              >
                {day.missingEntries.filter((e) => e.isCritical).length} fehlende
                Notizen
              </span>
            {:else if day.hasIncompleteActivities}
              <span
                class="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-400 text-amber-900 whitespace-nowrap"
              >
                Unvollständig
              </span>
            {/if}
            <Icon
              src={ChevronDown}
              class="w-5 h-5 ml-auto transition-transform transform {day.isExpanded
                ? 'rotate-180'
                : ''}"
              aria-hidden="true"
            />
          </button>
          <div class="flex items-center px-4 py-2 space-x-2">
            <button
              type="button"
              class="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-800/40 text-blue-600 dark:text-blue-400 rounded transition-colors"
              on:click={() => copyActivities(day)}
              title="Aktivitäten kopieren"
            >
              <Icon src={DocumentText} class="w-4 h-4" />
              <span class="hidden sm:inline">Aktivitäten</span>
            </button>
            <button
              type="button"
              class="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-800/40 text-blue-600 dark:text-blue-400 rounded transition-colors"
              on:click={() => copyDuration(day)}
              title="Dauer kopieren"
            >
              <Icon src={Clock} class="w-4 h-4" />
              <span class="hidden sm:inline">Dauer</span>
            </button>
          </div>
        </div>

        {#if day.hasCriticalActivities}
          <div
            class="px-4 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20"
          >
            <div class="font-semibold mb-1">Aktivitäten ohne Notizen:</div>
            <ul class="ml-4 list-disc list-inside">
              {#each day.activities.filter((act) => act.notes.length === 0 && !act.isTitleWithParentheses) as act}
                <li>{act.title} ({formatMins(act.minutes)})</li>
              {/each}
            </ul>
          </div>
        {:else if day.hasIncompleteActivities && !day.isExpanded}
          <div
            class="px-4 py-2 text-sm text-amber-800 bg-amber-50 dark:bg-amber-900/10"
          >
            <div class="font-medium">
              Einige Aktivitäten haben unvollständige Notizen.
            </div>

            <!-- Gruppiere fehlende Einträge nach Aktivitäten -->
            {#each day.activities.filter((a) => a.hasMissingEntries) as act}
              <div class="mt-1">
                <div class="font-medium">{act.title}:</div>
                <ul class="ml-4 list-disc list-inside text-xs">
                  {#each day.missingEntries.filter((e) => !e.isCritical && e.activity === act.title) as entry}
                    <li>{entry.start}–{entry.end}</li>
                  {/each}
                </ul>
              </div>
            {/each}
          </div>
        {/if}

        {#if day.isExpanded}
          <div id="day-content-{day.date}" class="space-y-4 p-4">
            {#each day.activities as act}
              <div
                class="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg {act.notes
                  .length === 0 && !act.isTitleWithParentheses
                  ? 'border-l-4 border-red-500'
                  : act.hasMissingEntries
                    ? 'border-l-4 border-amber-400'
                    : ''}"
              >
                <div class="flex justify-between items-center">
                  <span class="text-gray-900 dark:text-gray-100">
                    {act.title} – {formatMins(act.minutes)}
                    {#if act.notes.length === 0 && !act.isTitleWithParentheses}
                      <span
                        class="ml-2 px-1.5 py-0.5 rounded text-xs font-medium bg-red-600 text-white"
                        >Keine Notiz</span
                      >
                    {:else if act.hasMissingEntries}
                      <span
                        class="ml-2 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-400 text-amber-900"
                        >Unvollständig</span
                      >
                    {/if}
                    {#if act.isTitleWithParentheses}
                      <span
                        class="ml-2 text-xs text-gray-500 dark:text-gray-400"
                        >Benötigt keine weiteren Notizen</span
                      >
                    {/if}
                  </span>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-800/40 text-blue-600 dark:text-blue-400 rounded transition-colors"
                    on:click={() => copyActivity(act)}
                    title="Aktivität kopieren"
                  >
                    <Icon src={ClipboardDocument} class="w-3.5 h-3.5" />
                    <span>Kopieren</span>
                  </button>
                </div>

                {#if act.hasMissingEntries}
                  <div
                    class="mt-2 mb-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 px-3 py-1.5 rounded"
                  >
                    <div class="font-medium mb-1">Fehlende Notizen für:</div>
                    <ul class="list-disc list-inside">
                      {#each day.missingEntries.filter((e) => !e.isCritical && e.activity === act.title) as entry}
                        <li>{entry.start}–{entry.end}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}

                {#if act.notes.length > 0}
                  <ul
                    class="ml-6 mt-2 list-disc space-y-1 text-sm text-gray-600 dark:text-gray-400"
                  >
                    {#each act.notes as note}
                      <li>{note}</li>
                    {/each}
                  </ul>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </section>
    {/each}
  </div>
</main>

<style>
  .dropdown {
    position: relative;
  }

  .dropdown:hover .dropdown-content {
    display: block;
  }
</style>
