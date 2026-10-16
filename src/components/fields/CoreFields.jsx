import { createContext, useContext, useMemo } from "react";
import { useApiQuery } from "../../hooks/useApi";

// Built-in fields in the Dynamic Field Manager. A form wraps itself in
// <CoreFieldsProvider entityType="property" labels={{ "City": "city", ... }}>;
// TextField / SelectField / TextareaField then pick up what the Super Admin
// set for that field - a new label, help text, required, or hidden - by the
// label the form was written with. A form that is not wrapped is unchanged.

const Ctx = createContext(null);

export function CoreFieldsProvider({ entityType, labels, children }) {
  const { data } = useApiQuery(`/fields/form?entityType=${entityType}`);
  const value = useMemo(() => ({ core: data?.core || {}, labels }), [data, labels]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// What to do with the field a form labelled `label`: { label, helpText, hidden, required }.
export function useCoreField(label) {
  const ctx = useContext(Ctx);
  const key = ctx && typeof label === "string" ? ctx.labels[label] : null;
  const c = key ? ctx.core[key] : null;
  if (!c) return { label, hidden: false, helpText: null, style: undefined };
  let text = c.relabelled ? c.label : label;
  if (c.required && !c.locked && !/\*\s*$/.test(text)) text = `${text.replace(/\s*\(optional\)\s*$/i, "")} *`;
  // Once the Super Admin has moved a built-in field, the fields of a section follow that order.
  return { label: text, hidden: c.hidden && !c.locked, helpText: c.helpText, style: c.order === null || c.order === undefined ? undefined : { order: c.order } };
}
