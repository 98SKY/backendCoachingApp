const http = require('http');
const envConfig = require('./config/env');
const Routes = require('./routes/routes');


const app = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow requests from any origin
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); // Allow specified HTTP methods
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Allow specified headers

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
  }

  // Route requests to user routes
  if (req.url === '/create-user' && req.method === 'POST') {
      Routes.registerInstitute(req, res);
  } else if (req.url.startsWith('/get-user/') && req.method === 'GET') {
      Routes.getUserById(req, res);
  } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
  }
});


// Get port from environment variables
const env = process.env.NODE_ENV || 'development';
const port = envConfig[env].PORT;

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
