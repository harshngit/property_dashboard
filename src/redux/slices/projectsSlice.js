import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiRequest } from "../../api/client";

const normalizeProject = (p) =>
  p
    ? {
        id: p.id,
        tenantId: p.tenant_id,
        builderId: p.builder_id,
        name: p.name,
        description: p.description,
        city: p.city,
        locality: p.locality,
        address: p.address,
        status: p.status,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
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

export const fetchProjects = createAsyncThunk(
  "projects/fetchProjects",
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/projects${buildQuery(params)}`, { token: getState().auth.accessToken });
      return (res.data.items || []).map(normalizeProject);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const projectsSlice = createSlice({
  name: "projects",
  initialState: {
    list: [],
    status: "idle", // idle | loading | succeeded | failed
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to load projects.";
      });
  },
});

export default projectsSlice.reducer;
