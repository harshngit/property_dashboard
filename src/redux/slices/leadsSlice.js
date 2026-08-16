import { createSlice, createAsyncThunk, isPending, isRejected } from "@reduxjs/toolkit";
import { apiRequest } from "../../api/client";

const normalizeLead = (l) =>
  l
    ? {
        id: l.id,
        tenantId: l.tenant_id,
        source: l.source,
        status: l.status,
        createdAt: l.created_at,
        updatedAt: l.updated_at,
        createdBy: l.created_by,
        createdByName: l.created_by_name,
        assignedTo: l.assigned_to,
        assignedToName: l.assigned_to_name,
        customerId: l.customer_id,
        customerName: l.customer_name,
        customerEmail: l.customer_email,
        customerMobile: l.customer_mobile,
        budgetMin: l.customer_budget_min,
        budgetMax: l.customer_budget_max,
        propertyId: l.property_id,
        propertyTitle: l.property_title,
        propertyPrice: l.property_price,
      }
    : null;

const normalizeTimelineEntry = (t) => ({
  type: t.type,
  id: t.id,
  leadId: t.lead_id,
  authorName: t.author_name,
  note: t.note,
  action: t.action,
  details: t.details,
  createdAt: t.created_at,
});

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
};

export const fetchLeads = createAsyncThunk(
  "leads/fetchLeads",
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/leads${buildQuery(params)}`, { token: getState().auth.accessToken });
      return {
        list: (res.data.items || []).map(normalizeLead),
        meta: res.data.pagination,
      };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchLeadById = createAsyncThunk(
  "leads/fetchLeadById",
  async (id, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/leads/${id}`, { token: getState().auth.accessToken });
      return normalizeLead(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createLead = createAsyncThunk(
  "leads/createLead",
  async ({ customerId, source, propertyId, assignedTo }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest("/leads", {
        method: "POST",
        body: { customerId, source, propertyId: propertyId || undefined, assignedTo: assignedTo || undefined },
        token: getState().auth.accessToken,
      });
      return normalizeLead(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateLead = createAsyncThunk(
  "leads/updateLead",
  async ({ id, source, propertyId }, { getState, rejectWithValue }) => {
    try {
      const body = {};
      if (source !== undefined) body.source = source;
      if (propertyId !== undefined) body.propertyId = propertyId || null;
      const res = await apiRequest(`/leads/${id}`, {
        method: "PUT",
        body,
        token: getState().auth.accessToken,
      });
      return normalizeLead(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const assignLead = createAsyncThunk(
  "leads/assignLead",
  async ({ id, assignedTo }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/leads/${id}/assign`, {
        method: "PUT",
        body: { assignedTo },
        token: getState().auth.accessToken,
      });
      return normalizeLead(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateLeadStatus = createAsyncThunk(
  "leads/updateLeadStatus",
  async ({ id, status }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/leads/${id}/status`, {
        method: "PUT",
        body: { status },
        token: getState().auth.accessToken,
      });
      return normalizeLead(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const addLeadNote = createAsyncThunk(
  "leads/addLeadNote",
  async ({ id, note }, { getState, rejectWithValue }) => {
    try {
      await apiRequest(`/leads/${id}/notes`, {
        method: "POST",
        body: { note },
        token: getState().auth.accessToken,
      });
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchLeadTimeline = createAsyncThunk(
  "leads/fetchLeadTimeline",
  async (id, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/leads/${id}/timeline`, { token: getState().auth.accessToken });
      return (res.data || []).map(normalizeTimelineEntry);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const mutationThunks = [createLead, updateLead, assignLead, updateLeadStatus, addLeadNote];

const leadsSlice = createSlice({
  name: "leads",
  initialState: {
    list: [],
    meta: null,
    current: null,
    timeline: [],
    status: "idle", // idle | loading | succeeded | failed
    error: null,
    timelineStatus: "idle",
    mutationStatus: "idle",
    mutationError: null,
  },
  reducers: {
    clearLeadsError(state) {
      state.error = null;
      state.mutationError = null;
    },
    clearCurrentLead(state) {
      state.current = null;
      state.timeline = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeads.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchLeads.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload.list;
        state.meta = action.payload.meta;
      })
      .addCase(fetchLeads.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to load leads.";
      })
      .addCase(fetchLeadById.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(fetchLeadTimeline.pending, (state) => {
        state.timelineStatus = "loading";
      })
      .addCase(fetchLeadTimeline.fulfilled, (state, action) => {
        state.timelineStatus = "succeeded";
        state.timeline = action.payload;
      })
      .addCase(fetchLeadTimeline.rejected, (state) => {
        state.timelineStatus = "failed";
      })
      .addCase(createLead.fulfilled, (state, action) => {
        state.list = [action.payload, ...state.list];
      })
      .addMatcher(
        (action) => [updateLead, assignLead, updateLeadStatus].some((t) => t.fulfilled.match(action)),
        (state, action) => {
          state.list = state.list.map((l) => (l.id === action.payload.id ? action.payload : l));
          if (state.current?.id === action.payload.id) state.current = action.payload;
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

export const { clearLeadsError, clearCurrentLead } = leadsSlice.actions;
export default leadsSlice.reducer;
