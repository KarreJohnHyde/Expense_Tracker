import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../styles/index.css';

// Initialize TensorFlow.js backend (optional)
if (import.meta.env.VITE_TF_BACKEND) {
  import('@tensorflow/tfjs').then((tf) => {
    tf.setBackend(import.meta.env.VITE_TF_BACKEND);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
