const express = require('express');
const axios = require('axios');
const https = require('https');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// Axios instance with SSL verification disabled
const axiosInstance = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false // SSL sertifikası doğrulamasını devre dışı bırak
    })
});

// Serve static files
app.use(express.static('.'));

// Proxy middleware configuration
const proxyOptions = {
    target: 'https://10.21.22.11:50000',
    changeOrigin: true,
    secure: false, // SSL sertifikası doğrulamasını devre dışı bırak
    onProxyReq: (proxyReq, req, res) => {
        // Get the session cookie from the original request
        const b1Session = req.headers.cookie;
        if (b1Session) {
            proxyReq.setHeader('Cookie', b1Session);
        }
        
        // Log the request for debugging
        console.log('Proxying request:', {
            method: req.method,
            path: req.path,
            cookie: b1Session
        });
    },
    onProxyRes: (proxyRes, req, res) => {
        // Enable CORS
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Cookie';
        
        // Log the response for debugging
        console.log('Proxy response:', {
            status: proxyRes.statusCode,
            headers: proxyRes.headers
        });
    }
};

// Handle OPTIONS requests for CORS
app.options('/b1s/v1/*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Cookie');
    res.sendStatus(200);
});

// Create the proxy middleware
app.use('/b1s/v1', createProxyMiddleware(proxyOptions));

// Test route using axiosInstance
app.get('/test', async (req, res) => {
    const sessionId = req.query.sessionId;
    console.log("test", sessionId);
    try {
        const response = await axiosInstance.get(
          "https://10.21.22.11:50000/b1s/v1/SQLQueries('OWTQ_LIST')/List",
          {
            params: {
              value1: "'PROD'",
              value2: "'1010'",
            },
            headers: {
              Cookie:
                "B1SESSION=" + encodeURIComponent(sessionId),
              "Content-Type":
                "application/x-www-form-urlencoded; charset=utf-8",
            },
          }
        );
        res.json(response.data);
    } catch (error) {
        console.error('Error:', error);
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get("/uretim-siparisleri-list", async (req, res) => {
  const sessionId = req.query.sessionId;
  console.log("test", sessionId);
  try {
    const response = await axiosInstance.get(
      "https://10.21.22.11:50000/b1s/v1/SQLQueries('OWTQ_NEW')/List",
      {
        params: {
          value1: "'PROD'",
          value2: "'1010'",
        },
        headers: {
          Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error:", error);
    console.error("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Handle all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
