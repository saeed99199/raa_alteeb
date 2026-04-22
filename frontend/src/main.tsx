import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme } from 'antd';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import App from './App';
import './i18n';
import './index.css';
import { useThemeStore } from '@/stores/themeStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const safeReadLocalStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const removeIfCorrupted = (key: string) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    JSON.parse(raw);
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore cleanup failures.
    }
  }
};

const normalizeAuthState = () => {
  try {
    const raw = localStorage.getItem('raa-auth');
    if (!raw) return;

    const parsed = JSON.parse(raw) as {
      state?: {
        token?: unknown;
        user?: {
          id?: unknown;
          name?: unknown;
          email?: unknown;
          role?: unknown;
          permissions?: unknown;
        } | null;
      };
    };

    const token = parsed?.state?.token;
    const user = parsed?.state?.user;

    const tokenValid = token == null || typeof token === 'string';
    const userValid =
      user == null ||
      (typeof user.id === 'number' &&
        typeof user.name === 'string' &&
        typeof user.email === 'string' &&
        typeof user.role === 'string' &&
        Array.isArray(user.permissions));

    if (!tokenValid || !userValid || (typeof token === 'string' && token && !user)) {
      localStorage.removeItem('raa-auth');
    }
  } catch {
    try {
      localStorage.removeItem('raa-auth');
    } catch {
      // Ignore cleanup failures.
    }
  }
};

removeIfCorrupted('raa-auth');
removeIfCorrupted('raa-theme');
normalizeAuthState();

const locale = safeReadLocalStorage('locale') ?? 'en';

function RootProviders() {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.setAttribute('lang', locale === 'ar' ? 'ar' : 'en');
    document.documentElement.setAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  }, [mode]);

  return (
    <ConfigProvider
      direction={locale === 'ar' ? 'rtl' : 'ltr'}
      theme={{
        token: {
          colorPrimary: mode === 'dark' ? '#8B5E3C' : '#15315f',
          colorInfo: '#1d4ed8',
          colorSuccess: '#059669',
          colorWarning: '#d97706',
          colorError: '#dc2626',
          borderRadius: 12,
          fontFamily: locale === 'ar' ? 'Tajawal, sans-serif' : 'Inter, sans-serif',
          fontSize: 15,
          fontSizeSM: 13,
          fontSizeLG: 17,
          fontSizeXL: 20,
          fontSizeHeading1: 32,
          fontSizeHeading2: 26,
          fontSizeHeading3: 22,
          fontSizeHeading4: 18,
          fontSizeHeading5: 16,
          controlHeight: 38,
          controlHeightSM: 28,
          controlHeightLG: 46,
          lineHeight: 1.7,
          sizeStep: 5,
        },
        components: {
          Table: {
            fontSize: 15,
            cellFontSize: 15,
            headerBg: undefined,
            rowHoverBg: undefined,
          },
          Menu: {
            fontSize: 14,
          },
          Button: {
            fontSize: 14,
          },
          Form: {
            labelFontSize: 14,
          },
          Input: {
            fontSize: 15,
          },
          Select: {
            fontSize: 15,
          },
          Modal: {
            titleFontSize: 17,
          },
          Card: {
            headerFontSize: 16,
          },
        },
        algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <BrowserRouter>
        <App />
        <Toaster position="top-right" />
      </BrowserRouter>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RootProviders />
    </QueryClientProvider>
  </React.StrictMode>
);
