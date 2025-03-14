// server.js
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || '0.0.0.0:8080';

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy configuration
const proxyOptions = {
  target: 'https://8fee-117-254-230-212.ngrok-free.app',
  changeOrigin: true,
  secure: false
};

app.use('/upload', createProxyMiddleware(proxyOptions));
app.use('/create-payment', createProxyMiddleware(proxyOptions));
app.use('/verify-payment', createProxyMiddleware(proxyOptions));

// Handle SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});