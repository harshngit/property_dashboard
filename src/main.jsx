import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { store } from "./redux/store";
import { injectStore } from "./api/client";
import { ToastProvider } from "./components/common/ToastProvider";
import { initI18n } from "./lib/i18n";
import { API_BASE_URL } from "./config/api";

injectStore(store);
initI18n({ app: "crm", apiBase: API_BASE_URL });

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>
);
