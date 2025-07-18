const mongoose = require('mongoose');

const jobPostingSchema = new mongoose.Schema({
  jobTitle: { type: String },
  jobDescription: { type: String },
  skillType: { type: String },
  skills: [String],
  experienceRequired: { type: String },
  location: { type: String },
  maxCTC: { type: String },
  noticePeriod: { type: String },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'JobProvider' },
  applicants: [{ seekerId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobSeeker' } }],
  available: { type: Boolean, default: true },

  // ✅ Add this line:
  sourceFile: { type: String, default: null },

}, { timestamps: true });

module.exports = mongoose.model('JobPosting', jobPostingSchema);
