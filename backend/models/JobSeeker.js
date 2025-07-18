// O:\JobConnector\backend\models\JobSeeker.js
const mongoose = require('mongoose');

const jobSeekerSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  whatsappNumber: { type: String },
  email: { type: String },
  skillType: { type: String },
  skills: [String],
  experience: { type: Number },
  location: { type: String },
  currentCTC: { type: Number },
  expectedCTC: { type: Number },
  noticePeriod: { type: String },
  lastWorkingDate: { type: String },
  resume: { type: String },
  bio: { type: String },
  appliedJobs: [{ jobId: String, title: String, status: String }],
}, { timestamps: true });

module.exports = mongoose.model('JobSeeker', jobSeekerSchema);