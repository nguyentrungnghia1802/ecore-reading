import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@xyflow/react/dist/style.css';
import { App } from './app/App';
import './styles.css';

const root = document.getElementById('root');

if (root === null) {
  throw new Error('Application root was not found');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
