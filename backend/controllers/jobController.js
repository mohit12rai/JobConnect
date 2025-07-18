const JobPosting = require('../models/JobPosting');
const JobSeeker = require('../models/JobSeeker');
const JobProvider = require('../models/JobProvider');
const nodemailer = require('nodemailer');
const xlsx = require('xlsx');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: 'krishnabmk96@gmail.com', pass: 'bucg kaci cxmu luam' },
});
//chnages
exports.postJob = async (req, res) => {
  const {
    skills, experienceRequired, location, maxCTC, noticePeriod, postedBy
  } = req.body;

  try {
    // Handle skills as either a string or an array
    let skillsArray = '';
    if(skills){
      skillsArray = skills;
      if (typeof skills === 'string') {
        skillsArray = skills.split(',').map(skill => skill.trim());
      } else if (!Array.isArray(skills)) {
        return res.status(400).json({ message: 'Skills must be a string or array' });
      }
    }

    const job = new JobPosting({
      skills: skillsArray ? skillsArray : '',
      experienceRequired: Number(experienceRequired) || 0,
      location,
      maxCTC: Number(maxCTC) || 0,
      noticePeriod,
      // postedBy,  // old one
      postedBy : postedBy._id, //***new one by rajvardhan */
    });
    await job.save();
    res.json({ message: 'Job posted successfully', job });
  } catch (error) {
    console.error('Error posting job:', error);
    res.status(500).json({ message: 'Error posting job' });
  }
};

exports.searchJobs = async (req, res) => {
  const { skills, experience, location, minCTC, maxCTC, noticePeriod, filters, postedBy } = req.query;

  try {
    const query = {};
    
    // Only show active jobs unless filtered by postedBy (for providers)
    if (!postedBy) {
      query.available = true; // Filter for active jobs only for seekers
    }

    if (skills) query.skills = { $in: skills.split(',') };
    if (experience) query.experienceRequired = { $lte: Number(experience) };
    if (location) query.location = new RegExp(location, 'i');
    if (minCTC) query.maxCTC = { $gte: Number(minCTC) };
    if (maxCTC) query.maxCTC = { $lte: Number(maxCTC) };
    if (noticePeriod) query.noticePeriod = new RegExp(noticePeriod, 'i');
    if (filters) {
      const filterArr = filters.split(',');
      if (filterArr.includes('viewed')) query.viewed = true;
      if (filterArr.includes('new')) query.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }
    if (postedBy) query.postedBy = postedBy; // Allow providers to see all their jobs

    const jobs = await JobPosting.find(query)
      .populate('postedBy', 'companyName hrName hrWhatsappNumber')
      .sort({ createdAt: -1 }); // Newest jobs first

    res.json(jobs);
  } catch (error) {
    console.error('Error searching jobs:', error);
    res.status(500).json({ message: 'Error searching jobs', error: error.message });
  }
};

// exports.applyToJob = async (req, res) => {
//   const { seekerId, jobId ,title, status} = req.body;
//   try {
//     const job = await JobPosting.findById(jobId);
//     if (!job) return res.status(404).json({ message: 'Job not found' });

//     const seeker = await JobSeeker.findById(seekerId);
//     if (!seeker) return res.status(404).json({ message: 'Seeker not found' });

//     job.applicants = job.applicants || [];
//     if (!job.applicants.some(app => app.seekerId.toString() === seekerId)) {
//       job.applicants.push({ seekerId });
//       await job.save();
//     }

//     seeker.appliedJobs = seeker.appliedJobs || [];
//     if (!seeker.appliedJobs.some(app => app.jobId.toString() === jobId)) {
//       seeker.appliedJobs.push({ jobId, title: job.jobTitle, status: 'Applied' });
//       await seeker.save();
//     }

//     res.json({ message: 'Applied successfully' });
//   } catch (error) {
//     console.error('Error applying to job:', error);
//     res.status(500).json({ message: 'Error applying to job' });
//   }
// };

exports.applyToJob = async (req, res) => {
  const { seekerId, jobId, title, status } = req.body; // status comes from frontend: 'Applied' or 'Connected'

  try {
    // 1️⃣ Find Job
    const job = await JobPosting.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // 2️⃣ Find Seeker
    const seeker = await JobSeeker.findById(seekerId);
    if (!seeker) return res.status(404).json({ message: 'Seeker not found' });

    // 3️⃣ Ensure job.applicants is an array
    job.applicants = job.applicants || [];

    // 4️⃣ Add seeker to job.applicants if not present
    if (!job.applicants.some(app => app.seekerId.toString() === seekerId)) {
      job.applicants.push({ seekerId });
      await job.save();
    }

    // 5️⃣ Ensure seeker.appliedJobs is an array
    seeker.appliedJobs = seeker.appliedJobs || [];

    // 6️⃣ Check if seeker has already applied to this job
    const existing = seeker.appliedJobs.find(app => app.jobId.toString() === jobId);

    if (!existing) {
      // If not applied before — push new with provided status
      seeker.appliedJobs.push({
        jobId,
        title: title || job.jobTitle,  // fallback to job's title if not passed
        status: status || 'Applied'    // frontend must send correct status
      });
    } else {
      // If already applied — update status if changed
      if (status && existing.status !== status) {
        existing.status = status;
      }
    }

    await seeker.save();

    res.json({ message: 'Application recorded', seeker });
  } catch (error) {
    console.error('Error applying to job:', error);
    res.status(500).json({ message: 'Error applying to job' });
  }
};


