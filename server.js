const express = require('express');
const axios = require('axios');
const https = require('https');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();

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
    const orderData = req.body;
    const sessionId = req.query.sessionId;
    const guid = generateGUID();

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
                U_SessionID: sessionId || order.U_SessionID,
                U_GUID: guid,
                U_User: order.U_User,
                U_FromWhsCode: null,
                U_FromWhsName: null,
                U_Comments: "Üretim Siparişi"
            };

            console.log("Sending data:", data);

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
// });

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
        // if (req.file) {
        //     console.log('Uploaded file:', req.file);
        //     const imagePath = '/uploads/' + req.file.filename;
        //     parsedDeliveryData.U_Image = imagePath;
        //     console.log('Image path:', imagePath);
        // }

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
                U_WhsCode: whsCode,
                U_ItemCode: item.U_ItemCode,
                U_ItemName: item.U_ItemName,
                U_Quantity: item.U_Quantity,
                U_UomCode: item.U_UomCode,
                U_CardCode: item.U_CardCode,
                U_CardName: item.U_CardName,
                U_SessionID: sessionId,
                U_GUID: guid + "_" + item.U_CardCode, // Aynı GUID'i kullan
                U_User: "Orkun",
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
    
    console.log('Using sessionId:', sessionId);

  
    try {
      const response = await axiosInstance.get(
        "https://10.21.22.11:50000/b1s/v1/SQLQueries('OWTQ_T_NEW')/List",
        {
          params: {
            value1: "'TRANSFER'",
            value2: "'1010'",
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
          U_SessionID: sessionId || item.U_SessionID,
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
        console.log("Response for item:", response.data);
        console.log("Response for item:", item.U_ItemCode, response.data);
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

    try {
        const response = await axiosInstance.post(
            "https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_OWTR",
            {
                U_Type: "TRANSFER",
                U_DocNum: parseInt(docNum),
                U_WhsCode: '1010',
                U_ItemCode: transferData.ItemCode,
                U_ItemName: transferData.ItemName,
                U_DocDate: transferData.DocDate,
                U_Quantity: parseFloat(transferData.Quantity),
                U_UomCode: transferData.UomCode,
                U_FromWhsCode: transferData.FromWhsCode,
                U_FromWhsName: transferData.FromWhsName,
                U_DocStatus: transferData.approved ? "4" : "5",
                U_Comments: note || "",
                U_SessionID: sessionId,
                U_GUID: generateGUID(),
                U_User: "Orkun"
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
    const { note } = req.body;

    if (!sessionId || !docNum) {
        return res.status(400).json({
            status: 'error',
            message: 'SessionId ve DocNum zorunludur'
        });
    }

    try {
        const response = await axiosInstance.post(
            "https://10.21.22.11:50000/b1s/v1/ASUDO_B2B_OWTR",
            {
                U_Type: "TRANSFER",
                U_DocNum: parseInt(docNum),
                U_DocStatus: "C", // C: Completed/Teslim Alındı
                U_Comments: note || "",
                U_SessionID: sessionId,
                U_GUID: generateGUID(),
                U_User: req.body.username || ""
            },
            {
                headers: {
                    Cookie: "B1SESSION=" + encodeURIComponent(sessionId),
                    "Content-Type": "application/json"
                }
            }
        );

        res.json({
            status: 'success',
            message: 'Transfer teslim alındı'
        });
    } catch (error) {
        console.error('Error delivering transfer:', error.response?.data || error.message);
        res.status(500).json({
            status: 'error',
            message: 'Transfer teslim alınırken bir hata oluştu',
            error: error.response?.data || error.message
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
                U_SessionID: sessionId || order.U_SessionID,
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

// Handle all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
