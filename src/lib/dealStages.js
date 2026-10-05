// Contract deal pipeline (Annexure A Engine 2) - mirrors the backend's
// services/dealStages.js: Lead -> Requirement -> Match -> Site Visit ->
// Negotiation -> Legal Coordination -> Loan Referral -> Insurance Referral
// -> Payment Confirmation -> Closure. One step forward at a time.
export const FLOW = ["inquiry", "requirement", "match", "site_visit", "negotiation", "legal_coordination", "loan_referral", "insurance_referral", "payment", "closed_won"];

export const STAGE_LABEL = {
  inquiry: "Lead",
  requirement: "Requirement",
  match: "Match",
  site_visit: "Site Visit",
  negotiation: "Negotiation",
  legal_coordination: "Legal Coordination",
  loan_referral: "Loan Referral",
  insurance_referral: "Insurance Referral",
  payment: "Payment Confirmation",
  closed_won: "Closure",
  closed_lost: "Closed Lost",
  on_hold: "On Hold",
  booking: "Booking (old)",
  documentation: "Documentation (old)",
};

const OPEN = FLOW.filter((s) => s !== "closed_won");
export const STAGE_TRANSITIONS = {
  ...Object.fromEntries(FLOW.map((s, i) => [s, s === "closed_won" ? [] : [FLOW[i + 1], "on_hold", "closed_lost"]])),
  on_hold: [...OPEN, "closed_lost"],
  closed_lost: [],
  booking: ["legal_coordination", "on_hold", "closed_lost"],
  documentation: ["legal_coordination", "on_hold", "closed_lost"],
};
