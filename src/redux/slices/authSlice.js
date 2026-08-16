import { createSlice, createAsyncThunk, isPending, isRejected } from "@reduxjs/toolkit";
import { apiRequest } from "../../api/client";

const STORAGE_KEY = "ps_crm_session";

const loadSession = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const persistSession = (session) => {
  if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else localStorage.removeItem(STORAGE_KEY);
};

const normalizeUser = (apiUser) =>
  apiUser
    ? {
        ...apiUser,
        id: apiUser.id || apiUser._id,
        name: apiUser.fullName || apiUser.name || apiUser.full_name,
        fullName: apiUser.fullName || apiUser.full_name || apiUser.name,
        role: apiUser.role || apiUser.role_name,
        tenantId: apiUser.tenantId || apiUser.tenant_id,
        tenantName: apiUser.tenantName || apiUser.tenant_name,
        profilePictureUrl: apiUser.profilePictureUrl || apiUser.profile_picture_url,
        emailVerified: apiUser.emailVerified ?? apiUser.email_verified,
        mobileVerified: apiUser.mobileVerified ?? apiUser.mobile_verified,
        lastLoginAt: apiUser.lastLoginAt || apiUser.last_login_at,
        createdAt: apiUser.createdAt || apiUser.created_at,
        updatedAt: apiUser.updatedAt || apiUser.updated_at,
      }
    : null;

const savedSession = loadSession();

const initialState = {
  user: savedSession?.user || null,
  accessToken: savedSession?.accessToken || null,
  refreshToken: savedSession?.refreshToken || null,
  status: "idle", // idle | loading | succeeded | failed
  error: null,
  registeredUser: null,
};

export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async ({ fullName, email, mobile, password, role, tenantId }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest("/auth/register", {
        method: "POST",
        body: { full_name: fullName, email, mobile, password, role, tenant_id: tenantId ?? null },
        token: getState().auth.accessToken || undefined,
      });
      return normalizeUser(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ identifier, password }, { rejectWithValue }) => {
    try {
      const res = await apiRequest("/auth/login", {
        method: "POST",
        body: { identifier, password },
      });
      return { ...res.data, user: normalizeUser(res.data.user) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const sendOtp = createAsyncThunk(
  "auth/sendOtp",
  async ({ identifier, purpose }, { rejectWithValue }) => {
    try {
      const res = await apiRequest("/auth/otp/send", {
        method: "POST",
        body: { identifier, purpose },
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const verifyOtp = createAsyncThunk(
  "auth/verifyOtp",
  async ({ identifier, otp, purpose }, { rejectWithValue }) => {
    try {
      const res = await apiRequest("/auth/otp/verify", {
        method: "POST",
        body: { identifier, otp, purpose },
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const refreshAccessToken = createAsyncThunk(
  "auth/refreshAccessToken",
  async (_, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest("/auth/refresh-token", {
        method: "POST",
        body: { refreshToken: getState().auth.refreshToken },
        skipAuthRefresh: true,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { getState }) => {
    const { accessToken, refreshToken } = getState().auth;
    if (accessToken && refreshToken) {
      try {
        await apiRequest("/auth/logout", {
          method: "POST",
          body: { refreshToken },
          token: accessToken,
        });
      } catch {
        // ignore — clear local session regardless
      }
    }
  }
);

export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async ({ identifier }, { rejectWithValue }) => {
    try {
      const res = await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: { identifier },
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async ({ token, newPassword }, { rejectWithValue }) => {
    try {
      const res = await apiRequest("/auth/reset-password", {
        method: "POST",
        body: { token, newPassword },
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest("/auth/me", { token: getState().auth.accessToken });
      return normalizeUser(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async ({ fullName, email, mobile }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest("/auth/me", {
        method: "PUT",
        body: { fullName, email, mobile },
        token: getState().auth.accessToken,
      });
      return normalizeUser(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const changePassword = createAsyncThunk(
  "auth/changePassword",
  async ({ currentPassword, newPassword }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest("/auth/change-password", {
        method: "PUT",
        body: { currentPassword, newPassword },
        token: getState().auth.accessToken,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const uploadProfilePicture = createAsyncThunk(
  "auth/uploadProfilePicture",
  async (file, { getState, rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiRequest("/auth/me/profile-picture", {
        method: "POST",
        body: formData,
        isFormData: true,
        token: getState().auth.accessToken,
      });
      // Backend only returns { profilePictureUrl }, not a full user - never
      // run a partial response through normalizeUser(), it would stamp
      // id/name/role/etc. as explicit `undefined` and wipe out state.user
      // when merged in.
      return res.data.profilePictureUrl;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const activateUserAccount = createAsyncThunk(
  "auth/activateUserAccount",
  async (userId, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/auth/users/${userId}/activate`, {
        method: "PUT",
        token: getState().auth.accessToken,
      });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const authThunks = [
  registerUser, loginUser, sendOtp, verifyOtp, refreshAccessToken,
  forgotPassword, resetPassword, fetchCurrentUser, updateProfile, changePassword,
  uploadProfilePicture, activateUserAccount,
];

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.status = "idle";
      state.error = null;
      persistSession(null);
    },
    clearAuthError(state) {
      state.error = null;
    },
    clearRegisteredUser(state) {
      state.registeredUser = null;
    },
    // Dispatched by api/client.js after a transparent refresh-on-401.
    tokenRefreshed(state, action) {
      state.accessToken = action.payload.accessToken;
      persistSession({ user: state.user, accessToken: state.accessToken, refreshToken: state.refreshToken });
    },
    // Dispatched by api/client.js when the refresh token is also expired/revoked.
    sessionExpired(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.status = "idle";
      state.error = "Your session has expired. Please log in again.";
      persistSession(null);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.registeredUser = action.payload;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        persistSession({
          user: action.payload.user,
          accessToken: action.payload.accessToken,
          refreshToken: action.payload.refreshToken,
        });
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.status = "succeeded";
        if (action.payload?.accessToken) {
          state.accessToken = action.payload.accessToken;
          state.refreshToken = action.payload.refreshToken;
          persistSession({
            user: state.user,
            accessToken: action.payload.accessToken,
            refreshToken: action.payload.refreshToken,
          });
        }
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken || state.refreshToken;
        persistSession({
          user: state.user,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
        });
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
        persistSession({
          user: state.user,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
        });
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = { ...state.user, ...action.payload };
        persistSession({
          user: state.user,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
        });
      })
      .addCase(uploadProfilePicture.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = { ...state.user, profilePictureUrl: action.payload };
        persistSession({
          user: state.user,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
        });
      })
      .addCase(sendOtp.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(activateUserAccount.fulfilled, (state) => {
        state.status = "succeeded";
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.status = "idle";
        state.error = null;
        persistSession(null);
      })
      .addMatcher(isPending(...authThunks), (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addMatcher(isRejected(...authThunks), (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error?.message || "Something went wrong. Please try again.";
      });
  },
});

export const { logout, clearAuthError, clearRegisteredUser, tokenRefreshed, sessionExpired } = authSlice.actions;
export default authSlice.reducer;
