import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiRequest } from "../../api/client";

const normalizeCustomer = (c) => ({
  id: c.id,
  tenantId: c.tenant_id,
  tenantName: c.tenant_name,
  userId: c.user_id,
  fullName: c.full_name,
  email: c.email,
  mobile: c.mobile,
  createdByName: c.created_by_name,
  createdAt: c.created_at,
  updatedAt: c.updated_at,
});

const normalizePreferences = (p) =>
  p
    ? {
        budgetMin: p.budget_min,
        budgetMax: p.budget_max,
        preferredLocations: p.preferred_locations || [],
        propertyType: p.property_type,
        transactionType: p.transaction_type,
        bedrooms: p.bedrooms,
        notes: p.notes,
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

export const fetchCustomers = createAsyncThunk(
  "customers/fetchCustomers",
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/customers${buildQuery(params)}`, { token: getState().auth.accessToken });
      return { list: (res.data.items || []).map(normalizeCustomer), meta: res.data.pagination };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchCustomerById = createAsyncThunk(
  "customers/fetchCustomerById",
  async (id, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/customers/${id}`, { token: getState().auth.accessToken });
      return normalizeCustomer(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createCustomer = createAsyncThunk(
  "customers/createCustomer",
  async ({ fullName, email, mobile }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest("/customers", {
        method: "POST",
        body: { fullName, email: email || undefined, mobile: mobile || undefined },
        token: getState().auth.accessToken,
      });
      return normalizeCustomer(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateCustomer = createAsyncThunk(
  "customers/updateCustomer",
  async ({ id, fullName, email, mobile }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/customers/${id}`, {
        method: "PUT",
        body: { fullName, email, mobile },
        token: getState().auth.accessToken,
      });
      return normalizeCustomer(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Fetches everything the "360 profile" panel needs in one go: preferences,
// linked deals and uploaded documents.
export const fetchCustomerProfile = createAsyncThunk(
  "customers/fetchCustomerProfile",
  async (id, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth.accessToken;
      const [prefsRes, dealsRes, docsRes] = await Promise.all([
        apiRequest(`/customers/${id}/preferences`, { token }),
        apiRequest(`/customers/${id}/deals`, { token }),
        apiRequest(`/customers/${id}/documents`, { token }),
      ]);
      return {
        id,
        preferences: normalizePreferences(prefsRes.data),
        deals: dealsRes.data || [],
        documents: docsRes.data || [],
      };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchCustomerPreferences = createAsyncThunk(
  "customers/fetchCustomerPreferences",
  async (id, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/customers/${id}/preferences`, { token: getState().auth.accessToken });
      return { id, preferences: normalizePreferences(res.data) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Requirement/budget capture — same endpoint the "Customer 360" profile
// panel reads from, so setting it here (e.g. from the lead form) shows up
// there too.
export const updateCustomerPreferences = createAsyncThunk(
  "customers/updateCustomerPreferences",
  async ({ id, budgetMin, budgetMax, preferredLocations, propertyType, transactionType, bedrooms, notes }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/customers/${id}/preferences`, {
        method: "PUT",
        body: { budgetMin, budgetMax, preferredLocations, propertyType, transactionType, bedrooms, notes },
        token: getState().auth.accessToken,
      });
      return { id, preferences: normalizePreferences(res.data) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Bulk-fetches each customer's deals (there's no /deals list endpoint) and
// resolves their current pipeline stage from the most recently updated deal,
// so the list page can show live Inquiry / Booking / Closed counts.
export const fetchCustomerDealStages = createAsyncThunk(
  "customers/fetchCustomerDealStages",
  async (customerIds, { getState }) => {
    const token = getState().auth.accessToken;
    const results = await Promise.all(
      customerIds.map(async (id) => {
        try {
          const res = await apiRequest(`/customers/${id}/deals`, { token });
          const deals = res.data || [];
          const latest = deals
            .slice()
            .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))[0];
          return [id, latest?.stage || null];
        } catch {
          return [id, null];
        }
      })
    );
    return results;
  }
);

const customersSlice = createSlice({
  name: "customers",
  initialState: {
    list: [],
    meta: null,
    current: null,
    status: "idle", // idle | loading | succeeded | failed
    error: null,
    profile: null,
    profileStatus: "idle",
    dealStageByCustomer: {},
    preferencesByCustomer: {},
  },
  reducers: {
    clearCustomersError(state) {
      state.error = null;
    },
    clearCustomerProfile(state) {
      state.profile = null;
      state.profileStatus = "idle";
    },
    clearCurrentCustomer(state) {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload.list;
        state.meta = action.payload.meta;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to load customers.";
      })
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.list = [action.payload, ...state.list];
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.list = state.list.map((c) => (c.id === action.payload.id ? action.payload : c));
        if (state.current?.id === action.payload.id) state.current = action.payload;
      })
      .addCase(fetchCustomerProfile.pending, (state) => {
        state.profileStatus = "loading";
      })
      .addCase(fetchCustomerProfile.fulfilled, (state, action) => {
        state.profileStatus = "succeeded";
        state.profile = action.payload;
      })
      .addCase(fetchCustomerProfile.rejected, (state) => {
        state.profileStatus = "failed";
      })
      .addCase(fetchCustomerDealStages.fulfilled, (state, action) => {
        action.payload.forEach(([id, stage]) => {
          state.dealStageByCustomer[id] = stage;
        });
      })
      .addMatcher(
        (action) => [fetchCustomerPreferences, updateCustomerPreferences].some((t) => t.fulfilled.match(action)),
        (state, action) => {
          state.preferencesByCustomer[action.payload.id] = action.payload.preferences;
          if (state.profile?.id === action.payload.id) state.profile.preferences = action.payload.preferences;
        }
      );
  },
});

export const { clearCustomersError, clearCustomerProfile, clearCurrentCustomer } = customersSlice.actions;
export default customersSlice.reducer;
