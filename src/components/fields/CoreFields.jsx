import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useApiQuery } from "../../hooks/useApi";

// Built-in fields in the Dynamic Field Manager. A form wraps itself in
// <CoreFieldsProvider entityType="property" labels={{ "City": "city", ... }}>;
// TextField / SelectField / TextareaField then pick up what the Super Admin
// set for that field - a new label, help text, required, or hidden - by the
// label the form was written with. A form that is not wrapped is unchanged.
//
// Each section of the form ends with <CoreSlot section="Property details" />.
// A built-in field the Super Admin moved to another section is drawn into that
// section's slot (a portal, so it keeps its state and handlers); if the form
// has no such section it stays where it was written.

const Ctx = createContext(null);

export function CoreFieldsProvider({ entityType, labels, children }) {
  const { data } = useApiQuery(`/fields/form?entityType=${entityType}`);
  const [slots, setSlots] = useState({});
  // A section that unmounts (e.g. deal details when the category changes) drops its slot.
  const register = useCallback(
    (section, node) =>
      setSlots((s) => {
        if (node) return s[section] === node ? s : { ...s, [section]: node };
        if (!(section in s)) return s;
        const { [section]: _gone, ...rest } = s; // eslint-disable-line no-unused-vars
        return rest;
      }),
    []
  );
  const value = useMemo(() => ({ core: data?.core || {}, labels, slots, register }), [data, labels, slots, register]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Where moved built-in fields land in a section. `display: contents` makes them
// items of the section's own grid, so they line up with its other fields.
export function CoreSlot({ section }) {
  const ctx = useContext(Ctx);
  const register = ctx?.register;
  const ref = useCallback((node) => register?.(section, node), [register, section]);
  if (!ctx) return null;
  return <div ref={ref} style={{ display: "contents" }} data-core-slot={section} />;
}

// What to do with the field a form labelled `label`: { label, helpText, hidden, required, style, place }.
// place(element) draws the field where the Super Admin put it.
export function useCoreField(label) {
  const ctx = useContext(Ctx);
  const key = ctx && typeof label === "string" ? ctx.labels[label] : null;
  const c = key ? ctx.core[key] : null;
  if (!c) return { label, hidden: false, helpText: null, style: undefined, place: (el) => el };
  let text = c.relabelled ? c.label : label;
  if (c.required && !c.locked && !/\*\s*$/.test(text)) text = `${text.replace(/\s*\(optional\)\s*$/i, "")} *`;
  const target = c.section ? ctx.slots[c.section] : null;
  return {
    label: text,
    hidden: c.hidden && !c.locked,
    helpText: c.helpText,
    // Once the Super Admin has moved a built-in field, the fields of a section follow that order.
    style: c.order === null || c.order === undefined ? undefined : { order: c.order },
    place: (el) => (target ? createPortal(el, target) : el),
  };
}
