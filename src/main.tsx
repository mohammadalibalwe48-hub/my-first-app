import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)

// Keep the push worker current without requesting notification permission on page load.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        void navigator.serviceWorker.register('/sw.js', {scope: '/', updateViaCache: 'none'})
            .catch(() => { /* The device activation button reports registration errors. */ });
    });
}
