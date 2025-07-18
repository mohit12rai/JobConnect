// O:\JobConnector\backend\models\Admin.js
const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  whatsappNumber: { type: String },
  email: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);