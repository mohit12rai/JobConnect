// backend/models/Search.js
const mongoose = require('mongoose');

const searchSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  role: { type: String, enum: ['seeker', 'provider'], required: true },
  searchCriteria: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Search', searchSchema);