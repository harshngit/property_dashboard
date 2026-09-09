import { createSlice, createAsyncThunk, isPending, isRejected } from "@reduxjs/toolkit";
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

const normalizeUnit = (u) =>
  u
    ? {
        id: u.id,
        projectId: u.project_id,
        unitNumber: u.unit_number,
        floor: u.floor,
        size: u.size,
        price: u.price,
        status: u.status,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
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
      return { list: (res.data.items || []).map(normalizeProject), meta: res.data.pagination };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchProjectById = createAsyncThunk(
  "projects/fetchProjectById",
  async (id, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/projects/${id}`, { token: getState().auth.accessToken });
      return normalizeProject(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createProject = createAsyncThunk(
  "projects/createProject",
  async ({ name, description, city, locality, address, builderId }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest("/projects", {
        method: "POST",
        body: { name, description, city, locality, address, builderId: builderId || undefined },
        token: getState().auth.accessToken,
      });
      return normalizeProject(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateProject = createAsyncThunk(
  "projects/updateProject",
  async ({ id, ...patch }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/projects/${id}`, {
        method: "PUT",
        body: patch,
        token: getState().auth.accessToken,
      });
      return normalizeProject(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteProject = createAsyncThunk(
  "projects/deleteProject",
  async (id, { getState, rejectWithValue }) => {
    try {
      await apiRequest(`/projects/${id}`, { method: "DELETE", token: getState().auth.accessToken });
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const bulkDeleteProjects = createAsyncThunk(
  "projects/bulkDeleteProjects",
  async (ids, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest("/projects/bulk-delete", {
        method: "POST",
        body: { ids },
        token: getState().auth.accessToken,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchUnitsByProject = createAsyncThunk(
  "projects/fetchUnitsByProject",
  async ({ projectId, status }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/projects/${projectId}/units${buildQuery({ status })}`, {
        token: getState().auth.accessToken,
      });
      return { projectId, units: (res.data || []).map(normalizeUnit) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createUnit = createAsyncThunk(
  "projects/createUnit",
  async ({ projectId, unitNumber, floor, size, price }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/projects/${projectId}/units`, {
        method: "POST",
        body: { unitNumber, floor, size, price },
        token: getState().auth.accessToken,
      });
      return normalizeUnit(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateUnit = createAsyncThunk(
  "projects/updateUnit",
  async ({ id, ...patch }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/units/${id}`, {
        method: "PUT",
        body: patch,
        token: getState().auth.accessToken,
      });
      return normalizeUnit(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateUnitStatus = createAsyncThunk(
  "projects/updateUnitStatus",
  async ({ id, status }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/units/${id}/status`, {
        method: "PUT",
        body: { status },
        token: getState().auth.accessToken,
      });
      return normalizeUnit(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteUnit = createAsyncThunk(
  "projects/deleteUnit",
  async (id, { getState, rejectWithValue }) => {
    try {
      await apiRequest(`/units/${id}`, { method: "DELETE", token: getState().auth.accessToken });
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const bulkDeleteUnits = createAsyncThunk(
  "projects/bulkDeleteUnits",
  async (ids, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest("/units/bulk-delete", {
        method: "POST",
        body: { ids },
        token: getState().auth.accessToken,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const mutationThunks = [
  createProject,
  updateProject,
  deleteProject,
  bulkDeleteProjects,
  createUnit,
  updateUnit,
  updateUnitStatus,
  deleteUnit,
  bulkDeleteUnits,
];

const projectsSlice = createSlice({
  name: "projects",
  initialState: {
    list: [],
    meta: null,
    current: null,
    unitsByProject: {},
    status: "idle", // idle | loading | succeeded | failed
    error: null,
    mutationStatus: "idle",
    mutationError: null,
  },
  reducers: {
    clearProjectsError(state) {
      state.error = null;
      state.mutationError = null;
    },
    clearCurrentProject(state) {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload.list;
        state.meta = action.payload.meta;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to load projects.";
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.list = [action.payload, ...state.list];
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.list = state.list.map((p) => (p.id === action.payload.id ? action.payload : p));
        if (state.current?.id === action.payload.id) state.current = action.payload;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.list = state.list.filter((p) => p.id !== action.payload);
      })
      .addCase(bulkDeleteProjects.fulfilled, (state, action) => {
        const deleted = new Set(action.payload.deletedIds);
        state.list = state.list.filter((p) => !deleted.has(p.id));
      })
      .addCase(fetchUnitsByProject.fulfilled, (state, action) => {
        state.unitsByProject[action.payload.projectId] = action.payload.units;
      })
      .addCase(createUnit.fulfilled, (state, action) => {
        const units = state.unitsByProject[action.payload.projectId] || [];
        state.unitsByProject[action.payload.projectId] = [action.payload, ...units];
      })
      .addMatcher(
        (action) => [updateUnit, updateUnitStatus].some((t) => t.fulfilled.match(action)),
        (state, action) => {
          const unit = action.payload;
          const units = state.unitsByProject[unit.projectId];
          if (units) {
            state.unitsByProject[unit.projectId] = units.map((u) => (u.id === unit.id ? unit : u));
          }
        }
      )
      .addCase(deleteUnit.fulfilled, (state, action) => {
        Object.keys(state.unitsByProject).forEach((projectId) => {
          state.unitsByProject[projectId] = state.unitsByProject[projectId].filter((u) => u.id !== action.payload);
        });
      })
      .addCase(bulkDeleteUnits.fulfilled, (state, action) => {
        const deleted = new Set(action.payload.deletedIds);
        Object.keys(state.unitsByProject).forEach((projectId) => {
          state.unitsByProject[projectId] = state.unitsByProject[projectId].filter((u) => !deleted.has(u.id));
        });
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

export const { clearProjectsError, clearCurrentProject } = projectsSlice.actions;
export default projectsSlice.reducer;
