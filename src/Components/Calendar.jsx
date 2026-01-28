import { useMemo, useState } from "react";
import EventModal from "./EventModal.jsx";

function Calendar({
                    initialDate = new Date(),
                    weekStartsOn = 1, // 0 = Sunday, 1 = Monday
                    onSelectDate,
                  }) {
  const [cursor, setCursor] = useState(() => startOfDay(initialDate));
  const [selected, setSelected] = useState(() => startOfDay(initialDate));

  // Events stored locally for now (later: lift to parent or persist via API)
  // Shape: { id, dateKey: "YYYY-MM-DD", title, type: "me"|"partner"|"family" }
  const [events, setEvents] = useState([]);

  // Popup (modal) state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftDateKey, setDraftDateKey] = useState(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftType, setDraftType] = useState("me"); // "me" | "partner" | "family"

  const model = useMemo(
      () => buildMonthModel(cursor, weekStartsOn),
      [cursor, weekStartsOn],
  );

  const eventsByDateKey = useMemo(() => groupEventsByDateKey(events), [events]);

  function goPrevMonth() {
    setCursor((d) => addMonths(d, -1));
  }

  function goNextMonth() {
    setCursor((d) => addMonths(d, 1));
  }

  function goToday() {
    const today = startOfDay(new Date());
    setCursor(today);
    setSelected(today);
    onSelectDate?.(today);
  }

  function openAddEventModal(day) {
    const key = toDateKey(day);
    setDraftDateKey(key);
    setDraftTitle("");
    setDraftType("me");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setDraftDateKey(null);
    setDraftTitle("");
    setDraftType("me");
  }

  function saveEvent() {
    const title = draftTitle.trim();
    if (!draftDateKey || !title) return;

    setEvents((prev) => [
      {
        id: safeId(),
        dateKey: draftDateKey,
        title,
        type: draftType,
      },
      ...prev,
    ]);

    closeModal();
  }

  function handlePick(day) {
    if (!day) return;

    setSelected(day);
    onSelectDate?.(day);

    // Click a date => open popup to add event there
    openAddEventModal(day);
  }

  const selectedKey = toDateKey(selected);
  const selectedEvents = eventsByDateKey[selectedKey] ?? [];

  return (
      <div style={wrapStyle}>
        <div style={headerStyle}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={goPrevMonth}>
              Prev
            </button>
            <button type="button" onClick={goToday}>
              Today
            </button>
            <button type="button" onClick={goNextMonth}>
              Next
            </button>
          </div>

          <div style={{ fontWeight: 800 }}>{formatMonthYear(cursor)}</div>
        </div>

        <div style={gridStyle}>
          {model.weekdayLabels.map((label) => (
              <div key={label} style={weekdayStyle}>
                {label}
              </div>
          ))}

          {model.cells.map((cell, idx) => {
            const isEmpty = !cell;
            const isToday = cell ? isSameDay(cell, startOfDay(new Date())) : false;
            const isSelected = cell ? isSameDay(cell, selected) : false;

            const dateKey = cell ? toDateKey(cell) : null;
            const dayEvents = dateKey ? eventsByDateKey[dateKey] ?? [] : [];

            const dots = summarizeTypes(dayEvents);

            return (
                <button
                    key={idx}
                    type="button"
                    disabled={isEmpty}
                    onClick={() => handlePick(cell)}
                    style={{
                      ...dayStyle,
                      opacity: isEmpty ? 0.3 : 1,
                      outline: isSelected ? "2px solid rgba(120,180,255,0.95)" : "none",
                      background: isSelected
                          ? "rgba(120,180,255,0.18)"
                          : isToday
                              ? "rgba(80,255,180,0.10)"
                              : "rgba(0,0,0,0.18)",
                    }}
                    aria-label={cell ? cell.toDateString() : "Empty"}
                >
                  <div style={dayInnerStyle}>
                    <div style={dayNumberStyle}>{cell ? cell.getDate() : ""}</div>

                    <div style={dotsRowStyle} aria-hidden="true">
                      {dots.map((t) => (
                          <span
                              key={t}
                              title={typeLabel(t)}
                              style={{
                                ...dotStyle,
                                background: typeColor(t),
                              }}
                          />
                      ))}
                      {dayEvents.length > 3 && (
                          <span style={moreBadgeStyle} title={`${dayEvents.length} events`}>
                      +{dayEvents.length - 3}
                    </span>
                      )}
                    </div>
                  </div>
                </button>
            );
          })}
        </div>

        <div style={footerStyle}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ opacity: 0.8 }}>Selected:</span>
            <strong>{selected.toDateString()}</strong>
            <button type="button" onClick={() => openAddEventModal(selected)} style={smallBtnStyle}>
              Add event
            </button>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Events</div>
            {selectedEvents.length === 0 ? (
                <div style={{ opacity: 0.8 }}>No events yet.</div>
            ) : (
                <ul style={eventsListStyle}>
                  {selectedEvents.map((e) => (
                      <li key={e.id} style={eventItemStyle}>
                  <span
                      style={{
                        ...pillStyle,
                        background: typeColor(e.type),
                      }}
                      title={typeLabel(e.type)}
                  />
                        <span>{e.title}</span>
                      </li>
                  ))}
                </ul>
            )}
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <LegendItem label="Me" color={typeColor("me")} />
            <LegendItem label="Partner" color={typeColor("partner")} />
            <LegendItem label="Family" color={typeColor("family")} />
          </div>
        </div>

        <EventModal
            open={isModalOpen}
            dateKey={draftDateKey}
            title={draftTitle}
            type={draftType}
            onChangeTitle={setDraftTitle}
            onChangeType={setDraftType}
            onCancel={closeModal}
            onSave={saveEvent}
        />
      </div>
  );
}

