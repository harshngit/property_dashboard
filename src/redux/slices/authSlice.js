import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { MOCK_USERS } from "../../data/mockData";

const STORAGE_KEY = "ps_crm_session";

const loadSession = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const persistSession = (user) => {
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEY);
};

const fakeDelay = (ms) => new Promise((res) => setTimeout(res, ms));

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password, role }, { rejectWithValue }) => {
    await fakeDelay(900);
    const user = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.role === role
    );
    if (!user) {
      return rejectWithValue(
        "We couldn't match that email and role. Check your details and try again."
      );
    }
    if (password.length < 4) {
      return rejectWithValue("That password looks too short. Try again.");
    }
    return user;
  }
);

export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async ({ name, email, role, agency }, { rejectWithValue }) => {
    await fakeDelay(1000);
    const exists = MOCK_USERS.some((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return rejectWithValue("An account with this email already exists.");
    }
    const newUser = {
      id: `u_${Date.now()}`,
      name,
      email,
      role,
      agency: agency || "Independent",
      avatarColor: ["#2B3A67", "#DC2626", "#FF7A59", "#5C6BB8"][Math.floor(Math.random() * 4)],
      createdAt: new Date().toISOString(),
    };
    return newUser;
  }
);

const initialState = {
  user: loadSession(),
  status: "idle", // idle | loading | succeeded | failed
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.status = "idle";
      state.error = null;
      persistSession(null);
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
        persistSession(action.payload);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Login failed. Please try again.";
      })
      .addCase(registerUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
        persistSession(action.payload);
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Registration failed. Please try again.";
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
