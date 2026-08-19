import { useEffect, useRef, useState } from "react";

const toDisplayDate = (value) => {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value);
};

const toIsoDate = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";

  let match = text.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (
      date.getFullYear() === Number(year) &&
      date.getMonth() === Number(month) - 1 &&
      date.getDate() === Number(day)
    ) {
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (
      date.getFullYear() === Number(year) &&
      date.getMonth() === Number(month) - 1 &&
      date.getDate() === Number(day)
    ) {
      return text;
    }
  }

  return null;
};

export default function DateInput({ value, onChange, placeholder = "DD/MM/YYYY", ...props }) {
  const pickerRef = useRef(null);
  const [manualValue, setManualValue] = useState(toDisplayDate(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setManualValue(toDisplayDate(value));
    setInvalid(false);
  }, [value]);

  const commitManualDate = () => {
    const parsed = toIsoDate(manualValue);
    if (parsed === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onChange?.({ target: { value: parsed } });
    setManualValue(toDisplayDate(parsed));
  };

  const openCalendar = () => {
    const input = pickerRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") input.showPicker();
    else input.click();
  };

  return (
    <div className={`date-input-wrap${invalid ? " date-input-invalid" : ""}`}>
      <input
        {...props}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={manualValue}
        onChange={(e) => {
          setManualValue(e.target.value);
          setInvalid(false);
        }}
        onBlur={commitManualDate}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitManualDate();
          }
        }}
        aria-invalid={invalid}
      />
      <button
        type="button"
        className="date-picker-button"
        onClick={openCalendar}
        aria-label="Open calendar"
        title="Open calendar"
      >
        📅
      </button>
      <input
        ref={pickerRef}
        className="native-date-picker"
        type="date"
        tabIndex="-1"
        value={toIsoDate(value) || ""}
        onChange={(e) => {
          setInvalid(false);
          onChange?.(e);
          setManualValue(toDisplayDate(e.target.value));
        }}
        aria-hidden="true"
      />
      {invalid && <small className="date-input-error">Enter a valid date as DD/MM/YYYY.</small>}
    </div>
  );
}
