import React, { createContext, useContext, useState, useEffect } from 'react';
import { TRANSLATIONS, AppTranslations } from '../lib/translations';

interface AppContextType {
  language: 'es' | 'en';
  setLanguage: (lang: 'es' | 'en') => void;
  currency: 'ARS' | 'USD';
  setCurrency: (curr: 'ARS' | 'USD') => void;
  exchangeRate: number;
  setExchangeRate: (rate: number) => void;
  t: AppTranslations;
  formatPrice: (priceInArs: number) => string;
  reloadConfig: () => Promise<void>;
  previewImage: string | null;
  setPreviewImage: (img: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<'es' | 'en'>(() => {
    const saved = localStorage.getItem('s_con_proposito_lang');
    return (saved === 'en' || saved === 'es') ? saved : 'es';
  });

  const [currency, setCurrencyState] = useState<'ARS' | 'USD'>(() => {
    const saved = localStorage.getItem('s_con_proposito_curr');
    return (saved === 'USD' || saved === 'ARS') ? saved : 'ARS';
  });

  const [exchangeRate, setExchangeRateState] = useState<number>(() => {
    const saved = localStorage.getItem('s_con_proposito_exchange_rate');
    return saved ? Number(saved) : 1000;
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const setExchangeRate = (rate: number) => {
    setExchangeRateState(rate);
    localStorage.setItem('s_con_proposito_exchange_rate', String(rate));
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data && data.exchangeRate) {
          setExchangeRate(Number(data.exchangeRate));
        }
      }
    } catch (e) {
      console.error('Failed to load exchange rate config:', e);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const setLanguage = (lang: 'es' | 'en') => {
    setLanguageState(lang);
    localStorage.setItem('s_con_proposito_lang', lang);
  };

  const setCurrency = (curr: 'ARS' | 'USD') => {
    setCurrencyState(curr);
    localStorage.setItem('s_con_proposito_curr', curr);
  };

  const reloadConfig = async () => {
    await fetchConfig();
  };

  const t = TRANSLATIONS[language];

  const formatPrice = (priceInArs: number): string => {
    if (currency === 'ARS') {
      return `$ ${priceInArs.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
    } else {
      const priceInUsd = priceInArs / exchangeRate;
      return `US$ ${priceInUsd.toFixed(2)}`;
    }
  };

  return (
    <AppContext.Provider value={{
      language,
      setLanguage,
      currency,
      setCurrency,
      exchangeRate,
      setExchangeRate,
      t,
      formatPrice,
      reloadConfig,
      previewImage,
      setPreviewImage
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
