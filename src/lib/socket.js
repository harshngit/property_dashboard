import { io } from "socket.io-client";
import { API_BASE_URL } from "../config/api";
import { store } from "../redux/store";

// Socket.IO connects to the server's origin, not the /api path - derive it
// from the same base URL every REST call already uses.
const SOCKET_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

let socket = null;

// Lazily created, single shared connection reused across every component
// that needs real-time chat events. Reconnects automatically (socket.io's
// default) and always authenticates with whichever access token is current
// in the Redux store at connect time.
export function getSocket() {
  if (socket) return socket;

  socket = io(SOCKET_ORIGIN, {
    autoConnect: false,
    auth: (cb) => cb({ token: store.getState().auth.accessToken || undefined }),
  });

  return socket;
}
