// Defaults to the live API. Set VITE_API_BASE_URL (e.g. in .env.local) to
// point a local dev build at another backend, such as http://localhost:5001/api.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.propertyserch.com/api";
