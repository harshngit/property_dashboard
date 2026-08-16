import Select from "./Select";

export function TextField({ label, error, className = "", ...props }) {
  return (
    <div className={className}>
      <label className="field-label">{label}</label>
      <input className="field-input" {...props} />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function SelectField({ label, options = [], error, className = "", value, onChange, disabled, placeholder }) {
  return (
    <div className={className}>
      <label className="field-label">{label}</label>
      <Select
        value={value}
        onChange={(val) => onChange?.({ target: { value: val } })}
        options={options}
        disabled={disabled}
        placeholder={placeholder}
      />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function TextareaField({ label, error, className = "", ...props }) {
  return (
    <div className={className}>
      <label className="field-label">{label}</label>
      <textarea className="field-input min-h-[100px] resize-y" {...props} />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