function LegendItem({ label, color }) {
  return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: color }} />
        <span style={{ opacity: 0.9 }}>{label}</span>
      </div>
  );
}

/** ---------- Event helpers ---------- */
function groupEventsByDateKey(events) {
  const out = Object.create(null);
  for (const e of events) {
    if (!out[e.dateKey]) out[e.dateKey] = [];
    out[e.dateKey].push(e);
  }
  return out;
}

function summarizeTypes(dayEvents) {
  const seen = new Set();
  for (const e of dayEvents) {
    if (e?.type) seen.add(e.type);
  }
  const order = ["me", "partner", "family"];
  return order.filter((t) => seen.has(t)).slice(0, 3);
}

function typeColor(type) {
  if (type === "me") return "rgba(120,180,255,0.95)";
  if (type === "partner") return "rgba(255,140,200,0.95)";
  return "rgba(120,255,170,0.95)";
}

function typeLabel(type) {
  if (type === "me") return "My event";
  if (type === "partner") return "Partner’s event";
  return "Family event";
}

/** ---------- Date helpers (no external libs) ---------- */
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addMonths(date, delta) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + delta);
  const max = daysInMonth(d.getFullYear(), d.getMonth());
  d.setDate(Math.min(day, max));
  return startOfDay(d);
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function isSameDay(a, b) {
  return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
  );
}

function formatMonthYear(date) {
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
}

function buildMonthModel(cursorDate, weekStartsOn) {
  const year = cursorDate.getFullYear();
  const month = cursorDate.getMonth();

  const firstOfMonth = startOfDay(new Date(year, month, 1));
  const lastOfMonth = startOfDay(new Date(year, month, daysInMonth(year, month)));

  const firstDow = firstOfMonth.getDay();
  const leadingEmpty = (firstDow - weekStartsOn + 7) % 7;

  const totalDays = lastOfMonth.getDate();
  const cells = [];

  for (let i = 0; i < leadingEmpty; i++) cells.push(null);
  for (let day = 1; day <= totalDays; day++) {
    cells.push(startOfDay(new Date(year, month, day)));
  }

  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);

  const weekdayLabels = Array.from({ length: 7 }, (_, i) => {
    const dow = (weekStartsOn + i) % 7;
    const ref = new Date(2024, 0, 7 + dow);
    return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(ref);
  });

  return { weekdayLabels, cells };
}

function safeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

/** ---------- Styles ---------- */
const wrapStyle = {
  border: "1px dashed rgba(255,255,255,0.22)",
  borderRadius: 12,
  padding: 12,
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 12,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 8,
};

const weekdayStyle = {
  fontWeight: 700,
  opacity: 0.85,
  padding: "6px 0",
  textAlign: "center",
};

const dayStyle = {
  padding: 0,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  color: "inherit",
  cursor: "pointer",
  minHeight: 54,
  textAlign: "left",
};

const dayInnerStyle = {
  padding: 10,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const dayNumberStyle = {
  fontWeight: 800,
  lineHeight: 1,
};

const dotsRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  minHeight: 12,
};

const dotStyle = {
  width: 9,
  height: 9,
  borderRadius: 999,
};

const moreBadgeStyle = {
  fontSize: 12,
  opacity: 0.85,
};

const footerStyle = {
  marginTop: 12,
  paddingTop: 10,
  borderTop: "1px solid rgba(255,255,255,0.10)",
};

const smallBtnStyle = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
};

const eventsListStyle = {
  margin: 0,
  paddingLeft: 18,
  display: "grid",
  gap: 8,
};

const eventItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const pillStyle = {
  width: 10,
  height: 10,
  borderRadius: 999,
  display: "inline-block",
};

export default Calendar;