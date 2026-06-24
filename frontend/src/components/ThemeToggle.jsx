import { useEffect, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";

    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";

    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {theme === "light" ? <FiMoon size={20} /> : <FiSun size={20} />}
    </button>
  );
}
