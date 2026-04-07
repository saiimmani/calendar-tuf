"use client";

import Image from "next/image";
import { jsPDF } from "jspdf";
import { useEffect, useMemo, useState } from "react";

type NoteMap = Record<string, string>;

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOLIDAYS: Record<string, string> = {
  "01-01": "New Year",
  "02-14": "Valentine",
  "07-04": "Independence",
  "10-31": "Halloween",
  "12-25": "Christmas",
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isSameDay(a: Date | null, b: Date | null) {
  if (!a || !b) {
    return false;
  }
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isDateInRange(date: Date, start: Date | null, end: Date | null) {
  if (!start || !end) {
    return false;
  }
  return date >= start && date <= end;
}

function buildCalendarGrid(monthDate: Date) {
  const monthStart = startOfMonth(monthDate);
  const monthStartWeekDay = monthStart.getDay();
  const gridStart = addDays(monthStart, -monthStartWeekDay);

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export default function Home() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [monthNotes, setMonthNotes] = useState<NoteMap>({});
  const [rangeNotes, setRangeNotes] = useState<NoteMap>({});
  const [noteTarget, setNoteTarget] = useState<"month" | "range">("month");

  const monthKey = useMemo(() => toMonthKey(currentMonth), [currentMonth]);

  const monthLabel = useMemo(
    () =>
      currentMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [currentMonth],
  );

  const rangeKey = useMemo(() => {
    if (!startDate || !endDate) {
      return "";
    }
    return `${toDateKey(startDate)}_${toDateKey(endDate)}`;
  }, [startDate, endDate]);

  const calendarDays = useMemo(() => buildCalendarGrid(currentMonth), [currentMonth]);

  const previewRangeEnd = useMemo(() => {
    if (startDate && !endDate && hoverDate) {
      return hoverDate > startDate ? hoverDate : startDate;
    }
    return endDate;
  }, [startDate, endDate, hoverDate]);

  const selectedRangeDays = useMemo(() => {
    if (!startDate || !endDate) {
      return 0;
    }
    const diff = endDate.getTime() - startDate.getTime();
    return Math.floor(diff / (24 * 60 * 60 * 1000)) + 1;
  }, [startDate, endDate]);

  useEffect(() => {
    const savedMonthNotes = window.localStorage.getItem("wall-calendar-month-notes");
    const savedRangeNotes = window.localStorage.getItem("wall-calendar-range-notes");

    try {
      if (savedMonthNotes) {
        setMonthNotes(JSON.parse(savedMonthNotes));
      }

      if (savedRangeNotes) {
        setRangeNotes(JSON.parse(savedRangeNotes));
      }
    } catch {
      setMonthNotes({});
      setRangeNotes({});
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "wall-calendar-month-notes",
      JSON.stringify(monthNotes),
    );
  }, [monthNotes]);

  useEffect(() => {
    window.localStorage.setItem(
      "wall-calendar-range-notes",
      JSON.stringify(rangeNotes),
    );
  }, [rangeNotes]);

  const activeNote =
    noteTarget === "month"
      ? monthNotes[monthKey] ?? ""
      : rangeKey
        ? rangeNotes[rangeKey] ?? ""
        : "";

  function selectDate(clickedDate: Date) {
    if (!startDate || (startDate && endDate)) {
      setStartDate(clickedDate);
      setEndDate(null);
      setHoverDate(null);
      return;
    }

    if (clickedDate < startDate) {
      setEndDate(startDate);
      setStartDate(clickedDate);
      return;
    }

    setEndDate(clickedDate);
    setHoverDate(null);
  }

  function changeMonth(offset: number) {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1),
    );
  }

  function handleNoteChange(value: string) {
    if (noteTarget === "month") {
      setMonthNotes((prev) => ({ ...prev, [monthKey]: value }));
      return;
    }

    if (!rangeKey) {
      return;
    }

    setRangeNotes((prev) => ({ ...prev, [rangeKey]: value }));
  }

  function clearSelection() {
    setStartDate(null);
    setEndDate(null);
    setHoverDate(null);
  }

  function jumpToToday() {
    const today = new Date();
    setCurrentMonth(startOfMonth(today));
    setStartDate(today);
    setEndDate(today);
    setHoverDate(null);
  }

  function updateMonthFromInput(value: string) {
    if (!value) {
      return;
    }
    const [yearPart, monthPart] = value.split("-");
    const year = Number(yearPart);
    const month = Number(monthPart);
    if (!Number.isNaN(year) && !Number.isNaN(month)) {
      setCurrentMonth(new Date(year, month - 1, 1));
    }
  }

  function downloadNotes() {
    const exportPayload = {
      monthNotes,
      rangeNotes,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wall-calendar-notes.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function buildNotesText() {
    const monthEntries = Object.entries(monthNotes);
    const rangeEntries = Object.entries(rangeNotes);

    const monthSection = monthEntries.length
      ? monthEntries
          .map(([key, note]) => `Month: ${key}\n${note || "(empty)"}`)
          .join("\n\n")
      : "No monthly notes saved.";

    const rangeSection = rangeEntries.length
      ? rangeEntries
          .map(([key, note]) => `Range: ${key.replace("_", " to ")}\n${note || "(empty)"}`)
          .join("\n\n")
      : "No range notes saved.";

    return [
      "Wall Calendar Notes Export",
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "Monthly Notes",
      "-------------",
      monthSection,
      "",
      "Range Notes",
      "-----------",
      rangeSection,
    ].join("\n");
  }

  function downloadNotesAsText() {
    const textContent = buildNotesText();
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wall-calendar-notes.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadNotesAsPdf() {
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const lines = pdf.splitTextToSize(buildNotesText(), 515);

    let y = 48;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("Wall Calendar Notes", 40, y);
    y += 24;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);

    lines.forEach((line: string) => {
      if (y > 800) {
        pdf.addPage();
        y = 48;
      }
      pdf.text(line, 40, y);
      y += 16;
    });

    pdf.save("wall-calendar-notes.pdf");
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <main className="mx-auto max-w-6xl rounded-[2rem] border border-white/70 bg-[var(--paper)] p-3 shadow-[0_20px_50px_rgba(33,66,85,0.2)] backdrop-blur md:p-5">
        <section className="relative grid overflow-hidden rounded-[1.5rem] border border-sky-100 bg-white md:grid-cols-[1.1fr_1fr]">
          <div className="relative min-h-[360px] overflow-hidden md:min-h-[740px]">
            <div className="absolute left-0 right-0 top-3 z-20 hidden justify-center gap-2 md:flex">
              {Array.from({ length: 22 }).map((_, index) => (
                <span key={index} className="spiral-ring" />
              ))}
            </div>

            <div className="absolute inset-0">
              <Image
                src="/calendar-hero.png"
                alt="Climber on snowy mountain"
                fill
                priority
                className="object-cover object-center"
              />
            </div>

            <div className="hero-wave" />

            <div className="absolute bottom-7 right-6 z-20 text-right text-white md:bottom-12 md:right-10">
              <p className="text-sm tracking-[0.3em] text-sky-100">{currentMonth.getFullYear()}</p>
              <h2 className="text-4xl font-bold uppercase leading-none md:text-5xl">
                {currentMonth.toLocaleDateString("en-US", { month: "long" })}
              </h2>
            </div>
          </div>

          <div className="flex flex-col gap-5 p-5 md:p-8">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-500">
                  Wall Planner
                </p>
                <h1 className="font-serif text-3xl text-slate-800">{monthLabel}</h1>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={monthKey}
                  onChange={(event) => updateMonthFromInput(event.target.value)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600"
                  aria-label="Jump to month"
                />
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-lg text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-50"
                  aria-label="Previous month"
                >
                  {"<"}
                </button>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-lg text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-50"
                  aria-label="Next month"
                >
                  {">"}
                </button>
              </div>
            </header>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="mb-3 flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={jumpToToday}
                  className="rounded-full bg-slate-800 px-3 py-1.5 font-semibold text-white transition hover:bg-slate-700"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded-full bg-slate-200 px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-300"
                >
                  Clear Range
                </button>
              </div>

              <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {WEEK_DAYS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((day) => {
                  const sameMonth = day.getMonth() === currentMonth.getMonth();
                  const start = isSameDay(day, startDate);
                  const end = isSameDay(day, endDate);
                  const inRange = isDateInRange(day, startDate, previewRangeEnd);
                  const holidayKey = `${String(day.getMonth() + 1).padStart(2, "0")}-${String(
                    day.getDate(),
                  ).padStart(2, "0")}`;
                  const holiday = HOLIDAYS[holidayKey];

                  const classes = [
                    "relative h-11 rounded-xl text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500",
                    sameMonth ? "text-slate-700" : "text-slate-300",
                    inRange ? "bg-sky-100" : "hover:bg-sky-50",
                    start || end
                      ? "bg-sky-500 text-white shadow-[0_8px_20px_rgba(14,165,233,0.35)]"
                      : "",
                  ]
                    .join(" ")
                    .trim();

                  return (
                    <button
                      key={toDateKey(day)}
                      className={classes}
                      onMouseEnter={() => setHoverDate(day)}
                      onFocus={() => setHoverDate(day)}
                      onClick={() => selectDate(day)}
                      aria-label={day.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    >
                      {day.getDate()}
                      {holiday ? (
                        <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-orange-400" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Notes Pad
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={downloadNotesAsText}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Export TXT
                  </button>
                  <button
                    type="button"
                    onClick={downloadNotesAsPdf}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Export PDF
                  </button>
                  <button
                    type="button"
                    onClick={downloadNotes}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Export JSON
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setNoteTarget("month")}
                  className={`rounded-full px-3 py-1 font-semibold transition ${
                    noteTarget === "month"
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Monthly Notes
                </button>
                <button
                  type="button"
                  onClick={() => setNoteTarget("range")}
                  className={`rounded-full px-3 py-1 font-semibold transition ${
                    noteTarget === "range"
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Range Notes
                </button>
              </div>

              <p className="text-xs text-slate-500">
                {startDate && endDate
                  ? `Selected ${selectedRangeDays} days from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}.`
                  : "Tap two dates to create a range. Hover or focus a day for live range preview. Holiday markers are shown with orange dots."}
              </p>

              <textarea
                value={activeNote}
                onChange={(event) => handleNoteChange(event.target.value)}
                disabled={noteTarget === "range" && !rangeKey}
                placeholder={
                  noteTarget === "month"
                    ? "Write a memo for this month..."
                    : "Select a full date range first, then add a note for it..."
                }
                className="h-32 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-sky-400"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
