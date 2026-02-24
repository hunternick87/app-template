import { UserTheme, useTheme } from "./theme-provider";
import { Button } from "./ui/button";

const themeConfig: Record<UserTheme, { icon: string; label: string }> = {
  light: { icon: "☀️", label: "Light" },
  dark: { icon: "🌙", label: "Dark" },
  system: { icon: "💻", label: "System" },
};

export const ThemeToggle = () => {
  const { userTheme, setTheme } = useTheme();
  const config = themeConfig[userTheme] || themeConfig.light;

  const getNextTheme = () => {
    const themes = Object.keys(themeConfig) as UserTheme[];
    const currentIndex = themes.indexOf(userTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    return themes[nextIndex] as UserTheme;
  };

  return (
    <Button onClick={() => setTheme(getNextTheme())} className="w-28">
      {config.label}
      <span className="ml-1">{config.icon}</span>
    </Button>
  );
};