import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// Proxy configuration
const API_URL = 'https://8fee-117-254-230-212.ngrok-free.app';
app.use('/upload', createProxyMiddleware({ target: API_URL, changeOrigin: true }));
app.use('/create-payment', createProxyMiddleware({ target: API_URL, changeOrigin: true }));
app.use('/verify-payment', createProxyMiddleware({ target: API_URL, changeOrigin: true }));

// Handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});