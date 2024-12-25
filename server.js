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

// Parse JSON bodies
app.use(express.json());

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
            body: req.body,
            cookie: b1Session
        });
    },
    onProxyRes: (proxyRes, req, res) => {
        // Enable CORS
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Cookie, Authorization';
        
        // Log the response for debugging
        console.log('Proxy response:', {
            status: proxyRes.statusCode,
            headers: proxyRes.headers,
            body: proxyRes.body
        });
    }
};

// Handle OPTIONS requests for CORS
app.options('/b1s/v1/*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Cookie, Authorization');
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

app.post("/api/production-orders", async (req, res) => {
    const sessionId = req.query.sessionId;
    const orderData = req.body;

    console.log("sessionId:", sessionId);
    console.log("orderData:", orderData);

    if (!Array.isArray(orderData) || orderData.length === 0) {
        return res.status(400).json({ error: 'Invalid order data format' });
    }

    try {
        const results = await Promise.all(orderData.map(async (order) => {
            const data = {
                U_Type: "PROD",
                U_WhsCode: "1010",
                U_ItemCode: order.itemCode,
                U_ItemName: order.itemName,
                U_Quantity: order.quantity,
                U_SessionID: sessionId,
                U_GUID: order.guid,
                U_User: "ozan",
                U_FromWhsCode: null,
                U_FromWhsName: null,
                U_Comments: "Üretim Siparişi",
                U_UomCode: order.uomCode
            };

            console.log('Sending data:', data);

            const response = await axiosInstance.post(
                "https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_OWTQ",
                data,
                {
                    headers: {
                        'Cookie': `B1SESSION=${encodeURIComponent(sessionId)}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Response for item:', order.itemCode, response.data);
            return response.data;
        }));

        console.log('All results:', results);
        res.json({
            success: true,
            message: 'Üretim siparişleri başarıyla oluşturuldu',
            results: results
        });
    } catch (error) {
        console.error('Error creating production orders:', error);
        res.status(500).json({ 
            error: 'Failed to create production orders',
            details: error.message 
        });
    }
});

// Production Orders endpoints
app.get("/api/production-order/:docNum", async (req, res) => {
    const sessionId = req.query.sessionId;
    const docNum = req.params.docNum;

    console.log("Getting order details for docNum:", docNum);
    console.log("Using sessionId:", sessionId);

    // https://10.21.22.11:50000/b1s/v1/SQLQueries('OWTQ_DETAIL')/List?value1= 'PROD'&value2= 'DocNum'

    try {
        const response = await axiosInstance.get(
            "https://10.21.22.11:50000/b1s/v1/SQLQueries('OWTQ_DETAIL')/List",
            {
                params: {
                    value1: "'PROD'",
                    value2: docNum,
                },
                headers: {
                    Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
                    "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
                },
            }
        );
        console.log("Response for docNum:", docNum, response.data);
        res.json(response.data);
    } catch (error) {
        console.error("Error:", error);
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Production Order Delivery endpoint
app.post('/api/production-order/:docNum/delivery', async (req, res) => {
  const { docNum } = req.params;
  const { sessionId, items } = req.body;

  if (!sessionId || !docNum || !items) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  // https://10.21.22.11:50000/b1s/v1/SQLQueries('OWTR_LIST')/List?value1= 'PROD'&value2= 'DocNum'
  

  console.log("Processing delivery for docNum:", docNum);
  console.log("Using sessionId:", sessionId);

  try {
    const deliveryData = {
      WhsCode: items[0].WhsCode,
      DocDate: new Date().toISOString().split("T")[0],
      DocNum: docNum,
      NumAtCard: items[0].NumAtCard,
      Comments: items[0].Comments,
      SessionID: sessionId,
      GUID: generateGUID(),
      LineNum: 1,
      Items: items.map((item) => ({
        ItemCode: item.ItemCode,
        ItemName: item.ItemName,
        Quantity: parseFloat(item.Quantity),
        DeliveryQty: parseFloat(item.DeliveryQty),
        MissingQty: parseFloat(item.MissingQty),
        DefectiveQty: parseFloat(item.DefectiveQty),
        Comments: item.Comments,
        Image: item.Image,
      })),
    };

    const response = await axiosInstance.get(
      "https://10.21.22.11:50000/b1s/v1/SQLQueries('OWTQ_NEW')/List",
      deliveryData,
      {
        headers: {
          Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        },
      }
    );

    console.log("Delivery API Response:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error("Error processing delivery:", error);
    res.status(500).json({
      error: "Failed to process delivery",
      details: error.message,
    });
  }
});

// Get delivery details
app.get('/api/delivery/:docNum', async (req, res) => {
    const { docNum } = req.params;
    const { sessionId } = req.query;

    if (!sessionId || !docNum) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log("Getting delivery details for docNum:", docNum);
    console.log("Using sessionId:", sessionId);

    try {
        const response = await axiosInstance.get(
            `https://10.21.22.11:50000/b1s/v1/SQLQueries('OWTR_NEW')/List`,
            {
                params: {
                    value1: "'PROD'",
                    value2: docNum
                },
                headers: {
                    'Cookie': `B1SESSION=${encodeURIComponent(sessionId)}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Delivery API Response:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching delivery details:', error);
        res.status(500).json({ 
            error: 'Failed to fetch delivery details',
            details: error.message 
        });
    }
});


// Handle delivery submissions
app.post('/api/delivery-submit/:docNum', async (req, res) => {
    const { docNum } = req.params;
    const { sessionId, deliveryData } = req.body;

    console.log("Processing delivery submission for docNum:", docNum);
    console.log("Session ID:", sessionId);
    console.log("Delivery data:", JSON.stringify(deliveryData, null, 2));

    if (!sessionId || !docNum || !deliveryData) {
        console.error('Missing parameters:', { sessionId, docNum, hasDeliveryData: !!deliveryData });
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        console.log('Sending request to external API...');
        const response = await axiosInstance.post(
            'https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_OWTR',
            deliveryData,
            {
                headers: {
                    'Cookie': 'B1SESSION=' + encodeURIComponent(sessionId),
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('External API Response:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Error submitting delivery. Full error:', error);
        console.error('Error response data:', error.response?.data);
        console.error('Error status:', error.response?.status);
        console.error('Error headers:', error.response?.headers);
        
        res.status(500).json({ 
            error: 'Delivery submission failed', 
            details: error.message,
            response: error.response?.data
        });
    }
});

function generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// External Supply Order endpoints
app.get("/api/supply-orders", async (req, res) => {
    const sessionId = req.query.sessionId;
    const whsCode = '1010';

    console.log("sessionId:", sessionId);
    console.log("whsCode:", whsCode);
 
    
    try {
        const response = await axiosInstance.get(
            "https://10.21.22.11:50000/b1s/v1/SQLQueries('OPOR_LIST')/List",
            {
                params: {
                    value1: "'SUPPLY'",
                    value2: `'${whsCode}'`,
                },
                headers: {
                    Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
                    "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
                },
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/supply-order/:docNum", async (req, res) => {
    const sessionId = req.query.sessionId;
    const docNum = req.params.docNum;

    console.log("sessionId:", sessionId);
    console.log("docNum:", docNum);
 

try {
  const response = await axiosInstance.get(
    "https://10.21.22.11:50000/b1s/v1/SQLQueries('OPOR_DETAIL')/List",
    {
      params: {
        value1: "'SUPPLY'",
        value2: `'${docNum}'`,
      },
      headers: {
        Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
    }
  );

  console.log("Response for docNum:", docNum, response.data);

  res.json(response.data);
} catch (error) {
  console.error("Error:", error.message);
  res.status(500).json({ error: error.message });
}
});

app.get("/api/supply-items", async (req, res) => {
    const sessionId = req.query.sessionId;
    const whsCode = req.query.whsCode;
    
    try {
        const response = await axiosInstance.get(
            "https://10.21.22.11:50000/b1s/v1/SQLQueries('OPOR_NEW')/List",
            {
                params: {
                    value1: "'SUPPLY'",
                    value2: `'${whsCode}'`,
                },
                headers: {
                    Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
                    "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
                },
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/supply-order", async (req, res) => {
    const { sessionId, orderData } = req.body;

    console.log("Processing order for WhsCode:", orderData.WhsCode);
    console.log("Order data:", orderData);
 

    try {
        const response = await axiosInstance.post(
          "https://10.21.22.11:50000/b1s/v1/SQLQueries('OPOR_NEW')/List",
          orderData,
          {
            params: {
              value1: "'SUPPLY'",
              value2: `'${orderData.WhsCode}'`,
            },
            headers: {
              Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
              "Content-Type": "application/json",
            },
          }
        );
        res.json(response.data);
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/supply-delivery/:docNum", async (req, res) => {
    const sessionId = req.query.sessionId;
    const docNum = req.params.docNum;

    console.log("sessionId:", sessionId);
    console.log("docNum:", docNum);

    return

    try {
        const response = await axiosInstance.get(
          "https://10.21.22.11:50000/b1s/v1/SQLQueries('ASUDO_B2B_OPDN')",
          {
            params: {
              value1: "'SUPPLY'",
              value2: `'${docNum}'`,
            },
            headers: {
              Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
              "Content-Type":
                "application/x-www-form-urlencoded; charset=utf-8",
            },
          }
        );
        res.json(response.data);
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/supply-delivery/:docNum", async (req, res) => {
    const { docNum } = req.params;
    const { sessionId, deliveryData } = req.body;

    console.log("Processing delivery for docNum:", docNum);
    console.log("Delivery data:", deliveryData);

    try {
        // Her satır için ayrı bir teslimat kaydı oluştur
        const response = await axiosInstance.post(
            "https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_OPDN",
            {
                U_Type: "SUPPLY",
                U_DocNum: docNum,
                U_SessionID: sessionId,
                U_GUID: generateGUID(),
                U_User: "Orkun",
                U_WhsCode: deliveryData.U_WhsCode,
                U_CarName: deliveryData.U_CarName,
                U_DocDate: deliveryData.U_DocDate,
                U_NumAtCard: deliveryData.U_NumAtCard,
                U_ItemCode: deliveryData.U_ItemCode,
                U_ItemName: deliveryData.U_ItemName,
                U_Quantity: deliveryData.U_Quantity,
                U_DeliveryQty: deliveryData.U_DeliveryQty,
                U_MissingQty: deliveryData.U_MissingQty,
                U_DefectiveQty: deliveryData.U_DefectiveQty,
                U_UomCode: deliveryData.U_UomCode,
                U_Comments: deliveryData.U_Comments,
                U_Image: deliveryData.U_Image || '',
                U_LineNum: deliveryData.U_LineNum
            },
            {
                headers: {
                    Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("Delivery API Response:", response.data);
        res.json(response.data);
    } catch (error) {
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
