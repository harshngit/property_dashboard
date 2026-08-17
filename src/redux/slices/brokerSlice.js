import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiRequest } from "../../api/client";

// /broker/leads and /broker/inventory are thin wrappers over GET /leads and
// GET /properties (assignedTo/brokerId forced to the caller) - same enriched
// row shape, so the normalizers here mirror leadsSlice's/propertiesSlice's.
const normalizeLead = (l) => ({
  id: l.id,
  status: l.status,
  source: l.source,
  customerName: l.customer_name,
  customerMobile: l.customer_mobile,
  customerEmail: l.customer_email,
  propertyTitle: l.property_title,
  assignedTo: l.assigned_to,
  createdAt: l.created_at,
  updatedAt: l.updated_at,
});

const normalizeProperty = (p) => ({
  id: p.id,
  title: p.title,
  city: p.city,
  locality: p.locality,
  price: p.price,
  status: p.status,
  propertyType: p.property_type,
  transactionType: p.transaction_type,
  bedrooms: p.bedrooms,
  bathrooms: p.bathrooms,
  areaSqft: p.area_sqft,
  createdAt: p.created_at,
});

const normalizeDashboard = (d) => ({
  leadsByStatus: d.leadsByStatus || {},
  tasksDueToday: d.tasksDueToday || 0,
  overdueTasksCount: d.overdueTasksCount || 0,
  propertiesListedCount: d.propertiesListedCount || 0,
  leadsWonThisMonth: d.leadsWonThisMonth || 0,
});

const normalizeFollowup = (t) => ({
  id: t.id,
  title: t.title,
  description: t.description,
  relatedEntityType: t.related_entity_type,
  relatedEntityId: t.related_entity_id,
  dueDate: t.due_date,
  priority: t.priority,
  status: t.status,
  completedAt: t.completed_at,
});

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
};

export const fetchBrokerDashboard = createAsyncThunk(
  "broker/fetchBrokerDashboard",
  async (_, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest("/broker/dashboard", { token: getState().auth.accessToken });
      return normalizeDashboard(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchBrokerLeads = createAsyncThunk(
  "broker/fetchBrokerLeads",
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/broker/leads${buildQuery(params)}`, { token: getState().auth.accessToken });
      return (res.data.items || []).map(normalizeLead);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchBrokerInventory = createAsyncThunk(
  "broker/fetchBrokerInventory",
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/broker/inventory${buildQuery(params)}`, { token: getState().auth.accessToken });
      return (res.data.items || []).map(normalizeProperty);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchBrokerFollowups = createAsyncThunk(
  "broker/fetchBrokerFollowups",
  async (_, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest("/broker/followups", { token: getState().auth.accessToken });
      return (res.data || []).map(normalizeFollowup);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchBrokerPerformance = createAsyncThunk(
  "broker/fetchBrokerPerformance",
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/broker/performance-report${buildQuery(params)}`, { token: getState().auth.accessToken });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const brokerSlice = createSlice({
  name: "broker",
  initialState: {
    dashboard: null,
    dashboardStatus: "idle", // idle | loading | succeeded | failed
    leads: [],
    leadsStatus: "idle",
    inventory: [],
    inventoryStatus: "idle",
    followups: [],
    followupsStatus: "idle",
    performance: null,
    performanceStatus: "idle",
    error: null,
  },
  reducers: {
    clearBrokerError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrokerDashboard.pending, (state) => {
        state.dashboardStatus = "loading";
      })
      .addCase(fetchBrokerDashboard.fulfilled, (state, action) => {
        state.dashboardStatus = "succeeded";
        state.dashboard = action.payload;
      })
      .addCase(fetchBrokerDashboard.rejected, (state, action) => {
        state.dashboardStatus = "failed";
        state.error = action.payload || "Failed to load dashboard.";
      })
      .addCase(fetchBrokerLeads.pending, (state) => {
        state.leadsStatus = "loading";
      })
      .addCase(fetchBrokerLeads.fulfilled, (state, action) => {
        state.leadsStatus = "succeeded";
        state.leads = action.payload;
      })
      .addCase(fetchBrokerLeads.rejected, (state) => {
        state.leadsStatus = "failed";
      })
      .addCase(fetchBrokerInventory.pending, (state) => {
        state.inventoryStatus = "loading";
      })
      .addCase(fetchBrokerInventory.fulfilled, (state, action) => {
        state.inventoryStatus = "succeeded";
        state.inventory = action.payload;
      })
      .addCase(fetchBrokerInventory.rejected, (state) => {
        state.inventoryStatus = "failed";
      })
      .addCase(fetchBrokerFollowups.pending, (state) => {
        state.followupsStatus = "loading";
      })
      .addCase(fetchBrokerFollowups.fulfilled, (state, action) => {
        state.followupsStatus = "succeeded";
        state.followups = action.payload;
      })
      .addCase(fetchBrokerFollowups.rejected, (state) => {
        state.followupsStatus = "failed";
      })
      .addCase(fetchBrokerPerformance.pending, (state) => {
        state.performanceStatus = "loading";
      })
      .addCase(fetchBrokerPerformance.fulfilled, (state, action) => {
        state.performanceStatus = "succeeded";
        state.performance = action.payload;
      })
      .addCase(fetchBrokerPerformance.rejected, (state) => {
        state.performanceStatus = "failed";
      });
  },
});

export const { clearBrokerError } = brokerSlice.actions;
export default brokerSlice.reducer;
