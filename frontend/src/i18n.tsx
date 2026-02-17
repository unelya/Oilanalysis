import { createContext, useContext, useMemo, useState } from "react";

type Language = "en" | "ru";
type DictValue = string | Record<string, DictValue>;

const STORAGE_KEY = "labsync-lang";

const resources: Record<Language, Record<string, DictValue>> = {
  en: {
    common: {
      language: "Language",
      english: "English",
      russian: "Russian",
      board: "Board",
      samples: "Samples",
      actions: "Actions",
      admin: "Admin",
      settings: "Settings",
      warehouse: "Warehouse",
      labOperator: "Lab Operator",
      actionSupervision: "Action Supervision",
      guest: "Guest",
    },
    topBar: {
      searchPlaceholder: "Search samples, analyses, or IDs...",
      searchAria: "Search samples and analyses",
      rolePlaceholder: "Role",
      toggleTheme: "Toggle theme",
      notifications: "Notifications",
      markAllRead: "Mark all as read",
      noNotifications: "No new notifications.",
      signIn: "Sign in",
      logout: "Sign out",
    },
    navigation: {
      backToTop: "Go to top",
    },
    login: {
      signIn: "Sign in",
      subtitle: "Enter your credentials to continue.",
      username: "Username",
      password: "Password",
      rememberMe: "Remember me",
      forgotPassword: "Forgot password?",
      signingIn: "Signing in...",
      hidePassword: "Hide password",
      showPassword: "Show password",
      sessionHint: "Session will end when you sign out or clear browser data.",
      requestSubtitle: "Enter your username and account email. We will send a password reset token.",
      email: "Email",
      sending: "Sending...",
      sendResetToken: "Send reset token",
      backToSignIn: "Back to sign in",
      confirmSubtitle: "Enter reset token and set a new password.",
      resetToken: "Reset token",
      newPassword: "New password",
      confirmNewPassword: "Confirm new password",
      resetting: "Resetting...",
      resetPassword: "Reset password",
      mustChangeSubtitle: "You must set a new password before continuing.",
      currentPassword: "Current password",
      confirmPassword: "Confirm new password",
      updating: "Updating...",
      updatePassword: "Update password",
      errors: {
        loginFailed: "Login failed",
        currentPasswordRequired: "Current password is required.",
        newPasswordMin: "New password must be at least 8 characters.",
        passwordMismatch: "New password and confirmation do not match.",
        passwordChangeFailed: "Password change failed",
        usernameRequired: "Username is required.",
        emailRequired: "Email is required.",
        requestFailed: "Failed to request password reset.",
        resetTokenRequired: "Reset token is required.",
        resetFailed: "Failed to reset password.",
      },
      messages: {
        requestSuccess: "If that email exists, a reset email has been sent.",
        resetSuccess: "Password reset completed. You can now sign in with your new password.",
      },
    },
    admin: {
      toast: {
        failedLoadUsers: "Failed to load users",
        failedLoadEventLog: "Failed to load event log",
        usernameRequired: "Username required",
        fullNameRequired: "Full name required",
        defaultRoleRequired: "Default role required",
        emailRequired: "Email required",
        invalidEmail: "Enter a valid email address",
        userCreated: "User created",
        defaultPassword: "Default password: {{password}}",
        failedCreateUser: "Failed to create user",
        failedDeleteUser: "Failed to delete user",
        usernameUpdated: "Username updated",
        failedUpdateUsername: "Failed to update username",
        fullNameUpdated: "Full name updated",
        failedUpdateFullName: "Failed to update full name",
        emailUpdated: "Email updated",
        failedUpdateEmail: "Failed to update email",
        backendUnreachable: "Backend unreachable",
      },
    },
    settings: {
      title: "Settings",
      systemStatus: "System status",
      subtitle: "Frontend still uses mock data; backend is used for health only.",
      backendReachable: "Backend reachable",
      unexpectedResponse: "Unexpected response",
      failedBackend: "Failed to reach backend",
      checking: "Checking...",
      healthy: "Healthy",
      unavailable: "Unavailable",
      idle: "Idle",
      retry: "Retry",
    },
  },
  ru: {
    common: {
      language: "Язык",
      english: "Английский",
      russian: "Русский",
      board: "Доска",
      samples: "Образцы",
      actions: "Воздействия",
      admin: "Админ",
      settings: "Настройки",
      warehouse: "Склад",
      labOperator: "Лаборант",
      actionSupervision: "Контроль воздействий",
      guest: "Гость",
    },
    topBar: {
      searchPlaceholder: "Поиск образцов, анализов или ID...",
      searchAria: "Поиск образцов и анализов",
      rolePlaceholder: "Роль",
      toggleTheme: "Сменить тему",
      notifications: "Уведомления",
      markAllRead: "Отметить все прочитанными",
      noNotifications: "Новых уведомлений нет.",
      signIn: "Вход",
      logout: "Выйти",
    },
    navigation: {
      backToTop: "Наверх",
    },
    login: {
      signIn: "Вход",
      subtitle: "Введите учетные данные для продолжения.",
      username: "Имя пользователя",
      password: "Пароль",
      rememberMe: "Запомнить меня",
      forgotPassword: "Забыли пароль?",
      signingIn: "Вход...",
      hidePassword: "Скрыть пароль",
      showPassword: "Показать пароль",
      sessionHint: "Сессия завершится после выхода или очистки данных браузера.",
      requestSubtitle: "Введите имя пользователя и email учетной записи. Мы отправим токен сброса пароля.",
      email: "Эл. почта",
      sending: "Отправка...",
      sendResetToken: "Отправить токен сброса",
      backToSignIn: "Назад ко входу",
      confirmSubtitle: "Введите токен сброса и задайте новый пароль.",
      resetToken: "Токен сброса",
      newPassword: "Новый пароль",
      confirmNewPassword: "Подтвердите новый пароль",
      resetting: "Сброс...",
      resetPassword: "Сбросить пароль",
      mustChangeSubtitle: "Перед продолжением необходимо установить новый пароль.",
      currentPassword: "Текущий пароль",
      confirmPassword: "Подтвердите новый пароль",
      updating: "Обновление...",
      updatePassword: "Обновить пароль",
      errors: {
        loginFailed: "Не удалось войти",
        currentPasswordRequired: "Требуется текущий пароль.",
        newPasswordMin: "Новый пароль должен содержать не менее 8 символов.",
        passwordMismatch: "Новый пароль и подтверждение не совпадают.",
        passwordChangeFailed: "Не удалось изменить пароль",
        usernameRequired: "Требуется имя пользователя.",
        emailRequired: "Требуется email.",
        requestFailed: "Не удалось запросить сброс пароля.",
        resetTokenRequired: "Требуется токен сброса.",
        resetFailed: "Не удалось сбросить пароль.",
      },
      messages: {
        requestSuccess: "Если такой email существует, письмо для сброса пароля отправлено.",
        resetSuccess: "Пароль сброшен. Теперь войдите с новым паролем.",
      },
    },
    admin: {
      toast: {
        failedLoadUsers: "Не удалось загрузить пользователей",
        failedLoadEventLog: "Не удалось загрузить журнал событий",
        usernameRequired: "Требуется имя пользователя",
        fullNameRequired: "Требуется полное имя",
        defaultRoleRequired: "Требуется роль по умолчанию",
        emailRequired: "Требуется email",
        invalidEmail: "Введите корректный email",
        userCreated: "Пользователь создан",
        defaultPassword: "Пароль по умолчанию: {{password}}",
        failedCreateUser: "Не удалось создать пользователя",
        failedDeleteUser: "Не удалось удалить пользователя",
        usernameUpdated: "Имя пользователя обновлено",
        failedUpdateUsername: "Не удалось обновить имя пользователя",
        fullNameUpdated: "Полное имя обновлено",
        failedUpdateFullName: "Не удалось обновить полное имя",
        emailUpdated: "Email обновлен",
        failedUpdateEmail: "Не удалось обновить email",
        backendUnreachable: "Бэкенд недоступен",
      },
    },
    settings: {
      title: "Настройки",
      systemStatus: "Состояние системы",
      subtitle: "Фронтенд пока использует мок-данные; бэкенд используется только для health-проверки.",
      backendReachable: "Бэкенд доступен",
      unexpectedResponse: "Неожиданный ответ",
      failedBackend: "Не удалось связаться с бэкендом",
      checking: "Проверка...",
      healthy: "Доступен",
      unavailable: "Недоступен",
      idle: "Ожидание",
      retry: "Повторить",
    },
  },
};

type I18nContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "ru") return stored;
  return navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
}

function resolveKey(dict: Record<string, DictValue>, key: string): string | null {
  const parts = key.split(".");
  let current: DictValue | undefined = dict;
  for (const part of parts) {
    if (!current || typeof current === "string") return null;
    current = current[part];
  }
  return typeof current === "string" ? current : null;
}

function interpolate(text: string, vars?: Record<string, string | number>) {
  if (!vars) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(vars[name] ?? ""));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  };

  const t = (key: string, vars?: Record<string, string | number>) => {
    const selected = resources[language];
    const fallback = resources.en;
    const hit = resolveKey(selected, key) ?? resolveKey(fallback, key) ?? key;
    return interpolate(hit, vars);
  };

  const value = useMemo(() => ({ language, setLanguage, t }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
