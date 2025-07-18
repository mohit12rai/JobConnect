const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(express.json());
// app.use(cors());
app.use(cors({
  origin: 'http://localhost:8081', // Allow requests from your React Native app
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // can be comment Serve uploaded files statically

// Comment out MongoDB Atlas connection for later use
mongoose.connect('mongodb+srv://info:JobConnectorDev@jobconnect.vrvfphy.mongodb.net/JobConnectQATest'
, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB Atlas connected'))
  .catch((err) => console.log('MongoDB Atlas connection error:', err));

// Root route
app.get('/', (req, res) => {
  res.send('Job Connector Backend is running');
});

// Import and mount routes
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const jobRoutes = require('./routes/jobRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/jobs', jobRoutes);
// const admin = require('firebase-admin');

//  ------for notification----
// admin.initializeApp({
//   credential: admin.credential.cert(require('./serviceAccountKey.json'))
// });


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// working code dont chnage