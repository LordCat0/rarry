const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") document.documentElement.classList.add("dark");

const themeToggle = document.getElementById("theme-toggle");
themeToggle.innerText = savedTheme === "dark" ? "Light Theme" : "Dark Theme";
themeToggle.addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
  const isDark = document.documentElement.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  themeToggle.innerText = isDark ? "Light Theme" : "Dark Theme";
});