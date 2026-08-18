import { createSlice, createAsyncThunk, isPending, isRejected } from "@reduxjs/toolkit";
import { apiRequest } from "../../api/client";

// Backend deal_stage enum <-> the display label stored on the row and used
// as the DataTable/kanban group key. STAGE_TRANSITIONS mirrors the backend's
// allowed-transitions map (deal.service.js) so an invalid kanban drop is
// rejected client-side too, instead of only failing after a round trip.
export const STAGE_LABELS = {
  inquiry: "Inquiry",
  site_visit: "Site Visit",
  negotiation: "Negotiation",
  booking: "Booking",
  documentation: "Documentation",
  payment: "Payment",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
  on_hold: "On Hold",
};
export const STAGE_VALUES = Object.fromEntries(
  Object.entries(STAGE_LABELS).map(([value, label]) => [label, value])
);
export const STAGE_TRANSITIONS = {
  inquiry: ["site_visit", "on_hold", "closed_lost"],
  site_visit: ["negotiation", "on_hold", "closed_lost"],
  negotiation: ["booking", "on_hold", "closed_lost"],
  booking: ["documentation", "on_hold", "closed_lost"],
  documentation: ["payment", "on_hold", "closed_lost"],
  payment: ["closed_won", "on_hold", "closed_lost"],
  on_hold: ["inquiry", "site_visit", "negotiation", "booking", "documentation", "payment", "closed_lost"],
  closed_won: [],
  closed_lost: [],
};

const normalizeDeal = (d) =>
  d
    ? {
        id: d.id,
        tenantId: d.tenant_id,
        leadId: d.lead_id,
        customerId: d.customer_id,
        customerName: d.customer_name,
        customerEmail: d.customer_email,
        customerMobile: d.customer_mobile,
        propertyId: d.property_id,
        propertyTitle: d.property_title,
        propertyCity: d.property_city,
        unitId: d.unit_id,
        unitNumber: d.unit_number,
        brokerId: d.broker_id,
        brokerName: d.broker_name,
        stage: STAGE_LABELS[d.stage] || d.stage,
        dealValue: d.deal_value,
        commissionAmount: d.commission_amount,
        commissionPercent: d.commission_percent,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        closedAt: d.closed_at,
      }
    : null;

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
};

export const fetchDeals = createAsyncThunk(
  "deals/fetchDeals",
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/deals${buildQuery(params)}`, { token: getState().auth.accessToken });
      return (res.data.items || []).map(normalizeDeal);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createDeal = createAsyncThunk(
  "deals/createDeal",
  async (data, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest("/deals", { method: "POST", body: data, token: getState().auth.accessToken });
      return normalizeDeal(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateDeal = createAsyncThunk(
  "deals/updateDeal",
  async ({ id, ...data }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/deals/${id}`, { method: "PUT", body: data, token: getState().auth.accessToken });
      return normalizeDeal(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateDealStage = createAsyncThunk(
  "deals/updateDealStage",
  async ({ id, stage, notes }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/deals/${id}/stage`, {
        method: "PUT",
        body: { stage, notes },
        token: getState().auth.accessToken,
      });
      return normalizeDeal(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const closeDeal = createAsyncThunk(
  "deals/closeDeal",
  async ({ id, outcome, reason }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/deals/${id}/close`, {
        method: "PUT",
        body: { outcome, reason },
        token: getState().auth.accessToken,
      });
      return normalizeDeal(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const mutationThunks = [createDeal, updateDeal, updateDealStage, closeDeal];

const dealsSlice = createSlice({
  name: "deals",
  initialState: {
    list: [],
    status: "idle", // idle | loading | succeeded | failed
    error: null,
    mutationStatus: "idle",
    mutationError: null,
  },
  reducers: {
    clearDealsError(state) {
      state.error = null;
      state.mutationError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDeals.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchDeals.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload;
      })
      .addCase(fetchDeals.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to load deals.";
      })
      .addCase(createDeal.fulfilled, (state, action) => {
        state.list = [action.payload, ...state.list];
      })
      .addMatcher(
        (action) => [updateDeal, updateDealStage, closeDeal].some((t) => t.fulfilled.match(action)),
        (state, action) => {
          state.list = state.list.map((d) => (d.id === action.payload.id ? action.payload : d));
        }
      )
      .addMatcher(isPending(...mutationThunks), (state) => {
        state.mutationStatus = "loading";
        state.mutationError = null;
      })
      .addMatcher(isRejected(...mutationThunks), (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError = action.payload || "Something went wrong. Please try again.";
      })
      .addMatcher(
        (action) => mutationThunks.some((t) => t.fulfilled.match(action)),
        (state) => {
          state.mutationStatus = "succeeded";
        }
      );
  },
});

export const { clearDealsError } = dealsSlice.actions;
export default dealsSlice.reducer;
