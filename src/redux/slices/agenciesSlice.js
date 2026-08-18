import { createSlice, createAsyncThunk, isPending, isRejected } from "@reduxjs/toolkit";
import { apiRequest } from "../../api/client";

const normalizeAgency = (t) =>
  t
    ? {
        id: t.id,
        name: t.name,
        slug: t.slug,
        status: t.status,
        brokerCount: Number(t.broker_count || 0),
        activeListingCount: Number(t.active_listing_count || 0),
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }
    : null;

export const fetchAgencies = createAsyncThunk(
  "agencies/fetchAgencies",
  async (_, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest("/tenants", { token: getState().auth.accessToken });
      return (res.data.items || []).map(normalizeAgency);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createAgency = createAsyncThunk(
  "agencies/createAgency",
  async (data, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest("/tenants", { method: "POST", body: data, token: getState().auth.accessToken });
      return normalizeAgency(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateAgency = createAsyncThunk(
  "agencies/updateAgency",
  async ({ id, ...data }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/tenants/${id}`, { method: "PUT", body: data, token: getState().auth.accessToken });
      return normalizeAgency(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteAgency = createAsyncThunk(
  "agencies/deleteAgency",
  async (id, { getState, rejectWithValue }) => {
    try {
      await apiRequest(`/tenants/${id}`, { method: "DELETE", token: getState().auth.accessToken });
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const mutationThunks = [createAgency, updateAgency, deleteAgency];

const agenciesSlice = createSlice({
  name: "agencies",
  initialState: {
    list: [],
    status: "idle", // idle | loading | succeeded | failed
    error: null,
    mutationStatus: "idle",
    mutationError: null,
  },
  reducers: {
    clearAgenciesError(state) {
      state.error = null;
      state.mutationError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAgencies.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAgencies.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload;
      })
      .addCase(fetchAgencies.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to load agencies.";
      })
      .addCase(createAgency.fulfilled, (state, action) => {
        state.list = [action.payload, ...state.list];
      })
      .addCase(updateAgency.fulfilled, (state, action) => {
        state.list = state.list.map((a) => (a.id === action.payload.id ? action.payload : a));
      })
      .addCase(deleteAgency.fulfilled, (state, action) => {
        state.list = state.list.filter((a) => a.id !== action.payload);
      })
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

export const { clearAgenciesError } = agenciesSlice.actions;
export default agenciesSlice.reducer;
