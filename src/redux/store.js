import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import uiReducer from "./slices/uiSlice";
import usersReducer from "./slices/usersSlice";
import leadsReducer from "./slices/leadsSlice";
import customersReducer from "./slices/customersSlice";
import propertiesReducer from "./slices/propertiesSlice";
import brokerReducer from "./slices/brokerSlice";
import tasksReducer from "./slices/tasksSlice";
import agenciesReducer from "./slices/agenciesSlice";
import dealsReducer from "./slices/dealsSlice";
import projectsReducer from "./slices/projectsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    users: usersReducer,
    leads: leadsReducer,
    customers: customersReducer,
    properties: propertiesReducer,
    broker: brokerReducer,
    tasks: tasksReducer,
    agencies: agenciesReducer,
    deals: dealsReducer,
    projects: projectsReducer,
  },
});
