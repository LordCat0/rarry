const localhost = window.location.hostname === "localhost";

export default {
  apiUrl: localhost ? "http://rarry-api.onthewifi.com:14524" : "",
};
