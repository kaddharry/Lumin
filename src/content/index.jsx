import React from 'react';
import ReactDOM from 'react-dom/client';
import ContentApp from './ContentApp';
import styles from './index.css?inline';

console.log('Content script loaded');

const rootId = 'live-on-screen-ai-root';

// Create the shadow root container
const container = document.createElement('div');
container.id = rootId;
document.body.appendChild(container);

const shadowRoot = container.attachShadow({ mode: 'open' });

// Inject styles
const styleElement = document.createElement('style');
styleElement.textContent = styles;
shadowRoot.appendChild(styleElement);

const root = ReactDOM.createRoot(shadowRoot);

root.render(
    <React.StrictMode>
        <ContentApp />
    </React.StrictMode>
);
