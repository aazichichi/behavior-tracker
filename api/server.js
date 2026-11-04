const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

const sessionRoutes = require('./routes/sessionRoutes');

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Allows the server to parse incoming JSON payloads

// Database Hook using the teammate's configuration variable name
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/behavior-tracker')
  .then(() => console.log('Connected to application database successfully.'))
  .catch(err => console.error('Database configuration error:', err));

// Route Middleware Registration
app.use('/api/sessions', sessionRoutes);

// Base Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API layer parsing active on port ${PORT}`));
