import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './App.css';
import { dedupeStatleHistoryV1 } from "./services/migrations";

dedupeStatleHistoryV1();

import { LanguageProvider } from './hooks/useLanguage';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider>
      <LanguageProvider>
        <Notifications />
        <main>
          <App />
        </main>
      </LanguageProvider>
    </MantineProvider>
  </React.StrictMode>
);
