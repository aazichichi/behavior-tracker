const fs = require('fs');
const https = require('https');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const apiRouter = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// --- database ---------------------------------------------------------------
// connects to our Atlas cluster (the one set up with seed.mongodb.js).
// the URI + db name come from .env so no passwords end up in git
const url = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'BehaviorTracker';
mongoose
  .connect(url, { dbName })
  .then(() => console.log(`MongoDB connected successfully via Mongoose (${dbName})`))
  .catch((err) => console.error('MongoDB connection error:', err));

// --- app --------------------------------------------------------------------
const app = express();

// lets the react site and the mobile app call us even though they're on a different origin
app.use(cors());
// parses JSON request bodies so controllers can just use req.body
app.use(express.json());

// every endpoint lives under /api, the actual list is in routes/index.js
app.use('/api', apiRouter);

// these HAVE to go after all the routes: 404 for unknown urls, then the error handler
app.use(notFound);
app.use(errorHandler);

// only start the server when you run this file directly (node server.js / pm2).
// if a test file require()s it we just want the app object, not a running server
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  const { SSL_KEY_PATH, SSL_CERT_PATH } = process.env;

  if (SSL_KEY_PATH && SSL_CERT_PATH) {
    // https mode, uses the let's encrypt cert certbot made on the droplet
    const credentials = {
      key: fs.readFileSync(SSL_KEY_PATH),
      cert: fs.readFileSync(SSL_CERT_PATH)
    };
    https
      .createServer(credentials, app)
      .listen(PORT, () => console.log(`Server running on https port ${PORT}`));
  } else {
    // no cert paths in .env = plain http, which is fine for testing on your own laptop
    app.listen(PORT, () => console.log(`Server running on http port ${PORT}`));
  }
}

module.exports = app;
