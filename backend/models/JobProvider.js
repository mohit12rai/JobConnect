// O:\JobConnector\backend\models\JobProvider.js
const mongoose = require('mongoose');

const jobProviderSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  hrName: { type: String, required: true },
  hrWhatsappNumber: { type: String },
  email: { type: String },
 jobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting' }]

}, { timestamps: true });

module.exports = mongoose.model('JobProvider', jobProviderSchema);


