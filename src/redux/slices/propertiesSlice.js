import { createSlice, createAsyncThunk, isPending, isRejected } from "@reduxjs/toolkit";
import { apiRequest } from "../../api/client";

const normalizeProperty = (p) =>
  p
    ? {
        id: p.id,
        tenantId: p.tenant_id,
        createdBy: p.created_by,
        createdByName: p.created_by_name,
        brokerId: p.broker_id,
        brokerName: p.broker_name,
        builderId: p.builder_id,
        builderName: p.builder_name,
        title: p.title,
        description: p.description,
        propertyType: p.property_type,
        transactionType: p.transaction_type,
        price: p.price,
        city: p.city,
        locality: p.locality,
        address: p.address,
        latitude: p.latitude,
        longitude: p.longitude,
        areaSqft: p.area_sqft,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        amenities: p.amenities || [],
        status: p.status,
        rejectionReason: p.rejection_reason,
        approvedBy: p.approved_by,
        approvedAt: p.approved_at,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        media: (p.media || []).map((m) => ({
          id: m.id,
          url: m.url,
          mediaType: m.media_type,
          displayOrder: m.display_order,
          isPrimary: m.is_primary,
        })),
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

export const fetchProperties = createAsyncThunk(
  "properties/fetchProperties",
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/properties${buildQuery(params)}`, { token: getState().auth.accessToken });
      const raw = res.data;
      const items = Array.isArray(raw) ? raw : raw?.items || [];
      return { list: items.map(normalizeProperty), meta: Array.isArray(raw) ? null : raw?.pagination };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchPropertyById = createAsyncThunk(
  "properties/fetchPropertyById",
  async (id, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/properties/${id}`, { token: getState().auth.accessToken });
      return normalizeProperty(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const PROPERTY_FIELDS = [
  "title", "description", "propertyType", "transactionType", "city", "locality",
  "address", "latitude", "longitude", "areaSqft", "bedrooms", "bathrooms", "amenities",
];

export const createProperty = createAsyncThunk(
  "properties/createProperty",
  async (data, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest("/properties", {
        method: "POST",
        body: data,
        token: getState().auth.accessToken,
      });
      return normalizeProperty(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// PUT /properties/:id only accepts the fields below - price has its own
// dedicated endpoint (updatePropertyPrice), same split as leads' assign/status.
export const updateProperty = createAsyncThunk(
  "properties/updateProperty",
  async ({ id, ...data }, { getState, rejectWithValue }) => {
    try {
      const body = {};
      PROPERTY_FIELDS.forEach((key) => {
        if (data[key] !== undefined) body[key] = data[key];
      });
      const res = await apiRequest(`/properties/${id}`, {
        method: "PUT",
        body,
        token: getState().auth.accessToken,
      });
      return normalizeProperty(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteProperty = createAsyncThunk(
  "properties/deleteProperty",
  async (id, { getState, rejectWithValue }) => {
    try {
      await apiRequest(`/properties/${id}`, { method: "DELETE", token: getState().auth.accessToken });
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updatePropertyPrice = createAsyncThunk(
  "properties/updatePropertyPrice",
  async ({ id, price }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/properties/${id}/pricing`, {
        method: "PUT",
        body: { price },
        token: getState().auth.accessToken,
      });
      return normalizeProperty(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updatePropertyAvailability = createAsyncThunk(
  "properties/updatePropertyAvailability",
  async ({ id, isAvailable }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/properties/${id}/availability`, {
        method: "PUT",
        body: { isAvailable },
        token: getState().auth.accessToken,
      });
      return normalizeProperty(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const approveProperty = createAsyncThunk(
  "properties/approveProperty",
  async (id, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/properties/${id}/approve`, {
        method: "PUT",
        token: getState().auth.accessToken,
      });
      return normalizeProperty(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const rejectProperty = createAsyncThunk(
  "properties/rejectProperty",
  async ({ id, reason }, { getState, rejectWithValue }) => {
    try {
      const res = await apiRequest(`/properties/${id}/reject`, {
        method: "PUT",
        body: { reason },
        token: getState().auth.accessToken,
      });
      return normalizeProperty(res.data);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const normalizeMedia = (m) => ({
  id: m.id,
  url: m.url,
  mediaType: m.media_type,
  displayOrder: m.display_order,
  isPrimary: m.is_primary,
});

// Media has its own endpoint — a property must already exist before photos
// can be attached, so this is only usable once the listing is created.
export const uploadPropertyMedia = createAsyncThunk(
  "properties/uploadPropertyMedia",
  async ({ id, file }, { getState, rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiRequest(`/properties/${id}/media/upload`, {
        method: "POST",
        body: formData,
        isFormData: true,
        token: getState().auth.accessToken,
      });
      return { propertyId: id, media: normalizeMedia(res.data) };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deletePropertyMedia = createAsyncThunk(
  "properties/deletePropertyMedia",
  async ({ id, mediaId }, { getState, rejectWithValue }) => {
    try {
      await apiRequest(`/properties/${id}/media/${mediaId}`, { method: "DELETE", token: getState().auth.accessToken });
      return { propertyId: id, mediaId };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const setPrimaryPropertyMedia = createAsyncThunk(
  "properties/setPrimaryPropertyMedia",
  async ({ id, mediaId }, { getState, rejectWithValue }) => {
    try {
      await apiRequest(`/properties/${id}/media/${mediaId}/primary`, { method: "PUT", token: getState().auth.accessToken });
      return { propertyId: id, mediaId };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const mutationThunks = [
  createProperty, updateProperty, updatePropertyPrice, updatePropertyAvailability, approveProperty, rejectProperty,
];
const mediaThunks = [uploadPropertyMedia, deletePropertyMedia, setPrimaryPropertyMedia];

const propertiesSlice = createSlice({
  name: "properties",
  initialState: {
    list: [],
    meta: null,
    current: null,
    status: "idle", // idle | loading | succeeded | failed
    error: null,
    mutationStatus: "idle",
    mutationError: null,
  },
  reducers: {
    clearPropertiesError(state) {
      state.error = null;
      state.mutationError = null;
    },
    clearCurrentProperty(state) {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProperties.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchProperties.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload.list;
        state.meta = action.payload.meta;
      })
      .addCase(fetchProperties.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to load properties.";
      })
      .addCase(fetchPropertyById.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(createProperty.fulfilled, (state, action) => {
        state.list = [action.payload, ...state.list];
      })
      .addCase(deleteProperty.fulfilled, (state, action) => {
        state.list = state.list.filter((p) => p.id !== action.payload);
      })
      .addCase(uploadPropertyMedia.fulfilled, (state, action) => {
        if (state.current?.id === action.payload.propertyId) {
          state.current.media = [...state.current.media, action.payload.media];
        }
      })
      .addCase(deletePropertyMedia.fulfilled, (state, action) => {
        if (state.current?.id === action.payload.propertyId) {
          state.current.media = state.current.media.filter((m) => m.id !== action.payload.mediaId);
        }
      })
      .addCase(setPrimaryPropertyMedia.fulfilled, (state, action) => {
        if (state.current?.id === action.payload.propertyId) {
          state.current.media = state.current.media.map((m) => ({ ...m, isPrimary: m.id === action.payload.mediaId }));
        }
      })
      .addMatcher(
        (action) =>
          [updateProperty, updatePropertyPrice, updatePropertyAvailability, approveProperty, rejectProperty]
            .some((t) => t.fulfilled.match(action)),
        (state, action) => {
          state.list = state.list.map((p) => (p.id === action.payload.id ? action.payload : p));
          if (state.current?.id === action.payload.id) state.current = action.payload;
        }
      )
      .addMatcher(isPending(...mutationThunks, deleteProperty, ...mediaThunks), (state) => {
        state.mutationStatus = "loading";
        state.mutationError = null;
      })
      .addMatcher(isRejected(...mutationThunks, deleteProperty, ...mediaThunks), (state, action) => {
        state.mutationStatus = "failed";
        state.mutationError = action.payload || "Something went wrong. Please try again.";
      })
      .addMatcher(
        (action) => [...mutationThunks, deleteProperty, ...mediaThunks].some((t) => t.fulfilled.match(action)),
        (state) => {
          state.mutationStatus = "succeeded";
        }
      );
  },
});

export const { clearPropertiesError, clearCurrentProperty } = propertiesSlice.actions;
export default propertiesSlice.reducer;
