const localhost = window.location.hostname === "localhost";

export default {
  apiUrl: localhost ? "http://localhost:3000" : "http://rarry-api.onthewifi.com:14524",
};
