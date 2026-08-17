import { createSlice, createAsyncThunk, isPending, isRejected } from "@reduxjs/toolkit";
import { apiRequest } from "../../api/client";

const normalizeTask = (t) => ({
  id: t.id,
  tenantId: t.tenant_id,
  title: t.title,
  description: t.description,
  relatedEntityType: t.related_entity_type,
  relatedEntityId: t.related_entity_id,
  assignedTo: t.assigned_to,
  createdBy: t.created_by,
  dueDate: t.due_date,
  priority: t.priority,
  status: t.status,
  completedAt: t.completed_at,
  createdAt: t.created_at,
  updatedAt: t.updated_at,
});

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
};

export const fetchTasks = createAsyncThunk(
  "tasks/fetchTasks",
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/tasks${buildQuery(params)}`, { token: getState().auth.accessToken });
      return { list: (res.data.items || []).map(normalizeTask), meta: res.data.pagination };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createTask = createAsyncThunk(
  "tasks/createTask",
  async ({ title, description, dueDate, priority, relatedEntityType, relatedEntityId, assignedTo }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest("/tasks", {
        method: "POST",
        body: { title, description, dueDate, priority, relatedEntityType, relatedEntityId, assignedTo },
        token: getState().auth.accessToken,
      });
      return normalizeTask(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateTask = createAsyncThunk(
  "tasks/updateTask",
  async ({ id, ...data }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/tasks/${id}`, {
        method: "PUT",
        body: data,
        token: getState().auth.accessToken,
      });
      return normalizeTask(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const completeTask = createAsyncThunk(
  "tasks/completeTask",
  async (id, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/tasks/${id}/complete`, {
        method: "PUT",
        token: getState().auth.accessToken,
      });
      return normalizeTask(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const mutationThunks = [createTask, updateTask, completeTask];

const tasksSlice = createSlice({
  name: "tasks",
  initialState: {
    list: [],
    meta: null,
    status: "idle", // idle | loading | succeeded | failed
    error: null,
    mutationStatus: "idle",
    mutationError: null,
  },
  reducers: {
    clearTasksError(state) {
      state.error = null;
      state.mutationError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload.list;
        state.meta = action.payload.meta;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to load tasks.";
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.list = [action.payload, ...state.list];
      })
      .addMatcher(
        (action) => [updateTask, completeTask].some((t) => t.fulfilled.match(action)),
        (state, action) => {
          state.list = state.list.map((t) => (t.id === action.payload.id ? action.payload : t));
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

export const { clearTasksError } = tasksSlice.actions;
export default tasksSlice.reducer;
