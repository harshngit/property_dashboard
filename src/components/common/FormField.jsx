import Select from "./Select";
import { useCoreField } from "../fields/CoreFields";

// Each field checks whether the Super Admin relabelled, explained or hid it
// in the Dynamic Field Manager (only inside a form wrapped in CoreFieldsProvider).
const Help = ({ text }) => (text ? <p className="mt-1 text-xs text-ink-500">{text}</p> : null);

export function TextField({ label, error, className = "", ...props }) {
  const core = useCoreField(label);
  if (core.hidden) return null;
  return (
    <div className={className} style={core.style}>
      <label className="field-label">{core.label}</label>
      <input className="field-input" {...props} />
      <Help text={core.helpText} />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function SelectField({ label, options = [], error, className = "", value, onChange, disabled, placeholder }) {
  const core = useCoreField(label);
  if (core.hidden) return null;
  return (
    <div className={className} style={core.style}>
      <label className="field-label">{core.label}</label>
      <Select
        value={value}
        onChange={(val) => onChange?.({ target: { value: val } })}
        options={options}
        disabled={disabled}
        placeholder={placeholder}
      />
      <Help text={core.helpText} />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function TextareaField({ label, error, className = "", ...props }) {
  const core = useCoreField(label);
  if (core.hidden) return null;
  return (
    <div className={className} style={core.style}>
      <label className="field-label">{core.label}</label>
      <textarea className="field-input min-h-[100px] resize-y" {...props} />
      <Help text={core.helpText} />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