// POST /api/applyJob
// exports.Appyjobwhatsapp= async (req, res) => {
//   const { seekerId, jobId, title, status } = req.body;

//   try {
//     const seeker = await JobSeeker.findById(seekerId);
//     if (!seeker) return res.status(404).json({ msg: "Seeker not found" });
//      console.log("seekr",seeker)
//     // check duplicate
//     const already = seeker.jobApplied.find(j => j.jobId.toString() === jobId);
//     if (!already) {
//       seeker.jobApplied.push({ jobId, title, status });
//       await seeker.save();
//     }

//     res.json({ msg: "Job application recorded", seeker });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ msg: "Server error" });
//   }
// };


exports.toggleJobAvailability = async (req, res) => {
  try {
    const { jobId } = req.params; // Use params instead of query
    // console.log("Job ID for changing activeness:", jobId);

    // Find the job by ID
    const job = await JobPosting.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    // Toggle job availability
    job.available = !job.available;
    const updatedJob = await job.save();

    res.json({ success: true, message: "Job availability toggled", job: updatedJob });
  } catch (error) {
    // console.error("Error toggling job availability:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

//jobController.js
exports.getApplicants = async (req, res) => {
  const { providerId, jobId } = req.params.providerId ? req.params : req.query;
  try {
    const query = jobId ? { _id: jobId } : { postedBy: providerId };
    const jobs = await JobPosting.find(query).populate('applicants.seekerId', 'fullName email whatsappNumber skills experience location resume');
    const applicants = jobs.flatMap(job => 
      job.applicants.map(seeker => ({
        _id: seeker._id,
        jobId: job._id,
        jobTitle: job.jobTitle,
        seeker: seeker.seekerId,
      }))
    );
    res.json(applicants);
  } catch (error) {
    console.error('Error fetching applicants:', error);
    res.status(500).json({ message: 'Error fetching applicants' });
  }
};

exports.getAppliedJobsBySeeker = async (req, res) => {
  const { seekerId } = req.query; // Use req.query instead of req.params

  if (!seekerId) {
    return res.status(400).json({ success: false, message: 'Seeker ID is required' });
  }

  try {
    const seeker = await JobSeeker.findById(seekerId);
    if (!seeker) {
      return res.status(404).json({ success: false, message: 'Seeker not found' });
    }

    const appliedJobs = await JobPosting.find({ 'applicants.seekerId': seekerId })
      .populate('postedBy', 'companyName hrName hrWhatsappNumber')
      .select('skills  location maxCTC noticePeriod postedBy');

    res.status(200).json({
      success: true,
      message: 'Applied jobs fetched successfully',
      data: appliedJobs,
    });
  } catch (error) {
    console.error('Error fetching applied jobs:', error);
    res.status(500).json({ success: false, message: 'Error fetching applied jobs' });
  }
};

exports.saveSearch = async (req, res) => {
  res.json({ message: 'Search saved (placeholder)' });
};

exports.sendWhatsAppMessage = async (req, res) => {
  res.json({ message: 'WhatsApp message sent (placeholder)' });
};

exports.getTrendingSkills = async (req, res) => {               
  try {
    const response = await JobPosting.find({ available: true }).populate('postedBy', 'companyName hrName hrWhatsappNumber')
    const trendingJobs = response.slice(0, 5);
    return res.status(200).send({
      success:true,
      data:trendingJobs
    })
  } catch (error) {
    console.error('Error fetching trending skills:', error);
    res.status(500).json({ message: 'Error fetching trending skills' });
  }
};

exports.sendMassEmail = async (req, res) => {
  const { seekerIds, subject, body } = req.body;

  try {
    const seekers = await JobSeeker.find({ _id: { $in: seekerIds } });
    const emailPromises = seekers.map(seeker => {
      if (seeker.email) {
        return transporter.sendMail({
          from: 'krishnabmk96@gmail.com',
          to: seeker.email,
          subject,
          text: body,
        });
      }
      return Promise.resolve();
    });

    await Promise.all(emailPromises);
    res.json({ message: 'Mass emails sent successfully' });
  } catch (error) {
    console.error('Error sending mass email:', error);
    res.status(500).json({ message: 'Error sending mass email' });
  }
};

exports.searchSeekers = async (req, res) => {
  const { skills, location } = req.query;

  try {
    const query = {};
    if (skills) {
      const skillsArray = typeof skills === 'string' ? skills.split(',').map(s => s.trim()) : skills;
      query.skills = { $in: skillsArray };
    }
    if (location) {
      query.location = new RegExp(location, 'i'); // Case-insensitive partial match
    }

    const seekers = await JobSeeker.find(query);
    res.json(seekers);
  } catch (error) {
    console.error('Error searching seekers:', error);
    res.status(500).json({ message: 'Error searching seekers' });
  }
};


exports.uploadExcel = async (req, res) => {
  try {
    const file = req.file;
    const { type } = req.body;
    const path = require('path');
    const fileName = path.basename(file.originalname);

    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const sheetHeaders = xlsx.utils.sheet_to_json(sheet, { header: 1 })[0] || [];

    const expectedHeaders = {
      seekers: ['fullName', 'whatsappNumber', 'email', 'skills', 'experience', 'location'],
      jobs: ['jobTitle', 'skillType', 'skills', 'experienceRequired', 'location', 'maxCTC', 'noticePeriod', 'hrWhatsappNumber', 'email', 'companyName', 'hrName'],
      jobproviders: ['companyName', 'hrName', 'hrWhatsappNumber', 'email']
    };

    const requiredFields = expectedHeaders[type];
    if (!requiredFields) {
      return res.status(400).json({ message: 'Invalid type specified' });
    }

    const normalize = arr => arr.map(s => s.trim().toLowerCase());
    const actualHeaders = normalize(sheetHeaders);
    const missingFields = requiredFields.filter(field => !actualHeaders.includes(field.toLowerCase()));

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Invalid file format for '${type}'. Missing required fields.`,
        expected: requiredFields,
        found: sheetHeaders,
        missing: missingFields
      });
    }

    const data = xlsx.utils.sheet_to_json(sheet, {
      defval: '',
      raw: false,
      header: 0
    });

    if (type === 'seekers') {
      const seekers = [];
      let skippedCount = 0;

      for (const row of data) {
        const whatsapp = row.whatsappNumber?.toString().trim();
        const email = row.email?.toString().trim();

        const exists = await JobSeeker.findOne({
          $or: [
            whatsapp ? { whatsappNumber: whatsapp } : null,
            email ? { email } : null
          ].filter(Boolean)
        });

        if (exists) {
          skippedCount++;
          continue;
        }

        seekers.push({
          fullName: row.fullName || 'Unnamed Seeker',
          whatsappNumber: whatsapp || '',
          email: email || '',
          skillType: row.skillType,
          skills: row.skills ? row.skills.split(',').map(s => s.trim()) : [],
          experience: row.experience ? Number(row.experience) : 0,
          location: row.location,
          currentCTC: row.currentCTC ? Number(row.currentCTC) : null,
          expectedCTC: row.expectedCTC ? Number(row.expectedCTC) : null,
          noticePeriod: row.noticePeriod,
          lastWorkingDate: row.lastWorkingDate ? new Date(row.lastWorkingDate) : null,
          resume: row.resume,
          bio: row.bio,
          uploadedAt: new Date()
        });
      }

      if (seekers.length === 0) {
        return res.status(409).json({
          message: 'No new seekers uploaded. All records already exist.',
          uploadedCount: 0,
          skippedCount,
          total: data.length
        });
      }

      const result = await JobSeeker.insertMany(seekers, { ordered: false });
      return res.json({
        message: `${result.length} seeker(s) uploaded successfully. ${skippedCount} duplicate(s) skipped.`,
        uploadedCount: result.length,
        skippedCount,
        total: data.length
      });

    } else if (type === 'jobs') {
      const jobs = await Promise.all(
        data.map(async (row, index) => {
          const whatsapp = row.hrWhatsappNumber?.toString().trim();
          const email = row.email?.toString().trim();
          const companyName = row.companyName?.toString().trim() || 'Unnamed Company';
          const hrName = row.hrName?.toString().trim() || 'Unnamed HR';

          let provider = null;

          if (whatsapp || email) {
            provider = await JobProvider.findOne({
              $or: [
                whatsapp ? { hrWhatsappNumber: whatsapp } : null,
                email ? { email } : null
              ].filter(Boolean)
            });
          }

          if (!provider) {
            try {
              provider = new JobProvider({
                companyName,
                hrName,
                hrWhatsappNumber: whatsapp || '',
                email: email || '',
              });
              provider = await provider.save();
              console.log(`✅ Created new provider: ${provider.companyName} - ${provider._id}`);
            } catch (err) {
              console.warn(`❌ Failed to create provider on row ${index + 2}:`, err.message);
              return null;
            }
          }

          return {
            jobTitle: row.jobTitle || 'Unnamed Job',
            skillType: row.skillType || 'Unknown',
            skills: row.skills ? row.skills.split(',').map(s => s.trim()) : [],
            experienceRequired: row.experienceRequired?.toString() || '',
            location: row.location,
            maxCTC: row.maxCTC ? Number(row.maxCTC) : null,
            noticePeriod: row.noticePeriod,
            postedBy: provider._id,
            sourceFile: fileName
          };
        })
      );

      const cleanJobs = jobs.filter(Boolean);
      const insertedJobs = await JobPosting.insertMany(cleanJobs, { ordered: false });

      for (const job of insertedJobs) {
        await JobProvider.findByIdAndUpdate(
          job.postedBy,
          { $addToSet: { jobs: job._id } },
          { new: true }
        );
      }

      return res.json({
        message: `Jobs uploaded successfully (${fileName})`,
        jobsCount: insertedJobs.length
      });

    } else if (type === 'jobproviders') {
      const rawProviders = data.map(row => ({
        companyName: row.companyName || 'Unnamed Company',
        hrName: row.hrName || 'Unknown HR',
        hrWhatsappNumber: row.hrWhatsappNumber || '',
        email: row.email || '',
      }));

      const existingProviders = await JobProvider.find({
        $or: [
          { hrWhatsappNumber: { $in: rawProviders.map(p => p.hrWhatsappNumber) } },
          { email: { $in: rawProviders.map(p => p.email) } }
        ]
      });

      const existingNumbers = new Set(existingProviders.map(p => p.hrWhatsappNumber));
      const existingEmails = new Set(existingProviders.map(p => p.email));

      const newProviders = rawProviders.filter(p =>
        !(existingNumbers.has(p.hrWhatsappNumber) || existingEmails.has(p.email))
      );

      if (newProviders.length === 0) {
        return res.status(409).json({
          message: 'No new providers uploaded. All records already exist.',
          uploadedCount: 0,
          skippedCount: rawProviders.length,
          total: rawProviders.length
        });
      }

      const result = await JobProvider.insertMany(newProviders, { ordered: false });
      return res.json({
        message: `Job Providers uploaded successfully (${fileName})`,
        uploadedCount: result.length,
        skippedCount: rawProviders.length - result.length
      });
    }
  } catch (error) {
    console.error('❌ Error uploading Excel:', error);
    res.status(500).json({ message: 'Error uploading Excel', error: error.message });
  }
};


exports.deleteSeeker = async (req, res) => {
  const { seekerId } = req.body;
  try {
    await JobSeeker.findByIdAndDelete(seekerId);
    res.json({ message: 'Seeker deleted successfully' });
  } catch (error) {
    console.error('Error deleting seeker:', error);
    res.status(500).json({ message: 'Error deleting seeker' });
  }
};

exports.deleteJob = async (req, res) => {
  const { jobId } = req.body;
  try {
    await JobPosting.findByIdAndDelete(jobId);
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ message: 'Error deleting job' });
  }
};

exports.updateJob = async (req, res) => {
  const { _id, jobTitle, skills, skillType, experienceRequired, location, maxCTC, noticePeriod, postedBy } = req.body;

  try {
    const job = await JobPosting.findById(_id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (jobTitle !== undefined) job.jobTitle = jobTitle;
    if (skills !== undefined) job.skills = skills;
    if (skillType !== undefined) job.skillType = skillType;
    if (experienceRequired !== undefined) job.experienceRequired = Number(experienceRequired);
    if (location !== undefined) job.location = location;
    if (maxCTC !== undefined) job.maxCTC = Number(maxCTC);
    if (noticePeriod !== undefined) job.noticePeriod = noticePeriod;
    if (postedBy !== undefined) job.postedBy = postedBy;

    await job.save();
    res.json({ message: 'Job updated successfully', job });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ message: 'Error updating job' });
  }
};

// Note: updateSeekerProfile seems out of place here; it should likely be in profileController.js
exports.updateSeekerProfile = async (req, res) => {
  const { _id, fullName, whatsappNumber, email } = req.body;

  try {
    const seeker = await JobSeeker.findById(_id);
    if (!seeker) {
      return res.status(404).json({ message: 'Seeker not found' });
    }

    if (fullName !== undefined) seeker.fullName = fullName;
    if (whatsappNumber !== undefined) seeker.whatsappNumber = whatsappNumber;
    if (email !== undefined) seeker.email = email;

    await seeker.save();
    res.json({ message: 'Seeker updated successfully', seeker });
  } catch (error) {
    console.error('Error updating seeker:', error);
    res.status(500).json({ message: 'Error updating seeker', error: error.message });
  }
};

// working all things after job post

