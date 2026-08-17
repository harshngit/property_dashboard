import { createSlice, createAsyncThunk, isPending, isRejected } from "@reduxjs/toolkit";
import { apiRequest } from "../../api/client";

const normalizeUserRow = (u) => ({
  ...u,
  id: u.id || u._id,
  name: u.fullName || u.name || u.full_name,
  fullName: u.fullName || u.full_name || u.name,
  role: u.role || u.role_name,
  tenantId: u.tenantId || u.tenant_id,
  tenantName: u.tenantName || u.tenant_name,
  profilePictureUrl: u.profilePictureUrl || u.profile_picture_url,
  emailVerified: u.emailVerified ?? u.email_verified,
  mobileVerified: u.mobileVerified ?? u.mobile_verified,
  lastLoginAt: u.lastLoginAt || u.last_login_at,
  createdAt: u.createdAt || u.created_at,
  updatedAt: u.updatedAt || u.updated_at,
});

export const fetchUsers = createAsyncThunk(
  "users/fetchUsers",
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") query.set(key, value);
      });
      const qs = query.toString();
      const res = await apiRequest(`/users${qs ? `?${qs}` : ""}`, {
        token: getState().auth.accessToken,
      });
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : raw?.users || raw?.items || [];
      const meta = Array.isArray(raw)
        ? null
        : { total: raw?.total, page: raw?.page, limit: raw?.limit, totalPages: raw?.totalPages };
      return { list: list.map(normalizeUserRow), meta };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateUser = createAsyncThunk(
  "users/updateUser",
  async ({ id, ...patch }, { getState, rejectWithValue }) => {
    try {
      const body = {};
      if (patch.fullName !== undefined) body.fullName = patch.fullName;
      if (patch.email !== undefined) body.email = patch.email;
      if (patch.mobile !== undefined) body.mobile = patch.mobile;
      if (patch.status !== undefined) body.status = patch.status;
      if (patch.tenantId !== undefined) body.tenantId = patch.tenantId;
      const res = await apiRequest(`/users/${id}`, {
        method: "PUT",
        body,
        token: getState().auth.accessToken,
      });
      return normalizeUserRow(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteUser = createAsyncThunk(
  "users/deleteUser",
  async (id, { getState, rejectWithValue }) => {
    try {
      await apiRequest(`/users/${id}`, { method: "DELETE", token: getState().auth.accessToken });
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const changeUserRole = createAsyncThunk(
  "users/changeUserRole",
  async ({ id, role }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/users/${id}/role`, {
        method: "PUT",
        body: { role },
        token: getState().auth.accessToken,
      });
      return normalizeUserRow(res.data || { id, role });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const resetUserPassword = createAsyncThunk(
  "users/resetUserPassword",
  async ({ id, newPassword }, { getState, rejectWithValue }) => {
    try {
      await apiRequest(`/users/${id}/password`, {
        method: "PUT",
        body: { newPassword },
        token: getState().auth.accessToken,
      });
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const mutationThunks = [updateUser, deleteUser, changeUserRole, resetUserPassword];

const usersSlice = createSlice({
  name: "users",
  initialState: {
    list: [],
    meta: null,
    status: "idle", // idle | loading | succeeded | failed
    error: null,
    mutationStatus: "idle",
    mutationError: null,
  },
  reducers: {
    clearUsersError(state) {
      state.error = null;
      state.mutationError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload.list;
        state.meta = action.payload.meta;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to load users.";
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.list = state.list.map((u) => (u.id === action.payload.id ? { ...u, ...action.payload } : u));
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.list = state.list.filter((u) => u.id !== action.payload);
      })
      .addCase(changeUserRole.fulfilled, (state, action) => {
        state.list = state.list.map((u) => (u.id === action.payload.id ? { ...u, ...action.payload } : u));
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

export const { clearUsersError } = usersSlice.actions;
export default usersSlice.reducer;
