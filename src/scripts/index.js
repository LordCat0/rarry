import "@fortawesome/fontawesome-free/css/all.min.css";
import { toggleIcons, toggleTheme } from "../functions/theme";
import { showPopup } from "../functions/utils";
import config from "../config";
import { cache } from "../cache";

const root = document.documentElement;

toggleTheme();
toggleIcons();

const themeButton = document.getElementById("theme-button");
if (themeButton)
  themeButton.addEventListener("click", () =>
    showPopup({
      title: "Appearance",
      rows: [
        [
          "Theme:",
          {
            type: "button",
            label: '<i class="fa-solid fa-sun"></i> Light',
            onClick: () => toggleTheme(false),
          },
          {
            type: "button",
            label: '<i class="fa-solid fa-moon"></i> Dark',
            onClick: () => toggleTheme(true),
          },
        ],
        [
          "Show icon on buttons:",
          {
            type: "checkbox",
            checked: !root.classList.contains("removeIcons"),
            onChange: (checked) => {
              toggleIcons(!checked);
            },
          },
        ],
        [
          "Renderer (applies after refresh):",
          {
            type: "menu",
            value: localStorage.getItem("renderer"),
            options: [
              { label: "Zelos (default)", value: "custom_zelos" },
              { label: "Thrasos", value: "thrasos" },
              { label: "Geras", value: "geras" },
            ],
            onChange: (value) => localStorage.setItem("renderer", value),
          },
        ],
      ],
    })
  );

function setUserTag(user) {
  if (user === null) {
    if (cache.user === null) return;
    user = cache.user;
  }

  login.parentElement.innerHTML = `
    <div class="userTag">
      <img src="${config.apiUrl}/users/${user.id}/avatar" />
      <a href="/user?id=${user.id}">${user.username}</a>
    </div>
  `;
}

const login = document.getElementById("login-button");
if (login && localStorage.getItem("tooken") !== null) {
  if (cache.user) {
    setUserTag(cache.user);
  } else {
    fetch(`${config.apiUrl}/users/me`, {
      headers: {
        Authorization: localStorage.getItem("tooken"),
      },
    })
      .then((response) => {
        if (!response.ok)
          throw new Error("Failed to fetch user data: " + response.statusText);
        return response.json();
      })
      .then((data) => {
        cache.user = data;
        setUserTag(data);
      })
      .catch(console.error);
  }
}
