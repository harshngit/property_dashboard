export function TextField({ label, error, className = "", ...props }) {
  return (
    <div className={className}>
      <label className="field-label">{label}</label>
      <input className="field-input" {...props} />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function SelectField({ label, options = [], error, className = "", ...props }) {
  return (
    <div className={className}>
      <label className="field-label">{label}</label>
      <select className="field-select" {...props}>
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
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
