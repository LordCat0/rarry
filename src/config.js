const localhost = window.location.hostname === "localhost";

export default {
  apiUrl: localhost ? "http://localhost:3000" : "/api",
};
