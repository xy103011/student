import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';

const SiteContext = createContext(null);

export function SiteProvider({ children }) {
  const [site, setSite] = useState({ name: '全栈 AI 社区', description: '' });
  const [installed, setInstalled] = useState(null);

  const refresh = () =>
    api
      .get('/site')
      .then((res) => {
        setSite({ name: res.data.name, description: res.data.description });
        setInstalled(res.data.installed);
        return res.data;
      })
      .catch(() => {
        setInstalled(true);
        return null;
      });

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    document.title = site.name || '全栈 AI 社区';
  }, [site.name]);

  return (
    <SiteContext.Provider value={{ site, installed, refresh }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  return useContext(SiteContext);
}
