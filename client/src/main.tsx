import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Provider } from 'react-redux';
import store from './store/store';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider defaultTheme="light" storageKey="cyberpulse-theme">
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster />
      </QueryClientProvider>
    </Provider>
  </ThemeProvider>
);
