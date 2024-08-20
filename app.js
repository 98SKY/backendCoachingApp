const express = require('express');
const http = require('http');
const envConfig = require('./config/env');
const Routes = require('./routes/routes');
const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); 
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

app.use(Routes);

app.use((req, res) => {
  res.status(404).json({ error: 'Entry Point Not Found' });
});

const env = process.env.NODE_ENV || 'development';
const port = envConfig[env].PORT;

http.createServer(app).listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
