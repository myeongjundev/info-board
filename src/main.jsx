import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui/App.jsx';
import SalesPage from './ui/SalesPage.jsx';
import StreamingPage from './ui/StreamingPage.jsx';
import SalesChartsPage from './ui/SalesChartsPage.jsx';
import './ui/styles.css';
import './ui/section-nav-compact.css';
import { applyTheme, resolveTheme } from './ui/theme.js';

// 화면을 그리기 전에 붙인다. 하위 페이지는 App 을 거치지 않으므로 App 안에서
// 붙이면 #/charts 로 바로 들어온 사람은 어두운 화면만 보게 된다. 실제로 그랬다.
applyTheme(resolveTheme());

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
