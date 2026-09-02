import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type UiContextValue = {
  language: "ar" | "en";
  dir: "rtl" | "ltr";
  setLanguage: (l: "ar" | "en") => void;
  toggleLanguage: () => void;
};

const UiContext = createContext<UiContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<"ar" | "en">("ar");

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const value: UiContextValue = {
    language,
    dir: language === "ar" ? "rtl" : "ltr",
    setLanguage,
    toggleLanguage: () => setLanguage((l) => (l === "ar" ? "en" : "ar")),
  };

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUI must be used inside <UIProvider>");
  return ctx;
}
