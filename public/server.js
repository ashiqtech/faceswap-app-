const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files from public folder

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// DeepFaceLab API Configuration
const DFL_API_KEY = process.env.DFL_API_KEY || "dfl_demo_1234567890abcdef";
const DFL_API_URL = "https://api.deepfacelab.ai/v1/swap";

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'FaceSwap API is running' });
});

// Face swap endpoint
app.post('/api/swap', upload.fields([
  { name: 'source', maxCount: 1 },
  { name: 'target', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('Face swap request received');
    
    const { source, target } = req.files;
    
    if (!source || !target) {
      return res.status(400).json({ 
        error: true, 
        message: 'Both source and target images are required' 
      });
    }

    // Log file info
    console.log(`Source: ${source[0].originalname}, Size: ${source[0].size}`);
    console.log(`Target: ${target[0].originalname}, Size: ${target[0].size}`);

    // Prepare form data for DeepFaceLab API
    const formData = new FormData();
    formData.append('source', source[0].buffer, {
      filename: 'source.jpg',
      contentType: source[0].mimetype
    });
    formData.append('target', target[0].buffer, {
      filename: 'target.jpg',
      contentType: target[0].mimetype
    });

    // Call DeepFaceLab API
    console.log('Calling DeepFaceLab API...');
    
    const response = await axios.post(DFL_API_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${DFL_API_KEY}`,
        'Accept': 'image/jpeg'
      },
      responseType: 'arraybuffer',
      timeout: 30000 // 30 second timeout
    });

    console.log('DeepFaceLab API response received');

    // Return the swapped image
    res.set('Content-Type', 'image/jpeg');
    res.set('Content-Disposition', 'attachment; filename="faceswap-result.jpg"');
    res.send(response.data);

  } catch (error) {
    console.error('Face swap error:', error.message);
    
    // Provide more specific error messages
    let errorMessage = 'Face swap failed';
    
    if (error.code === 'ENOTFOUND') {
      errorMessage = 'API server not reachable. Please check your internet connection.';
    } else if (error.response) {
      // API returned an error
      errorMessage = `API Error: ${error.response.status} - ${error.response.statusText}`;
      console.error('API Error Response:', error.response.data);
    } else if (error.request) {
      errorMessage = 'No response received from API server';
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timeout. Please try again.';
    }

    // Fallback to simulation mode
    res.status(500).json({ 
      error: true, 
      message: errorMessage,
      simulation: true,
      fallback: 'Using simulation mode due to API error'
    });
  }
});

// Simulation endpoint (fallback)
app.post('/api/simulate-swap', upload.fields([
  { name: 'source', maxCount: 1 },
  { name: 'target', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('Simulation mode activated');
    
    const { source, target } = req.files;
    
    if (!source || !target) {
      return res.status(400).json({ 
        error: true, 
        message: 'Both images are required' 
      });
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create a simple simulation (in real app, use canvas to generate image)
    res.json({
      success: true,
      message: 'Simulation complete - Using demo mode',
      simulation: true,
      imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAQABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
    });

  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Simulation failed' 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ 
    error: true, 
    message: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FaceSwap Pro server running on port ${PORT}`);
  console.log(`API Key configured: ${DFL_API_KEY ? 'Yes' : 'No'}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
