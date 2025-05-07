const express = require('express');
const axios = require('axios');
const https = require('https');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();

// SAP B1 API istekleri için retry mekanizması
async function retryAxiosRequest(apiCall, maxRetries = 2, delay = 1000) {
    let lastError = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // API çağrısını yap
            const response = await apiCall();
            return response; // Başarılı olursa döndür
        } catch (error) {
            lastError = error;
            console.error(`API isteği başarısız (deneme ${attempt + 1}/${maxRetries + 1}):`, error.message);
            
            // Hata detayını logla
            if (error.response) {
                console.error('Hata yanıtı detayları:', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data
                });
            }
            
            // String kontrolü ekleyerek includes kullanımı
            const hasSessionError = () => {
                if (error.response && error.response.status === 401) return true;
                if (error.response?.data?.error?.code === 301) return true; // Session zaman aşımı
                
                const errorMsg = error.response?.data?.error?.message;
                if (errorMsg && typeof errorMsg === 'string' && errorMsg.toLowerCase().includes('session')) {
                    return true;
                }
                return false;
            };
            
            // Hata analizi - session süresi dolduysa yeniden login olmamız lazım
            if (hasSessionError()) {
                console.warn('Oturum süresi dolmuş olabilir, daha fazla deneme yapılmayacak');
                throw new Error('Oturum süresi dolmuş. Lütfen yeniden giriş yapın.');
            }
            
            // Sunucu hatası (5xx) veya bağlantı hatası ise yeniden dene
            if (error.response?.status >= 500 || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                if (attempt < maxRetries) {
                    console.log(`${delay}ms sonra yeniden deneniyor...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    // Her denemede bekleme süresini artır (exponential backoff)
                    delay = delay * 2;
                }
            } else {
                // Diğer hatalar için hemen başarısız olarak sonlandır
                throw error;
            }
        }
    }
    
    // Tüm denemeler başarısız oldu
    console.error(`${maxRetries + 1} deneme sonrası başarısız oldu.`);
    throw lastError;
}

// Route to serve application version information
app.get('/package.json', (req, res) => {
    try {
        // Read the package.json file
        const packageJson = require('./package.json');
        
        // Only return necessary information for security
        const versionInfo = {
            name: packageJson.name,
            version: packageJson.version,
            description: packageJson.description
        };
        
        res.json(versionInfo);
    } catch (error) {
        console.error('Error serving version information:', error);
        res.status(500).json({ error: 'Could not retrieve version information' });
    }
});

// Add versioning middleware for static assets
app.use((req, res, next) => {
    const fileExtension = path.extname(req.url).toLowerCase();
    
    // Only apply versioning to CSS and JS files
    if (['.css', '.js'].includes(fileExtension) && !req.url.includes('?v=')) {
        try {
            const filePath = path.join(__dirname, req.url);
            if (fs.existsSync(filePath)) {
                // Get file modification time as version
                const stats = fs.statSync(filePath);
                const versionTimestamp = stats.mtimeMs;
                
                // Redirect to the same URL with version parameter
                return res.redirect(301, `${req.url}?v=${versionTimestamp}`);
            }
        } catch (err) {
            console.error('Versioning error:', err);
        }
    }
    next();
});

// Add cache control middleware for different types of static assets
app.use((req, res, next) => {
    const fileExtension = path.extname(req.url).toLowerCase();
    
    if (req.url.includes('?v=')) {
        // For versioned assets, cache for 1 year (long-term caching)
        res.setHeader('Cache-Control', 'public, max-age=31536000');
    } else if (['.html'].includes(fileExtension)) {
        // For HTML files, no caching
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    } else if (['.jpg', '.jpeg', '.png', '.gif', '.ico', '.svg'].includes(fileExtension)) {
        // For images, cache for 1 week
        res.setHeader('Cache-Control', 'public, max-age=604800');
    } else {
        // Default: cache for 1 day
        res.setHeader('Cache-Control', 'public, max-age=86400');
    }
    
    next();
});

// Axios instance with SSL verification disabled
const axiosInstance = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false // SSL sertifikası doğrulamasını devre dışı bırak
    })
});

// Upload directory for images
const uploadDir = path.join(__dirname, 'uploads');
console.log('Upload directory:', uploadDir);

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('Created uploads directory');
    } catch (error) {
        console.error('Error creating uploads directory:', error);
    }
}

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log('Saving file to:', uploadDir);
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = uniqueSuffix + path.extname(file.originalname);
        console.log('Generated filename:', filename);
        cb(null, filename);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Configure multer for file uploads
const fireZayiStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Ensure directory exists
        const dir = 'uploads/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const fireZayiUpload = multer({ 
    storage: fireZayiStorage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Proxy middleware configuration
const proxyOptions = {
    target: 'https://10.21.22.11:50000',
    changeOrigin: true,
    secure: false, // SSL sertifikası doğrulamasını devre dışı bırak
    onProxyReq: (proxyReq, req, res) => {
        if (req.body) {
            const bodyData = JSON.stringify(req.body);
            proxyReq.setHeader('Content-Type', 'application/json');
            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
            proxyReq.write(bodyData);
        }
        
        // Log the request for debugging
        console.log('Proxying request:', {
            method: req.method,
            path: req.path,
            body: req.body,
            headers: proxyReq.getHeaders()
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
app.use('/b1s/v1/*', createProxyMiddleware(proxyOptions));

function generateGUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Test route using axiosInstance with pagination
app.get('/test', async (req, res) => {
    const sessionId = req.query.sessionId;
    const whsCode = req.query.whsCode;

    console.log("test", sessionId);
    try {
        let allData = [];
        let nextLink = null;
        
        // Initial request
        const initialResponse = await axiosInstance.get(
            "https://10.21.22.11:50000/b1s/v1/SQLQueries('OWTQ_LIST')/List",
            {
                params: {
                    value1: "'PROD'",
                    value2: "'" + whsCode + "'",
                },
                headers: {
                    Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
                    "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
                },
            }
        );

        console.log("Initial response:", initialResponse);
        console.log("Initial response data:", initialResponse.data);

        // Add initial data
        allData = [...initialResponse.data.value];
        nextLink = initialResponse.data["odata.nextLink"];

        // Continue fetching if there's more data
        while (nextLink) {
            console.log("Fetching next batch of data...");
            const nextResponse = await axiosInstance.get(
                `https://10.21.22.11:50000/b1s/v1/${nextLink}`,
                {
                    headers: {
                        Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
                        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
                    },
                }
            );
            console.log("Next response:", nextResponse);
            console.log("Next response:", nextResponse.data);
            // Add next batch of data
            allData = [...allData, ...nextResponse.data.value];
            nextLink = nextResponse.data["odata.nextLink"];
        }

        console.log("All data:", allData);
        console.log("Total count:", allData.length);

        res.json({
            value: allData,
            totalCount: allData.length
        });
    } catch (error) {
        console.error('Error:', error);
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Paginated OWTQ_LIST endpoint with skip parameter
app.get('/api/owtq-list', async (req, res) => {
    const sessionId = req.query.sessionId;
    const skip = parseInt(req.query.skip) || 0;
    
    try {
        const response = await axiosInstance.get(
            "https://10.21.22.11:50000/b1s/v1/SQLQueries('OWTQ_LIST')/List",
            {
                params: {
                    value1: "'PROD'",
                    value2: "'1010'",
                    $skip: skip
                },
                headers: {
                    Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
                    "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
                },
            }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/uretim-siparisleri-list", async (req, res) => {
  const sessionId = req.query.sessionId;
  const whsCode = req.query.whsCode;

  // Cache kontrolü için header ekle
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  console.log("Üretim siparişleri listesi istendi:", new Date().toISOString());
  console.log("Session ID:", sessionId);
  console.log("WhsCode:", whsCode);
  
  try {
    const response = await axiosInstance.get(
      "https://10.21.22.11:50000/b1s/v1/SQLQueries('OWTQ_NEW')/List",
      {
        params: {
          value1: "'PROD'",
          value2: "'"+whsCode+"'",
          // Cache-busting random parameter
          _: Date.now()
        },
        headers: {
          Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
          // SAP B1 API'ye de cache kontrolü için header ekle
          "Cache-Control": "no-cache, no-store"
        },
      }
    );
    
    console.log("Veri başarıyla alındı, satır sayısı:", response.data?.value?.length || 0);
    res.json(response.data);
  } catch (error) {
    console.error("Error:", error);
    console.error("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/production-orders", async (req, res) => {
    const orderData = req.body;
    const sessionId = req.query.sessionId;
    const guid = generateGUID();
    const orderItems = orderData.length;

    // Cache kontrolü için header ekle
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    console.log("Üretim siparişi oluşturma isteği:", new Date().toISOString());
    console.log("Received order data:", orderData);

    if (!Array.isArray(orderData) || orderData.length === 0) {
        return res.status(400).json({ error: 'Invalid order data format' });
    }

    try {
        // Tek bir istek için tüm siparişleri birleştir
        const bulkOrderData = {
            U_Type: "PROD",
            U_SessionID: orderItems,
            U_GUID: guid,
            U_Comments: "Toplu Üretim Siparişi",
            OrderItems: orderData.map(order => ({
                U_Type: order.U_Type,
                U_WhsCode: order.U_WhsCode,
                U_ItemCode: order.U_ItemCode,
                U_ItemName: order.U_ItemName,
                U_Quantity: order.U_Quantity,
                U_UomCode: order.U_UomCode,
                U_User: order.U_User,
                U_FromWhsCode: null,
                U_FromWhsName: null
            }))
        };

        console.log("Sending bulk order data:", JSON.stringify(bulkOrderData, null, 2));

        // Önce birleştirilmiş yeni endpoint'i deneyelim
        try {
            const response = await axiosInstance.post(
                "https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_OWTQ_BULK",
                bulkOrderData,
                {
                    headers: {
                        'Cookie': `B1SESSION=${sessionId}`,
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache, no-store'
                    }
                }
            );
            
            console.log('Bulk API Response:', response.data);
            return res.json({
                success: true,
                method: "bulk",
                data: response.data
            });
        } catch (bulkError) {
            // Bulk API yoksa veya hata verirse, eski yönteme geri dönelim
            console.warn("Bulk API hatası, her ürün için ayrı istek gönderiliyor:", bulkError.message);
            
            // Eski yöntem: Her bir sipariş için ayrı istek
            const results = await Promise.all(orderData.map(async (order) => {
                const data = {
                    U_Type: order.U_Type,
                    U_WhsCode: order.U_WhsCode,
                    U_ItemCode: order.U_ItemCode,
                    U_ItemName: order.U_ItemName,
                    U_Quantity: order.U_Quantity,
                    U_UomCode: order.U_UomCode,
                    U_SessionID: orderItems,
                    U_GUID: guid,
                    U_User: order.U_User,
                    U_FromWhsCode: null,
                    U_FromWhsName: null,
                    U_Comments: "Üretim Siparişi"
                };

                console.log("Sending individual data:", data);

                const response = await axiosInstance.post(
                    "https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_OWTQ",
                    data,
                    {
                        headers: {
                            'Cookie': `B1SESSION=${sessionId}`,
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache, no-store'
                        }
                    }
                );
                
                console.log('Response for item:', order.U_ItemCode, response.data);
                return response.data;
            }));

            console.log('All individual results:', results);
            return res.json({
                success: true,
                method: "individual",
                data: results
            });
        }
    } catch (error) {
        console.error('Error creating orders:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
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
app.post('/api/delivery-submit/:docNum', upload.array('images'), async (req, res) => {
    try {
        const docNum = req.params.docNum;
        const { deliveryData, sessionId } = req.body;
        
        // Parse deliveryData from string to object
        const parsedDeliveryData = typeof deliveryData === 'string' ? JSON.parse(deliveryData) : deliveryData;
        
        // Add image paths to delivery data if files were uploaded
        if (req.files && req.files.length > 0) {
            const imageFile = req.files.find(file => file.originalname === `${parsedDeliveryData.U_LineNum}.jpg`);
            if (imageFile) {
                const imagePath = '/uploads/' + imageFile.filename;
                parsedDeliveryData.U_Image = imagePath;
                console.log('Image path for line', parsedDeliveryData.U_LineNum, ':', imagePath);
            }
        }

        console.log('Received delivery data:', parsedDeliveryData);

        const response = await axiosInstance.post(
            'https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_OWTR',
            parsedDeliveryData,
            {
                headers: {
                    'Cookie': `B1SESSION=${sessionId}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Delivery API Response:', response.data);

        // Delete the uploaded file after successful submission
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting temp file:', err);
                else console.log('Successfully deleted file:', req.file.path);
            });
        }

        res.json({
            success: true,
            data: response.data
        });
    } catch (error) {
        // Delete the uploaded file if there was an error
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting temp file:', err);
                else console.log('Successfully deleted file:', req.file.path);
            });
        }

        console.error('Error in delivery submit:', error);
        res.status(500).json({
            success: false,
            error: 'Delivery submission failed',
            details: error.message
        });
    }
});

// External Supply Order endpoints
app.get("/api/supply-orders", async (req, res) => {
    const sessionId = req.query.sessionId;
    const whsCode = req.query.whsCode;

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
        console.log("Response for whsCode:", whsCode, response.data);
        res.json(response.data);
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// app.post("/api/supply-order", async (req, res) => {
//     const { sessionId, orderData } = req.body;

//     console.log("Processing order for WhsCode:", orderData.WhsCode);
//     console.log("Order data:", orderData);
 

//     try {
//         const response = await axiosInstance.post(
//           "https://10.21.22.11:50000/b1s/v1/SQLQueries('OPOR_NEW')/List",
//           orderData,
//           {
//             params: {
//               value1: "'SUPPLY'",
//               value2: `'${orderData.WhsCode}'`,
//             },
//             headers: {
//               Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
//               "Content-Type": "application/json",
//             },
//           }
//         );
//         res.json(response.data);
//     } catch (error) {
//         console.error("Error:", error.message);
//         res.status(500).json({ error: error.message });
//     }


app.get("/api/supply-detail-order/:docNum", async (req, res) => {
  console.log("ewqeqweqw");
  const sessionId = req.query.sessionId;
  const docNum = req.params.docNum;

  console.log("sessionId:", sessionId);
  console.log("docNum:", docNum);

  try {
    const response = await axiosInstance.get(
      "https://10.21.22.11:50000/b1s/v1/SQLQueries('OPDN_NEW')/List",
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

    console.log("Response:supply-detail-order/:docNum::::::>>>>>>", response);

    console.log("Response for docNum:", docNum, response.data);

    res.json(response.data);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/supply-order/:docNum", async (req, res) => {
    console.log("ewqeqweqw");
    const sessionId = req.query.sessionId;
    const docNum = req.params.docNum;

    console.log("sessionId:", sessionId);
    console.log("docNum:", docNum);
    console.log("/api/supply-order/:docNum:");

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

  console.log("Response:supply-order/:docNum::::::>>>>>>", response);
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

app.get("/api/supply-delivery/:docNum", async (req, res) => {
    const sessionId = req.query.sessionId;
    const docNum = req.params.docNum;

    console.log("Getting delivery details for docNum:", docNum);
    console.log("sessionId:", sessionId);
    console.log("docNum:", docNum);

    

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

app.post("/api/supply-delivery/:docNum", upload.single('image'), async (req, res) => {
    console.log("Processing delivery for docNum:", req.params.docNum);
    console.log("Using sessionId:", req.body.sessionId);
    try {
        const docNum = req.params.docNum;
        const { deliveryData, sessionId } = req.body;
        
        // Parse deliveryData from string to object
        const parsedDeliveryData = typeof deliveryData === 'string' ? JSON.parse(deliveryData) : deliveryData;
        
        // Add image path to delivery data if file was uploaded
        if (req.file) {
            console.log('Uploaded file:', req.file);
            const imagePath = '/uploads/' + req.file.filename;
            parsedDeliveryData.U_Image = imagePath;
            console.log('Image path:', imagePath);
        }

        console.log('Received delivery data:', parsedDeliveryData);

        const response = await axiosInstance.post(
            'https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_OPDN',
            parsedDeliveryData,
            {
                headers: {
                    'Cookie': `B1SESSION=${sessionId}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Delivery API Response:', response.data);

        // Delete the uploaded file after successful submission
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting temp file:', err);
                else console.log('Successfully deleted file:', req.file.path);
            });
        }

        res.json({
            success: true,
            data: response.data
        });
    } catch (error) {
        // Delete the uploaded file if there was an error
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting temp file:', err);
                else console.log('Successfully deleted file:', req.file.path);
            });
        }

        console.error('Error in delivery submit:', error);
        res.status(500).json({
            success: false,
            error: 'Delivery submission failed',
            details: error.message
        });
    }
});

// app.post("/api/supply-delivery/:docNum", async (req, res) => {
//     const { docNum } = req.params;
//     const { sessionId, items } = req.body;

//     console.log("Processing delivery for docNum:", docNum);
//     console.log("Using sessionId:", sessionId);
//     console.log("Items:", items); 
 

//     try {
//         const guid = generateGUID(); // Tek bir GUID oluştur
//         const deliveryRequests = items.map((item) => ({
//           U_Type: "SUPPLY",
//           U_WhsCode: item.U_WhsCode,
//           U_CardName: item.U_CarName,
//           U_DocDate: item.U_DocDate,
//           U_DocNum: docNum,
//           U_NumAtCard: item.U_NumAtCard,
//           U_ItemCode: item.U_ItemCode,
//           U_ItemName: item.U_ItemName,
//           U_Quantity: item.U_Quantity,
//           U_DeliveryQty: item.U_DeliveryQty,
//           U_MissingQty: item.U_MissingQty,
//           U_DefectiveQty: item.U_DefectiveQty,
//           U_UomCode: item.U_UomCode,
//           U_Comments: item.U_Comments,
//           U_Image: "",
//           U_SessionID: sessionId,
//           U_GUID: guid, // Aynı GUID'i kullan
//           U_User: item.U_User,
//           U_LineNum: item.U_LineNum,
//         }));
 
//         console.log("Delivery requests:", deliveryRequests);

//         console.log("Sending delivery requests with GUID:", guid);

//         // // Tüm istekleri paralel olarak gönder
//         // const responses = await Promise.all(
//         //     deliveryRequests.map(data => 
//         //         axiosInstance.post(
//         //             "https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_OPDN",
//         //             data,
//         //             {
//         //                 headers: {
//         //                     Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
//         //                     "Content-Type": "application/json",
//         //                 },
//         //             }
//         //         )
//         //     )
//         // );

//         // console.log(`Successfully processed ${responses.length} items with GUID: ${guid}`);

//         // res.json({
//         //     success: true,
//         //     message: `Successfully processed ${responses.length} items`,
//         //     guid: guid,
//         //     results: responses.map(r => r.data)
//         // });
//     } catch (error) {
//         console.error("Error processing delivery:", error);
//         res.status(500).json({ 
//             success: false,
//             error: error.message,
//             details: error.response?.data || 'Unknown error occurred'
//         });
//     }
// });

// Dış tedarik ürünlerini getir
app.get("/api/supply-items-list/:whsCode", async (req, res) => {
    const { whsCode } = req.params;
    const sessionId = req.query.sessionId;

    console.log("whsCode:", whsCode);
    console.log("sessionId:", sessionId);

    if (!sessionId) {
        return res.status(401).json({ error: 'Oturum bulunamadı' });
    }

    try {
        const response = await axiosInstance.get(
            `https://10.21.22.11:50000/b1s/v1/SQLQueries('OPOR_NEW')/List`,
            {
                params: {
                    value1: "'SUPPLY'",
                    value2: `'${whsCode}'`
                },
                headers: {
                    Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
                    "Content-Type": "application/json",
                }
            }
        );

        console.log("Response for whsCode:", whsCode, response.data);
        res.json(response.data);
    } catch (error) {
        console.error("Error fetching supply items:", error);
        res.status(500).json({ error: error.message });
    }
});

// Dış tedarik siparişi oluştur
app.post("/api/supply-order", async (req, res) => {
    const { items } = req.body;
    const sessionId = req.query.sessionId;
    const whsCode = req.query.whsCode;
    const itemsCount = items.length;

    console.log("supply-order Processing supply order for items:", items);
    console.log("supply-order Using sessionId:", sessionId);
    console.log("supply-order Using whsCode:", whsCode);

    
    try {
        const guid = generateGUID(); // Tek bir GUID oluştur
        const responses = [];


       
        // Her ürün için sipariş oluştur
        for (const item of items) {
            const response = await axiosInstance.post(
              "https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_OPOR",
              {
                U_Type: "SUPPLY",
                U_WhsCode: item.U_WhsCode,
                U_ItemCode: item.U_ItemCode,
                U_ItemName: item.U_ItemName,
                U_Quantity: item.U_Quantity,
                U_UomCode: item.U_UomCode,
                U_CardCode: item.U_CardCode,
                U_CardName: item.U_CardName,
                U_SessionID: itemsCount, 
                U_GUID: guid + "_" + item.U_CardCode, // Aynı GUID'i kullan
                U_User: item.U_User,
              },
              {
                headers: {
                  Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
                  "Content-Type": "application/json",
                },
              }
            );
            
            console.log(`Response for item request:`, response.data);
            responses.push(response.data);
            // console.log(`Supply order created for item ${item.ItemCode} with GUID: ${guid}`);
        }

        console.log("Response:supply-order/:docNum::::::>>>>>>", responses);
        console.log(`Successfully created orders for ${responses}`);

        res.json({
            success: true,
            message: `Successfully created orders for ${responses.length} items`,
            guid: guid,
            results: responses
        });
    } catch (error) {
        console.error("Error creating supply order:", error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            details: error.response?.data || 'Unknown error occurred'
        });
    }
});
 
// Transfer listesini getir
app.get("/api/transfer-list/:whsCode", async (req, res) => {
    const { whsCode } = req.params;
    const sessionId = req.query.sessionId;

    console.log("whsCode:", whsCode);
    console.log("sessionId:", sessionId);

    if (!sessionId) {
        return res.status(401).json({ error: 'Oturum bulunamadı' });
    }

    // https://10.21.22.11:50000/b1s/v1/SQLQueries('OWTQ_T_LIST')/List?value1= 'TRANSFER'&value2= 'WhsCode'

    try {
        const response = await axiosInstance.get(
            `https://10.21.22.11:50000/b1s/v1/SQLQueries('OWTQ_T_LIST')/List`,
            {
                params: {
                    value1: "'TRANSFER'",
                    value2: `'${whsCode}'`
                },
                headers: {
                    Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
                    "Content-Type": "application/json",
                }
            }
        );

        console.log("Response for whsCode:", whsCode, response.data);
        res.json(response.data);
    } catch (error) {
        console.error("Error fetching transfer list:", error);
        res.status(500).json({ error: error.message });
    }
});

// Transfer İşlemleri için Endpoints

// Transfer için ürün listesini getir
app.get('/api/transfer/items', async (req, res) => {
    const sessionId = req.query.sessionId;
    const whsCode = req.query.whsCode;
    
    console.log('Using sessionId:', sessionId);
    console.log('Using whsCode:', whsCode);

  
    try {
      const response = await axiosInstance.get(
        "https://10.21.22.11:50000/b1s/v1/SQLQueries('OWTQ_T_NEW')/List",
        {
          params: {
            value1: "'TRANSFER'",
            value2: "'"+whsCode+"'",
          },
          headers: {
            Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Response for transfer items:", response);
      res.json(response.data);
    } catch (error) {
      console.error(
        "Error fetching transfer items:",
        error.response?.data || error.message
      );
      res.status(500).json({
        status: "error",
        message: "Ürün listesi alınırken bir hata oluştu",
        error: error.response?.data || error.message,
      });
    }
});

// Yeni transfer oluştur
app.post("/api/transfer/create", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transferItems = req.body;

  console.log("Using sessionId:", sessionId);
  console.log("Transfer items:", transferItems);

  if (!Array.isArray(transferItems) || transferItems.length === 0) {
    return res.status(400).json({ error: "Invalid transfer data format" });
  }

  const generateGUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0,
        v = c == "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const transferCounts = transferItems.length;
   

  try {
    const results = await Promise.all(
      transferItems.map(async (item) => {
        const data = {
          U_Type: item.U_Type,
          U_WhsCode: item.U_WhsCode,
          U_ItemCode: item.U_ItemCode,
          U_ItemName: item.U_ItemName,
          U_FromWhsCode: item.U_FromWhsCode,
          U_FromWhsName: item.U_FromWhsName,
          U_Quantity: item.U_Quantity,
          U_UomCode: item.U_UomCode,
          U_Comments: item.U_Comments || "",
          U_SessionID: transferCounts,
          U_GUID: generateGUID() + "_" + item.U_FromWhsCode,
          U_User: item.U_User,
        };

        console.log("Sending data:", data);

        const response = await axiosInstance.post(
          "https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_OWTQ",
          data,
          {
            headers: {
              Cookie: `B1SESSION=${sessionId}`,
              "Content-Type": "application/json",
            },
          }
        );
        console.log("Transfer created Server Reponse:", response.data);
        // console.log("Response for item:", item.U_ItemCode, response.data);
        return response.data;
      })
    );

    console.log("All results:", results);
    res.json(results);
  } catch (error) {
    console.error("Error creating transfers:", error);
    res.status(500).json({ error: error.message });
  }
});

// Transfer onaylama/reddetme
app.post('/api/transfer/approve/:docNum', async (req, res) => {
    const { docNum } = req.params;
    const { sessionId, note, transferData } = req.body;

    console.log('Approving/rejecting transfer for docNum:', docNum);
    console.log('Using sessionId:', sessionId);
    console.log('Transfer data:', transferData);

    const transferCounts = transferData.length;

    try {
        const response = await axiosInstance.post(
            "https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_OWTR",
            {
                U_Type: "TRANSFER",
                U_DocNum: parseInt(docNum),
                U_WhsCode: transferData.WhsCode,
                U_ItemCode: transferData.ItemCode,
                U_ItemName: transferData.ItemName,
                U_DocDate: transferData.DocDate,
                U_Quantity: parseFloat(transferData.Quantity),
                U_UomCode: transferData.UomCode,
                U_FromWhsCode: transferData.FromWhsCode,
                U_FromWhsName: transferData.FromWhsName,
                U_DocStatus: transferData.approved ? "3" : "5",
                U_Comments: note || "",
                U_SessionID: 1,
                U_GUID: generateGUID(),
                U_User: transferData.UserName
            },
            {
                headers: {
                    Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
                    "Content-Type": "application/json"
                }
            }
        );

        console.log('Transfer approved/rejected:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Error approving/rejecting transfer:', error.response?.data || error.message);
        res.status(500).json({
            status: 'error',
            message: 'Transfer onaylama/reddetme işlemi başarısız oldu',
            error: error.response?.data || error.message
        });
    }
});

// Transfer teslim alma
app.post('/api/transfer/deliver/:docNum', async (req, res) => {
    const { docNum } = req.params;
    const sessionId = req.query.sessionId;
    const transferData = req.body;

    if (!sessionId || !docNum) {
        return res.status(400).json({
            message: 'Session ID ve DocNum zorunludur'
        });
    }

    console.log('Delivering transfer for docNum:', docNum);
    console.log('Transfer data:', transferData);

    try {
        const response = await axiosInstance.post(
            "https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_OWTR",
            transferData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `B1SESSION=${sessionId}`
                }
            }
        );

        console.log('Transfer delivered successfully:', response.data);

        res.json({
            status: 'success',
            message: 'Transfer teslim alındı',
            data: response.data
        });

    } catch (error) {
        console.error('Error delivering transfer:', error.response?.data || error.message);
        res.status(500).json({
            status: 'error',
            message: error.response?.data?.error?.message || 'Transfer teslim alınırken bir hata oluştu'
        });
    }
});

// Transfer detaylarını getir
app.get('/api/transfer/:docNum', async (req, res) => {
    const { docNum } = req.params;
    const { sessionId } = req.query;


    // if (!sessionId || !docNum) {
    //     return res.status(400).json({ error: 'Session ID ve DocNum zorunludur' });
    // }

    console.log('Getting transfer details for docNum:', docNum);
    console.log('Using sessionId:', sessionId);

    try {
        const response = await axiosInstance.get(
            `https://10.21.22.11:50000/b1s/v1/SQLQueries('OWTR_T_NEW')/List`,
            {
                params: {
                value1: "'TRANSFER'",
                value2: `'${docNum}'`,
                },
                headers: {
                    Cookie: 'B1SESSION=' + encodeURIComponent(sessionId),
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Response for response:',response);
        console.log('Response for docNum:', docNum, response.data);

        // if (!response.data || !response.data.value || response.data.value.length === 0) {
        //     return res.status(404).json({ error: 'Transfer bulunamadı' });
        // }

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching transfer details:', error);
        res.status(500).json({ 
            error: 'Transfer detayları alınırken bir hata oluştu',
            details: error.message 
        });
    }
});

// Checklist endpoints
app.get('/api/checklist', async (req, res) => {
    const { sessionId, whsCode } = req.query;

    console.log('Using sessionId:', sessionId);
    console.log('Using whsCode:', whsCode);
    
    if (!sessionId || !whsCode) {
        return res.status(400).json({
            success: false,
            error: 'Session ID and WhsCode are required'
        });
    }

    // https://10.21.22.11:50000/b1s/v1/SQLQueries('Check_List')/List?value1= 'WhsCode'
    try {
        const response = await axiosInstance.get(
            `https://10.21.22.11:50000/b1s/v1/SQLQueries('Check_List')/List`,
            {
                params: {
                    value1: whsCode
                },
                headers: {
                    'Cookie': `B1SESSION=${sessionId}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Response for whsCode:', response);
        console.log('Response for whsCode:',  response.data);

        res.json({
            success: true,
            data: response.data.value
        });
    } catch (error) {
        console.error('Error fetching checklist:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch checklist',
            details: error.message
        });
    }
});

app.post('/api/checklist/update', async (req, res) => {
    const { sessionId } = req.query;
    const { whsCode, tasks, localStorageUserName } = req.body;

    console.log('Using sessionId:', sessionId);
    console.log('Using whsCode:', whsCode);
    console.log('Using tasks:', tasks);
    
    if (!sessionId || !whsCode || !tasks) {
        return res.status(400).json({
            success: false,
            error: 'Session ID, WhsCode and tasks are required'
        });
    }

    try {
        const currentDate = new Date().toISOString().split('T')[0];
        const guid = generateGUID();

        // Create an array of promises for each task
        const sendPromises = tasks.map(async (task) => {
            const checklistItem = {
                U_WhsCode: whsCode,
                U_CheckListCode: task.LineNum,
                U_DocDate: currentDate,
                U_WorkCode: task.TaskCode,
                U_WorkName: task.TaskName,
                U_WorkStatus: task.Status === 'C',
                U_FreeText: task.Description || '',
                U_Frequency: task.Frequency || '',
                U_SessionID: sessionId,
                U_GUID: guid,
                U_User: localStorageUserName
            };

            console.log('Sending individual checklistItem:', checklistItem);

            try {
                const response = await axiosInstance.post(
                    'https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_CheckList',
                    checklistItem,
                    {
                        headers: {
                            'Cookie': `B1SESSION=${sessionId}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                console.log('Individual response success:', response.data);
                return { success: true, data: response.data };
            } catch (error) {
                console.error('Individual request failed:', error.response?.data || error.message);
                return { 
                    success: false, 
                    error: error.response?.data || error.message,
                    task: task.TaskName 
                };
            }
        });

        // Wait for all requests to complete
        const results = await Promise.all(sendPromises);

        // Check if any requests failed
        const failures = results.filter(result => !result.success);
        if (failures.length > 0) {
            console.error('Some tasks failed to update:', failures);
            return res.status(500).json({
                success: false,
                error: 'Some tasks failed to update',
                details: failures
            });
        }

        // All requests succeeded
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error updating checklist:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to update checklist',
            details: error.response?.data || error.message
        });
    }
});

// User validation endpoint
app.post('/api/validate-user', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const users = require('./json/users.json');
        let validUser = null;
        let branchCode = null;
        
        // Check branch users first
        for (const branch of users.branches) {
            const user = branch.users.find(u => u.username === username && u.password === password);
            if (user) {
                validUser = user;
                branchCode = branch.branchCode;
                break;
            }
        }
        
        if (validUser) {
            return res.json({
                valid: true,
                user: {
                    type: validUser.type,
                    branchCode: branchCode,
                    branchName: users.branches.find(b => b.branchCode === branchCode).branchName,
                    name: validUser.name,
                    // Send admin credentials for SAP login
                    username: users.admin.username,
                    password: users.admin.password
                }
            });
        }
        
        // If no branch user found, check if it's admin
        if (username === users.admin.username && password === users.admin.password) {
            return res.json({
                valid: true,
                user: {
                    type: users.admin.type,
                    branchCode: users.admin.branchCode,
                    name: 'Admin',
                    username: users.admin.username,
                    password: users.admin.password
                }
            });
        }
        
        // If no user found
        res.json({
            valid: false,
            message: 'Geçersiz kullanıcı adı veya şifre'
        });
        
    } catch (error) {
        console.error('User validation error:', error);
        res.status(500).json({
            valid: false,
            message: 'Kullanıcı doğrulama hatası'
        });
    }
});

// Ana depo siparişleri
app.get('/anadepo-siparisleri', async (req, res) => {
    const sessionId = req.query.sessionId;
    const whsCode = req.query.whsCode;

    console.log("test", sessionId);
    try {
        let allData = [];
        let nextLink = null;
        
        // Initial request
        const initialResponse = await axiosInstance.get(
            "https://10.21.22.11:50000/b1s/v1/SQLQueries('OWTQ_LIST')/List",
            {
                params: {
                    value1: "'MAIN'",
                    value2: "'" + whsCode + "'",
                },
                headers: {
                    Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
                    "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
                },
            }
        );

        console.log("Initial response:", initialResponse);
        console.log("Initial response data:", initialResponse.data);

        // Add initial data
        allData = [...initialResponse.data.value];
        nextLink = initialResponse.data["odata.nextLink"];

        // Continue fetching if there's more data
        while (nextLink) {
            console.log("Fetching next batch of data...");
            const nextResponse = await axiosInstance.get(
                `https://10.21.22.11:50000/b1s/v1/${nextLink}`,
                {
                    headers: {
                        Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
                        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
                    },
                }
            );
            console.log("Next response:", nextResponse);
            console.log("Next response:", nextResponse.data);
            // Add next batch of data
            allData = [...allData, ...nextResponse.data.value];
            nextLink = nextResponse.data["odata.nextLink"];
        }

        console.log("All data:", allData);
        console.log("Total count:", allData.length);

        res.json({
            value: allData,
            totalCount: allData.length
        });
    } catch (error) {
        console.error('Error:', error);
        console.error("Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get("/anadepo-siparisleri-list", async (req, res) => {
  const sessionId = req.query.sessionId;
  const whsCode = req.query.whsCode;
  console.log("sessionId", sessionId); 
  console.log("whsCode", whsCode); 
  try {
    const response = await axiosInstance.get(
      "https://10.21.22.11:50000/b1s/v1/SQLQueries('OWTQ_NEW')/List",
      {
        params: {
          value1: "'MAIN'",
          value2: "'" + whsCode + "'",
        },
        headers: {
          Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        },
      }
    );

    console.log(response);
    console.log(response.data);

    res.json(response.data);
  } catch (error) {
    console.error("Error:", error);
    console.error("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/anadepo-orders", async (req, res) => {
    const orderData = req.body;
    const sessionId = req.query.sessionId;
    const guid = generateGUID();
    const orderItems = orderData.length;

    console.log("Received order data:", orderData);

    if (!Array.isArray(orderData) || orderData.length === 0) {
        return res.status(400).json({ error: 'Invalid order data format' });
    }

    try {
        const results = await Promise.all(orderData.map(async (order) => {
            const data = {
                U_Type: order.U_Type,
                U_WhsCode: order.U_WhsCode,
                U_ItemCode: order.U_ItemCode,
                U_ItemName: order.U_ItemName,
                U_Quantity: order.U_Quantity,
                U_UomCode: order.U_UomCode,
                U_SessionID: orderItems,
                U_GUID: guid,
                U_User: order.U_User,
                U_FromWhsCode: null,
                U_FromWhsName: null,
                U_Comments: "Ana Depo Siparişi"
            };

            console.log("Sending api/anadepo-orders data:", data);
            
            const response = await axiosInstance.post(
                "https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_OWTQ",
                data,
                {
                    headers: {
                        'Cookie': `B1SESSION=${sessionId}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log('Response for item:', order.U_ItemCode, response.data);
            return response.data;
        }));

        console.log('All results:', results);
        res.json(results);
    } catch (error) {
        console.error('Error creating orders:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/anadepo-order/:docNum", async (req, res) => {
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
                    value1: "'MAIN'",
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

// Get delivery details
app.get('/api/anadepo-delivery/:docNum', async (req, res) => {
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
                    value1: "'MAIN'",
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
app.post('/api/anadepo-delivery-submit/:docNum', upload.array('images'), async (req, res) => {
    try {
        const docNum = req.params.docNum;
        const { deliveryData, sessionId } = req.body;
        
        // Parse deliveryData from string to object
        const parsedDeliveryData = typeof deliveryData === 'string' ? JSON.parse(deliveryData) : deliveryData;
        
        // Add image paths to delivery data if files were uploaded
        if (req.files && req.files.length > 0) {
            const imageFile = req.files.find(file => file.originalname === `${parsedDeliveryData.U_LineNum}.jpg`);
            if (imageFile) {
                const imagePath = '/uploads/' + imageFile.filename;
                parsedDeliveryData.U_Image = imagePath;
                console.log('Image path for line', parsedDeliveryData.U_LineNum, ':', imagePath);
            }
        }

        console.log('Received delivery data:', parsedDeliveryData);

        const response = await axiosInstance.post(
            'https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_OWTR',
            parsedDeliveryData,
            {
                headers: {
                    'Cookie': `B1SESSION=${sessionId}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Delivery API Response:', response.data);

        // Delete the uploaded file after successful submission
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting temp file:', err);
                else console.log('Successfully deleted file:', req.file.path);
            });
        }

        res.json({
            success: true,
            data: response.data
        });
    } catch (error) {
        // Delete the uploaded file if there was an error
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting temp file:', err);
                else console.log('Successfully deleted file:', req.file.path);
            });
        }

        console.error('Error in delivery submit:', error);
        res.status(500).json({
            success: false,
            error: 'Delivery submission failed',
            details: error.message
        });
    }
});

// Fire ve Zayi endpoints
app.get('/api/lost-items', async (req, res) => {
    const { sessionId, whsCode } = req.query;

    console.log('Using sessionId:', sessionId);
    console.log('Using whsCode:', whsCode);
    
    if (!sessionId || !whsCode) {
        return res.status(400).json({
            success: false,
            error: 'Session ID and WhsCode are required'
        });
    }

    try {
        const response = await axiosInstance.get(
            `https://10.21.22.11:50000/b1s/v1/SQLQueries('Lost_List')/List`,
            {
                params: {
                    value1: whsCode
                },
                headers: {
                    'Cookie': `B1SESSION=${sessionId}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Response for lost items:', response.data);

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching lost items:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch lost items',
            details: error.message
        });
    }
});

app.get('/api/lost-items/new', async (req, res) => {
    const { sessionId, whsCode } = req.query;
    
    if (!sessionId || !whsCode) {
        return res.status(400).json({
            success: false,
            error: 'Session ID and WhsCode are required'
        });
    }

    try {
        const response = await axiosInstance.get(
            `https://10.21.22.11:50000/b1s/v1/SQLQueries('Lost_New')/List`,
            {
                params: {
                    value1: whsCode
                },
                headers: {
                    'Cookie': `B1SESSION=${sessionId}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching new lost items:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch new lost items',
            details: error.message
        });
    }
});

app.post('/api/lost-items/create', fireZayiUpload.array('image', 5000), async (req, res) => {
    try {
        console.log('Received request to create lost items:');
        console.log('WhsCode:', req.body.whsCode);
        console.log('SessionId:', req.body.sessionId);
        console.log('Username:', req.body.username);
        console.log('RecordType:', req.body.recordType);
        console.log('Items:', req.body.items);
        console.log('Files:', req.files ? req.files.length : 0, 'files received');

        const { whsCode, sessionId, username, recordType, items } = req.body;
        
        try {
            console.log('Parsing items JSON...');
            const parsedItems = JSON.parse(items);
            console.log('Parsed items:', parsedItems);

            if (!sessionId || !whsCode || !username || !recordType || !parsedItems) {
                console.log('Missing required fields:', {
                    sessionId: !!sessionId,
                    whsCode: !!whsCode,
                    username: !!username,
                    recordType: !!recordType,
                    parsedItems: !!parsedItems
                });
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields'
                });
            }

            console.log('Creating lost items for whsCode:', whsCode);
            console.log('Using sessionId:', sessionId);
            console.log('Using username:', username);
            console.log('Using recordType:', recordType);
            console.log('Using items:', parsedItems);
            console.log('Files received:', req.files);

            const currentDate = new Date().toISOString().split('T')[0];
            const results = [];

            for (const [index, item] of parsedItems.entries()) {
                try {
                    console.log('Processing item:', index, item);
                    const guid = generateGUID();
                    const imageFile = req.files ? req.files[index] : null;
                    const imagePath = imageFile ? `/uploads/${imageFile.filename}` : '';

                    console.log('Item:', item);
                    console.log('Image Path:', imagePath);
                    console.log('Making API request for item:', item.itemCode);
                    const response = await axiosInstance.post(
                        'https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_Lost',
                        {
                            U_WhsCode: whsCode,
                            U_DocDate: currentDate,
                            U_ItemCode: item.itemCode,
                            U_ItemName: item.itemName,
                            U_Quantity: item.quantity,
                            U_UomCode: item.unit,
                            U_FreeText: item.description || '',
                            U_Image: imagePath,
                            U_DocStatus: recordType,
                            U_SessionID: sessionId,
                            U_GUID: guid,
                            U_User: username
                        },
                        {
                            headers: {
                                'Cookie': `B1SESSION=${sessionId}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    console.log('API Response for item:', item.itemCode, response.data);

                    results.push({
                        itemCode: item.itemCode,
                        success: true,
                        data: response.data
                    });
                } catch (itemError) {
                    console.error('Error processing item:', item.itemCode, itemError);
                    console.error('Error details:', itemError.response?.data || itemError.message);
                    throw itemError;
                }
            }

            console.log('All items processed successfully');
            res.json({
                success: true,
                results
            });
        } catch (parseError) {
            console.error('Error parsing or processing items:', parseError);
            throw parseError;
        }
    } catch (error) {
        console.error('Error creating lost items:', error);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        console.error('Error response data:', error.response?.data);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        res.status(500).json({
            success: false,
            error: 'Failed to create lost items',
            details: error.response?.data || error.message
        });
    }
});

// Ticket endpoints
app.get('/api/tickets', async (req, res) => {
    try {
        const { sessionId, whsCode} = req.query;

        console.log('Using sessionId:', sessionId);
        console.log('Using whsCode:', whsCode); 

        if (!sessionId || !whsCode) {
            console.log('Missing required fields:', { sessionId: !!sessionId, whsCode: !!whsCode });
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        

        console.log('Fetching tickets for whsCode:', whsCode);
        console.log('Using sessionId:', sessionId);

        const response = await axiosInstance.get(
            `https://10.21.22.11:50000/b1s/v1/SQLQueries('Ticket_list')/List`,
            {
                params: {
                    value1: whsCode,
                    // value2: activityType
                },
                headers: {
                    'Cookie': `B1SESSION=${sessionId}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('SAP B1 Response:', {
            status: response.status,
            data: response.data
        });

        if (!response.data || !response.data.value) {
            console.log('Invalid response format from SAP B1');
            throw new Error('Invalid response format from SAP B1');
        }

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        console.error('Error response:', error.response?.data);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tickets',
            details: error.response?.data || error.message
        });
    }
});

app.delete('/api/tickets/:docNum', async (req, res) => {
    try {
        const { docNum } = req.params;
        const { sessionId } = req.body;

        if (!sessionId || !docNum) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        console.log('Deleting ticket:', docNum);
        console.log('Using sessionId:', sessionId);

        const response = await axiosInstance.post(
            'https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_Lost',
            {
                DocNum: docNum,
                Cancelled: 'Y'
            },
            {
                headers: {
                    'Cookie': `B1SESSION=${sessionId}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Delete response:', response.data);

        res.json({
            success: true,
            message: 'Ticket deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting ticket:', error);
        console.error('Error response:', error.response?.data);
        res.status(500).json({
            success: false,
            error: 'Failed to delete ticket',
            details: error.response?.data || error.message
        });
    }
});

// Get branches for ticket creation
app.get('/api/branches', async (req, res) => {
    try {
        const sessionId = req.query.sessionId;
        
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Missing session ID'
            });
        }

        const response = await axiosInstance.get(
            `https://10.21.22.11:50000/b1s/v1/SQLQueries('List_Whs')/List`,
            {
                headers: {
                    'Cookie': `B1SESSION=${sessionId}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json(response.data.value);
    } catch (error) {
        console.error('Error fetching branches:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch branches',
            details: error.response?.data || error.message
        });
    }
});

// Get users for ticket creation
app.get('/api/users', async (req, res) => {
    try {
        const sessionId = req.query.sessionId;
        
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Missing session ID'
            });
        } 

        console.log('Fetching users with sessionId:', sessionId);

        const response = await axiosInstance.get(
            `https://10.21.22.11:50000/b1s/v1/SQLQueries('List_Usr')/List`,
            {
                headers: {
                    'Cookie': `B1SESSION=${sessionId}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Full response data structure:', JSON.stringify(response.data, null, 2));
        const users = response.data.value;
        console.log('First user example:', users[0]);

        res.json(users);
    } catch (error) {
        console.error('Error in /api/users:', error);
        if (error.response) {
            console.error('SAP B1 Error Response:', {
                status: error.response.status,
                data: error.response.data
            });
        }
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users',
            details: error.response?.data || error.message
        });
    }
});

// Create new ticket
app.post('/api/tickets', multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            console.log('Uploading file to uploads directory');
            cb(null, 'uploads/');
        },
        filename: function (req, file, cb) {
            console.log('Original file:', file);
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const filename = uniqueSuffix + '-' + file.originalname;
            console.log('Generated filename:', filename);
            cb(null, filename);
        }
    })
}).single('image'), async (req, res) => {
    try {
        console.log('Received request body:', req.body);
        console.log('Received file:', req.file);        
        
        const sessionId = req.query.sessionId;
        
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Missing session ID'
            });
        }

        // Create ticket data from form fields
        const ticketData = {
            U_WhsCode: req.body.U_WhsCode,
            U_FromWhsName: req.body.U_FromWhsName,
            U_DocDate: req.body.U_DocDate,
            U_UserName: req.body.U_UserName,
            U_Priority: req.body.U_Priority,
            U_FreeText: req.body.U_FreeText,
            U_User: req.body.U_User,
            U_Image: req.file ? req.file.path : null,
            U_SessionID: req.body.U_SessionID,
            U_GUID: req.body.U_GUID,
            U_DocStatus: 1,
        };

        console.log('Creating ticket with data:', ticketData);

        const response = await axiosInstance.post(
            'https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_Ticket',
            ticketData,
            {
                headers: {
                    'Cookie': `B1SESSION=${sessionId}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Ticket created successfully:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Error creating ticket:', error);
        console.error('Error response:', error.response?.data);
        res.status(500).json({
            success: false,
            error: 'Failed to create ticket',
            details: error.response?.data || error.message
        });
    }
});

// Get ticket details and replies
app.get('/api/tickets/:docNum', async (req, res) => {
    try {
        const sessionId = req.query.sessionId;
        const docNum = req.params.docNum;
        
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Missing session ID'
            });
        }

        // Get ticket details using SQLQuery
        const response = await axiosInstance.post(
            `https://10.21.22.11:50000/b1s/v1/SQLQueries('Ticket_Detail')/List`,
            {
                value1: docNum
            },
            {
                headers: {
                    'Cookie': `B1SESSION=${sessionId}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Ticket details response:' + docNum + "++>>>>>>", response);
        console.log('Ticket details responseData:' + docNum + "++>>>>>>", response.data);

        if (!response.data.value || response.data.value.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Ticket not found'
            });
        }

        res.json(response.data);
    } catch (error) {
        console.error('Error getting ticket details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get ticket details',
            details: error.response?.data || error.message
        });
    }
});

// Reply to a ticket
app.post('/api/tickets/:docNum/reply', upload.single('image'), async (req, res) => {
    try {
        const sessionId = req.query.sessionId;
        const docNum = req.params.docNum;
        const currentUser = req.body.UserName;
        const whsCode = req.body.whsCode;

        console.log('Received request body:', req.body);
        console.log('Received file:', req.file);        
        console.log('Using sessionId:', sessionId);
        console.log('Using docNum:', docNum);
        
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Missing session ID'
            });
        }

        const replyData = {
            DocNum: docNum,
            AS_B2B_TICKETREPLYCollection: [
                {
                    DocEntry: docNum,
                    LineId: 9999,
                    U_FreeTextD: req.body.FreeTextD,
                    U_ImageD: (req.file ? 'uploads/' + req.file.filename : null),
                    // format dd.MM.yyyy - hh:mm
                    U_ReplyDate: new Date().toLocaleString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    U_User: currentUser,
                    U_WhsCode: whsCode
                }   
            ]
        };

        console.log('Adding reply with data:', replyData);
 

        // Add reply to SAP B1
        const response = await axiosInstance.patch(
            `https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_Ticket(${docNum})`,
            replyData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `B1SESSION=${sessionId}`
                }
            }
        );

        console.log('Reply added successfully:', response);
        console.log('Reply added successfully:', response.data);

        res.json({
            success: true,
            data: response.data,
            uploadedFile: req.file ? {
                filename: req.file.filename,
                path: `/uploads/${req.file.filename}`
            } : null
        });
    } catch (error) {
        console.error('Error adding reply:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add reply',
            details: error.response?.data || error.message
        });
    }
}); 

// Update ticket status
app.post('/api/tickets/:docNum/status', async (req, res) => {
    try {
        const sessionId = req.query.sessionId;
        const docNum = req.params.docNum;
        const { status } = req.body;

        console.log('Updating ticket status:', { docNum, status, sessionId });

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Missing session ID'
            });
        }

        const updateData = {
            DocNum: docNum,
            U_DocStatus: status,
            U_StatusDate: new Date().toLocaleString('tr-TR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        };

        console.log('Updating ticket status with data:', updateData);

        // Update ticket status in SAP B1
        const response = await axiosInstance.patch(
            `https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_Ticket(${docNum})`,
            updateData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `B1SESSION=${sessionId}`
                }
            }
        );

        // console.log('Status updated successfully:', response);
        console.log('Status updated successfully:', response.data);

        res.json({
            success: true,
            data: response.data
        });
    } catch (error) {
        console.error('Error updating ticket status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update ticket status',
            details: error.response?.data || error.message
        });
    }
});

// count-new-list
app.get('/api/count-new-list', async (req, res) => {
    try {
        const sessionId = req.query.sessionId;
        const whsCode = req.query.whsCode;

        if (!sessionId || !whsCode) {
            return res.status(400).json({
                success: false,
                error: 'Eksik sessionId veya şube kodu!'
            });
        }
        // SAP B1 COUNT_NEW_LIST sorgusu
        const response = await axiosInstance.get(
            `https://10.21.22.11:50000/b1s/v1/SQLQueries('COUNT_NEW')/List?value1= '${whsCode}'`,
            {
                headers: {
                    'Cookie': `B1SESSION=${sessionId}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Count new list:', response.data);

        res.json(response.data);
    } catch (error) {
        console.error('Error getting count new list:', error);
        res.status(500).json({
            success: false,
            error: 'Stok sayımı için kullanılabilir ürünler alınamadı',
            details: error.response?.data || error.message
        });
    }
});


// Get count list
app.get('/api/count-list', async (req, res) => {
    try {
        const sessionId = req.query.sessionId;
        const whsCode = req.query.whsCode;

        if (!sessionId || !whsCode) {
            return res.status(400).json({
                success: false,
                error: 'Eksik sessionId veya şube kodu!'
            });
        }
  

        // SAP B1 COUNT_LIST sorgusu
        const response = await axiosInstance.get(
            `https://10.21.22.11:50000/b1s/v1/SQLQueries('COUNT_LIST')/List?value1= '${whsCode}'`,
            {
                headers: {
                    'Cookie': `B1SESSION=${sessionId}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        let data = response.data.value || [];
        console.log('Count list:', data);
        // Tabloda kullanılacak tüm alanları döndür
        // data = data.map(row => ({
        //     WhsCode: row.WhsCode,
        //     DocNum: row.DocNum,
        //     RefDate: row.RefDate,
        //     DocDate: row.DocDate,
        //     DocStatus: row.DocStatus,
        //     ItemCode: row.ItemCode,
        //     ItemName: row.ItemName,
        //     ItemGroup: row.ItemGroup,
        //     OnHand: row.OnHand,
        //     Quantity: row.Quantity,
        //     UomCode: row.UomCode
        // }));
        res.json(data);
    } catch (error) {
        console.error('Error getting count list:', error);
        res.status(500).json({
            success: false,
            error: 'Stok sayım listesi alınamadı',
            details: error.response?.data || error.message
        });
    }
});

// Çoklu veya tekli sayım kaydı
app.post('/api/count', async (req, res) => {
    try {
        const sessionId = req.query.sessionId;
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Eksik session ID!'
            });
        }
        
        // Tekli veya çoklu veri olabilir
        let counts = req.body;
        if (!Array.isArray(counts)) counts = [counts];
        
        if (!counts.length) {
            return res.status(400).json({
                success: false,
                error: 'Gönderilecek sayım verisi yok!'
            });
        }
        
        console.log('Gelen sayım verisi:', counts.length, 'kalem');
        
        // Veri formatını SAP B1 için uygun formata dönüştür
        // SAP B1, verileri AS_B2B_COUNT_DETAILCollection altında bekliyor
        // Her 25 öğeyi bir batch olarak gönder
        const BATCH_SIZE = 25;
        let results = [];
        let batchCount = 0;
        
        // Kalem sayımlarını batches halinde grupla
        for (let i = 0; i < counts.length; i += BATCH_SIZE) {
            batchCount++;
            const batchItems = counts.slice(i, i + BATCH_SIZE);
            console.log(`Batch ${batchCount}: İşlenen ${batchItems.length} öğe`);
            
            try {
                // Batch için payloadı hazırla
                const currentBatch = batchItems.map(item => {
                    // Validasyon
                    if (!item.U_WhsCode || !item.U_ItemCode || !item.U_Quantity || !item.U_UomCode) {
                        throw new Error(`Eksik veri: ${JSON.stringify(item)}`);
                    }
                    
                    return {
                        U_ItemCode: item.U_ItemCode,
                        U_ItemName: item.U_ItemName || "",
                        U_Quantity: parseFloat(item.U_Quantity),
                        U_UomCode: item.U_UomCode
                    };
                });
                
                // Payloadı oluştur
                const payload = {
                    U_WhsCode: batchItems[0].U_WhsCode,
                    U_RefDate: batchItems[0].U_RefDate || new Date().toISOString().split('T')[0],
                    U_DocDate: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), // 2025-05-06T00:00:00Z formatında
                    U_DocStatus: "1", // Doküman durumu 1 olarak gönderiliyor
                    U_SessionID: batchItems[0].U_SessionID || sessionId,
                    U_GUID: batchItems[0].U_GUID || `${Date.now()}_${Math.floor(Math.random() * 100000)}`,
                    U_User: batchItems[0].U_User || "System",
                    AS_B2B_COUNT_DETAILCollection: currentBatch
                };
                
                console.log(`API isteği gönderiliyor (Batch ${batchCount})`);
                console.log('Payload:', JSON.stringify(payload, null, 2));
                
                // API çağrısı
                const response = await retryAxiosRequest(async () => {
                    return axiosInstance.post(
                        'https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_COUNT',
                        payload,
                        {
                            headers: {
                                'Cookie': `B1SESSION=${sessionId}`,
                                'Content-Type': 'application/json'
                            },
                            timeout: 30000, // 30 saniye timeout
                            validateStatus: function (status) {
                                // 200 dışındaki başarı kodlarını da kabul et
                                return status < 500;
                            }
                        }
                    );
                }, 3, 2000);
                
                // Başarılı yanıt
                console.log(`Batch ${batchCount} başarıyla gönderildi:`, response.status);
                if (response.data) {
                    console.log('Yanıt verisi:', JSON.stringify(response.data, null, 2));
                }
                
                // Başarılı sonuçları kaydet
                batchItems.forEach(item => {
                    results.push({
                        success: true,
                        itemCode: item.U_ItemCode,
                        batch: batchCount,
                        data: response.data
                    });
                });
                
            } catch (error) {
                console.error(`Batch ${batchCount} işlenirken hata:`, error);
                if (error.response) {
                    console.error('Hata yanıtı:', error.response.status, JSON.stringify(error.response.data, null, 2));
                }
                
                // Session hatası kontrolü için yardımcı fonksiyon
                const hasSessionError = () => {
                    if (error.response && error.response.status === 401) return true;
                    if (error.response?.data?.error?.code === 301) return true;
                    
                    const errorMsg = error.response?.data?.error?.message;
                    if (errorMsg && typeof errorMsg === 'string' && errorMsg.toLowerCase().includes('session')) {
                        return true;
                    }
                    
                    if (error.message && typeof error.message === 'string' && 
                        error.message.includes('Oturum süresi dolmuş')) {
                        return true;
                    }
                    
                    return false;
                };
                
                // Oturum hatası
                if (hasSessionError()) {
                    console.warn('Oturum hatası tespit edildi, istemci yönlendiriliyor');
                    return res.status(401).json({
                        success: false,
                        error: 'Oturum süresi dolmuş, lütfen yeniden giriş yapın',
                        sessionExpired: true
                    });
                }
                
                // Başarısız sonuçları kaydet
                batchItems.forEach(item => {
                    results.push({
                        success: false,
                        itemCode: item.U_ItemCode,
                        batch: batchCount,
                        error: error.message
                    });
                });
            }
        }
        
        // Başarı durumunu kontrol et
        const failedItems = results.filter(r => !r.success);
        const successCount = results.length - failedItems.length;
        
        // Sonuçları döndür
        res.json({
            success: true,
            totalCount: counts.length,
            successCount: successCount,
            failCount: failedItems.length,
            results: results
        });
    } catch (error) {
        console.error('Stok sayımı oluşturma hatası:', error);
        
        // Session hatası kontrolü
        const hasSessionError = () => {
            if (error.response && error.response.status === 401) return true;
            if (error.response?.data?.error?.code === 301) return true;
            
            const errorMsg = error.response?.data?.error?.message;
            if (errorMsg && typeof errorMsg === 'string' && errorMsg.toLowerCase().includes('session')) {
                return true;
            }
            
            if (error.message && typeof error.message === 'string' && 
                error.message.includes('Oturum süresi dolmuş')) {
                return true;
            }
            
            return false;
        };
        
        // Oturum hatası
        if (hasSessionError()) {
            return res.status(401).json({
                success: false,
                error: 'Oturum süresi dolmuş, lütfen yeniden giriş yapın',
                sessionExpired: true
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Stok sayımı oluşturulurken hata oluştu',
            details: error.response?.data || error.message
        });
    }
});

// Toplu sayım işlemi için alias endpoint (geri uyumluluk için)
app.post('/api/count-new', async (req, res) => {
    // Tüm istekleri /api/count endpoint'ine yönlendir
    req.url = '/api/count' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
    app.handle(req, res);
});

// Stok sayım detayını getir
app.get('/api/count-detail/:docNum', async (req, res) => {
    try {
        const sessionId = req.query.sessionId;
        const docNum = req.params.docNum;

        if (!sessionId || !docNum) {
            return res.status(400).json({
                success: false,
                error: 'Eksik parametre!'
            });
        }

        // SAP B1'den detay çek
        const response = await axiosInstance.get(
            `https://10.21.22.11:50000/b1s/v1/SQLQueries('COUNT_UPDATE')/List`,
            {
                params: {
                    value1: `'${docNum}'`
                },
                headers: {
                    'Cookie': `B1SESSION=${sessionId}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Count detail:', response);
        let data = response.data.value || [];
        // Sadece ilgili alanları döndür
        data = data.map(row => ({
            WhsCode: row.WhsCode,
            DocNum: row.DocNum,
            RefDate: row.RefDate,
            DocDate: row.DocDate,
            DocStatus: row.DocStatus,
            ItemCode: row.ItemCode,
            ItemName: row.ItemName,
            ItemGroup: row.ItemGroup,
            Quantity: row.Quantity,
            UomCode: row.UomCode
        }));
        res.json(data);
    } catch (error) {
        console.error('Error getting count detail:', error);
        res.status(500).json({
            success: false,
            error: 'Stok sayım detayı alınamadı',
            details: error.response?.data || error.message
        });
    }
});

// Stok sayım güncelle
app.post('/api/count-update', async (req, res) => {
    console.log('---------- /api/count-update başladı ----------');
    console.log('Request headers:', JSON.stringify(req.headers));
    console.log('Request query:', JSON.stringify(req.query));
    
    try {
        // Session kontrolü - headers veya query'den sessionId'yi doğrudan al
        const sessionId = req.headers['x-session-id'] || req.query.sessionId;
        console.log('Session ID:', sessionId);
        
        if (!sessionId) {
            console.log('Hata: Session ID yok');
            return res.status(401).json({ 
                success: false, 
                error: 'Unauthorized', 
                message: 'Oturum bilgisi eksik. Lütfen giriş yapın.' 
            });
        }
        
        const updateData = req.body;
        console.log('Request body (özet):', {
            DocNum: updateData?.DocNum,
            WhsCode: updateData?.WhsCode,
            RefDate: updateData?.RefDate,
            ItemCount: updateData?.AS_B2B_COUNT_DETAILCollection?.length || 0
        });
        
        // İçeriğin detaylı gösterimi
        if (updateData?.AS_B2B_COUNT_DETAILCollection?.length > 0) {
            console.log('---------- KALEM DETAYLARI ----------');
            updateData.AS_B2B_COUNT_DETAILCollection.forEach((item, index) => {
                console.log(`Kalem ${index + 1}:`, {
                    ItemCode: item.U_ItemCode || item.ItemCode,
                    ItemName: item.U_ItemName || item.ItemName,
                    Quantity: item.U_Quantity || item.Quantity,
                    UomCode: item.U_UomCode || item.UomCode
                });
            });
            
            console.log('İlk 5 kalem tam içerik:');
            const sampleItems = updateData.AS_B2B_COUNT_DETAILCollection.slice(0, 5);
            console.log(JSON.stringify(sampleItems, null, 2));
            console.log('---------- KALEM DETAYLARI SONU ----------');
        }
        
        // Temel validasyon - zorunlu alanları kontrol et
        if (!updateData || !updateData.DocNum) {
            console.log('Hata: DocNum gerekli');
            return res.status(400).json({ 
                success: false, 
                error: 'Geçersiz istek formatı. DocNum gerekli.' 
            });
        }
        
        if (!updateData.WhsCode) {
            console.log('Hata: WhsCode gerekli');
            return res.status(400).json({ 
                success: false, 
                error: 'Geçersiz istek formatı. WhsCode gerekli.' 
            });
        }
        
        // AS_B2B_COUNT_DETAILCollection kontrolü
        if (!updateData.AS_B2B_COUNT_DETAILCollection || !Array.isArray(updateData.AS_B2B_COUNT_DETAILCollection)) {
            console.log('Hata: Kalem koleksiyonu geçersiz');
            return res.status(400).json({ 
                success: false, 
                error: 'Geçersiz istek formatı. AS_B2B_COUNT_DETAILCollection array olmalı.' 
            });
        }
        
        // Koleksiyondaki öğelerin geçerliliğini kontrol et
        const invalidItems = updateData.AS_B2B_COUNT_DETAILCollection.filter(item => 
            (!item.ItemCode && !item.U_ItemCode) || 
            (!item.ItemName && !item.U_ItemName) ||
            (item.Quantity === undefined && item.U_Quantity === undefined));
            
        if (invalidItems.length > 0) {
            console.log('Hata: Geçersiz kalemler:', invalidItems);
            return res.status(400).json({ 
                success: false, 
                error: 'Geçersiz istek formatı. Bazı kalemlerde zorunlu alanlar eksik (ItemCode/U_ItemCode, ItemName/U_ItemName, Quantity/U_Quantity).',
                invalidItemCount: invalidItems.length
            });
        }
        
        // SAP B1 servisi için URL ve veri
        const serviceUrl = `https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_COUNT(${updateData.DocNum})`;
        console.log('SAP API URL:', serviceUrl);
        
        console.log(`Stok sayımı güncelleniyor - DocNum: ${updateData.DocNum}, Items: ${updateData.AS_B2B_COUNT_DETAILCollection.length || 0}`);
        
        try {
            console.log('SAP isteği gönderiliyor...');
            
            // Format the request data according to the expected structure
            const formattedData = {
                DocNum: updateData.DocNum,
                Series: -1,
                DocEntry: updateData.DocNum,
                U_WhsCode: updateData.WhsCode,
                U_DocDate: updateData.DocDate || new Date().toISOString().split('T')[0],
                U_SessionID: sessionId,
                U_GUID: updateData.GUID || updateData.U_GUID || updateData.U_UpdateGUID || generateGUID(),
                U_User: updateData.User || updateData.U_User || userName || 'System',
                U_DocStatus: updateData.DocStatus || updateData.U_DocStatus || '1', // Varsayılan olarak '1' (açık/aktif)
                U_RefDate: updateData.RefDate || updateData.U_RefDate || new Date().toISOString().split('T')[0],
                AS_B2B_COUNT_DETAILCollection: updateData.AS_B2B_COUNT_DETAILCollection.map(item => ({
                    U_ItemCode: item.U_ItemCode || item.ItemCode,
                    U_ItemName: item.U_ItemName || item.ItemName,
                    U_Quantity: parseFloat(item.U_Quantity !== undefined ? item.U_Quantity : item.Quantity) || 0.0,
                    U_UomCode: item.U_UomCode || item.UomCode
                }))
            };
            
            // Request detaylarını logla
            console.log('Gönderilen API Yapısı:', {
                method: 'PUT',
                url: serviceUrl,
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `B1SESSION=${sessionId.substring(0, 5)}...` // Güvenlik için tam cookie değerini gösterme
                },
                dataStructure: {
                    DocNum: formattedData.DocNum,
                    WhsCode: formattedData.U_WhsCode,
                    RefDate: formattedData.U_RefDate,
                    DocDate: formattedData.U_DocDate,
                    collectionLength: formattedData.AS_B2B_COUNT_DETAILCollection?.length || 0
                }
            });
            
            // Formatlanmış verinin ilk 1000 karakterini logla
            const jsonData = JSON.stringify(formattedData, null, 2);
            console.log('Formatlanmış veri (ilk 1000 karakter):');
            console.log(jsonData.length > 1000 ? jsonData.substring(0, 1000) + '...' : jsonData);
            
            const response = await axiosInstance.put(
                serviceUrl,
                formattedData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': `B1SESSION=${sessionId}`
                    }
                }
            );
            
            console.log('SAP B1 güncelleme başarılı:', response.status);
            console.log('SAP yanıt başlıkları:', JSON.stringify(response.headers));
            
            // Detaylı yanıt verisi
            if (typeof response.data === 'object') {
                try {
                    console.log('---------- API YANIT DETAYI ----------');
                    console.log('Yanıt Özeti:', {
                        statusCode: response.status,
                        contentType: response.headers['content-type'],
                        dataType: typeof response.data,
                        isArray: Array.isArray(response.data),
                        responseSize: JSON.stringify(response.data).length + ' bytes'
                    });
                    
                    // API yanıtının ilk 500 karakteri
                    const jsonData = JSON.stringify(response.data, null, 2);
                    console.log('Yanıt Verisi (ilk 500 karakter):');
                    console.log(jsonData.length > 500 ? jsonData.substring(0, 500) + '...' : jsonData);
                    console.log('---------- API YANIT DETAYI SONU ----------');
                } catch (error) {
                    console.log('Yanıt detayı görüntülenirken hata oluştu:', error.message);
                }
            } else {
                console.log('SAP yanıt verisi:', response.data);
            }
            
            // Başarılı sonuç
            console.log('---------- /api/count-update başarıyla tamamlandı ----------');
            return res.json({
                success: true,
                data: response.data
            });
        } catch (sapError) {
            console.error('SAP B1 güncelleme hatası:', sapError.message);
            console.error('Yanıt durumu:', sapError.response?.status);
            console.error('Yanıt başlıkları:', JSON.stringify(sapError.response?.headers || {}));
            
            try {
                console.log('---------- HATA DETAYLARI ----------');
                // Detaylı hata bilgisi
                if (sapError.response?.data) {
                    if (typeof sapError.response.data === 'object') {
                        console.error('Hata yanıt yapısı:', JSON.stringify(sapError.response.data, null, 2));
                        
                        if (sapError.response.data.error && sapError.response.data.error.message) {
                            console.error('SAP Hata Mesajı:', sapError.response.data.error.message.value || sapError.response.data.error.message);
                            console.error('SAP Hata Kodu:', sapError.response.data.error.code);
                        }
                        
                        // Detaylı alan hataları varsa göster
                        if (sapError.response.data.error?.innererror?.errordetails) {
                            console.error('---------- ALAN HATALARI ----------');
                            sapError.response.data.error.innererror.errordetails.forEach(detail => {
                                console.error(`Alan: ${detail.target}, Mesaj: ${detail.message}`);
                            });
                        }
                    } else {
                        console.error('Hata yanıt içeriği:', sapError.response.data);
                    }
                }
                
                // Gönderim verilerinde sorun olabilecek alanları kontrol et
                console.log('Gönderim verisi kontrolü:');
                const possibleIssues = [];
                
                // Formatlanmış veri kontrolleri
                if (!formattedData.DocNum) possibleIssues.push('DocNum eksik veya geçersiz');
                if (!formattedData.U_WhsCode) possibleIssues.push('U_WhsCode eksik veya geçersiz');
                if (!formattedData.U_RefDate) possibleIssues.push('U_RefDate eksik veya geçersiz');
                if (!formattedData.U_DocDate) possibleIssues.push('U_DocDate eksik veya geçersiz');
                if (!formattedData.U_SessionID) possibleIssues.push('U_SessionID eksik veya geçersiz');
                if (!formattedData.U_GUID) possibleIssues.push('U_GUID eksik veya geçersiz');
                if (!formattedData.U_User) possibleIssues.push('U_User eksik veya geçersiz');
                if (!formattedData.U_DocStatus) possibleIssues.push('U_DocStatus eksik veya geçersiz');
                
                // Kalem koleksiyonu kontrolleri
                const hasEmptyFields = formattedData.AS_B2B_COUNT_DETAILCollection?.some(item => 
                    !item.U_ItemCode || 
                    !item.U_ItemName ||
                    item.U_Quantity === undefined);
                
                if (hasEmptyFields) possibleIssues.push('Bazı kalemlerde zorunlu alanlar eksik (U_ItemCode, U_ItemName, U_Quantity)');
                
                // Yapısal kontroller - gereken alanlar uygun formatta mı?
                if (formattedData.U_DocStatus && !['1', '2', '3', 'C', 'O'].includes(formattedData.U_DocStatus)) {
                    possibleIssues.push(`Geçersiz U_DocStatus değeri: ${formattedData.U_DocStatus}`);
                }
                
                // Field adlandırma yapısı kontrolü - SAP'a giden veride tüm alanların U_ prefix'li olması lazım
                console.log('Formatlanmış yapı analizi: Tüm alanlar U_ prefix içeriyor mu?', 
                    formattedData.AS_B2B_COUNT_DETAILCollection?.every(item => 
                        Object.keys(item).every(key => key.startsWith('U_')))
                );
                
                if (possibleIssues.length > 0) {
                    console.error('Olası veri sorunları:', possibleIssues);
                } else {
                    console.log('Veri yapısında belirgin bir sorun bulunamadı.');
                }
                console.log('---------- HATA DETAYLARI SONU ----------');
            } catch (logError) {
                console.error('Hata detayları görüntülenirken bir sorun oluştu:', logError.message);
            }
            
            // SAP hata mesajını formatla
            let errorMessage = 'Stok sayımı güncellenirken bir hata oluştu.';
            
            if (sapError.response && sapError.response.data) {
                if (sapError.response.data.error && sapError.response.data.error.message) {
                    errorMessage = sapError.response.data.error.message.value || sapError.response.data.error.message;
                } else if (typeof sapError.response.data === 'string') {
                    errorMessage = sapError.response.data.substring(0, 100);
                }
            }
            
            // Oturum hatası kontrolü
            if (sapError.response && (sapError.response.status === 401 || sapError.response.status === 403)) {
                console.log('Oturum hatası tespit edildi, client yönlendiriliyor');
                return res.status(401).json({
                    success: false,
                    error: 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.',
                    sessionExpired: true
                });
            }
            
            // Diğer SAP hataları
            console.log(`SAP hatası: ${errorMessage}`);
            console.log('---------- /api/count-update hata ile sonlandı ----------');
            return res.status(sapError.response?.status || 500).json({
                success: false,
                error: errorMessage
            });
        }
    } catch (error) {
        console.error('Count Update API genel hatası:', error.message);
        console.error(error.stack);
        console.log('---------- /api/count-update hata ile sonlandı ----------');
        res.status(500).json({
            success: false,
            error: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.'
        });
    }
});

app.use('/uploads', express.static('uploads'));

// Handle all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Port bilgisini command line arguments veya çevresel değişkenlerden al
const PORT = process.argv.includes('--port') 
    ? parseInt(process.argv[process.argv.indexOf('--port') + 1]) 
    : process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Transfer reddetme
app.post('/api/transfer/reject/:docNum', async (req, res) => {
    const { docNum } = req.params;
    const { sessionId, note, transferData } = req.body;

    console.log('----------- TRANSFER REDDETME İSTEĞİ BAŞLADI -----------');
    console.log(`Transfer No: ${docNum}`);
    console.log(`Session ID: ${sessionId}`);
    console.log(`İptal Nedeni: ${note || "Belirtilmemiş"}`);
    console.log('Transfer Verileri:', JSON.stringify(transferData, null, 2));

    try {
        const requestData = {
            U_Type: "TRANSFER",
            U_DocNum: parseInt(docNum),
            U_WhsCode: transferData.WhsCode,
            U_ItemCode: transferData.ItemCode,
            U_ItemName: transferData.ItemName,
            U_DocDate: transferData.DocDate,
            U_Quantity: parseFloat(transferData.Quantity),
            U_UomCode: transferData.UomCode,
            U_FromWhsCode: transferData.FromWhsCode,
            U_FromWhsName: transferData.FromWhsName,
            U_DocStatus: "5", // 5 = Reddedildi/İptal edildi
            U_Comments: note || "Transfer iptal edildi (Neden belirtilmedi)",
            U_SessionID: 1,
            U_GUID: generateGUID(),
            U_User: transferData.UserName
        };

        console.log('SAP B1 API İsteği Gönderiliyor:');
        console.log('Endpoint: https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_OWTR');
        console.log('Request Body:', JSON.stringify(requestData, null, 2));

        const response = await axiosInstance.post(
            "https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_OWTR",
            requestData,
            {
                headers: {
                    Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
                    "Content-Type": "application/json"
                }
            }
        );

        console.log('SAP B1 API Yanıtı:');
        console.log('HTTP Status: ' + response.status);
        console.log('Response Headers:', JSON.stringify(response.headers, null, 2));
        console.log('Response Body:', JSON.stringify(response.data, null, 2));
        console.log('----------- TRANSFER REDDETME İSTEĞİ TAMAMLANDI -----------');

        res.json({
            status: 'success',
            message: 'Transfer başarıyla reddedildi',
            data: response.data
        });
    } catch (error) {
        console.error('----------- TRANSFER REDDETME HATASI -----------');
        console.error('Hata Mesajı:', error.message);
        
        if (error.response) {
            console.error('HTTP Status: ' + error.response.status);
            console.error('Response Headers:', JSON.stringify(error.response.headers, null, 2));
            console.error('Response Body:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('İstek gönderildi fakat yanıt alınamadı', error.request);
        } else {
            console.error('İstek oluşturulurken hata', error.config);
        }
        console.error('----------- TRANSFER REDDETME HATASI SONU -----------');
        
        res.status(500).json({
            status: 'error',
            message: 'Transfer reddetme işlemi başarısız oldu',
            error: error.response?.data || error.message
        });
    }
});