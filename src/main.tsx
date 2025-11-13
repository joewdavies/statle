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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider>
      <Notifications />
      <main>
        <App />
      </main>
    </MantineProvider>
  </React.StrictMode>
);
