import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui/App.jsx';
import SalesPage from './ui/SalesPage.jsx';
import StreamingPage from './ui/StreamingPage.jsx';
import SalesChartsPage from './ui/SalesChartsPage.jsx';
import './ui/styles.css';

function Root() {
  const [route, setRoute] = useState(() => window.location.hash);
  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  if (route.startsWith('#/sales')) return <SalesPage />;
  if (route.startsWith('#/streaming')) return <StreamingPage />;
  if (route.startsWith('#/charts')) return <SalesChartsPage />;
  return <App />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
