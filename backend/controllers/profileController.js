const JobSeeker = require('../models/JobSeeker');
const JobProvider = require('../models/JobProvider');

// Define functions explicitly with const
const createSeekerProfile = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('File:', req.file);

    const {
      fullName,
      whatsappNumber,
      email,
      skillType,
      skills,
      experience,
      location,
      currentCTC,
      expectedCTC,
      noticePeriod,
      lastWorkingDate,
      bio,
    } = req.body;

    if (!fullName) {
      return res.status(400).json({ message: 'Full name is required' });
    }

    const existingSeeker = await JobSeeker.findOne({ $or: [{ whatsappNumber }, { email }] });
    if (existingSeeker) {
      return res.status(400).json({ message: 'User already exists. Please login.' });
    }

    let parsedSkills = skills || [];
    if (typeof skills === 'string') {
      parsedSkills = skills.split(',').map(s => s.trim()).filter(s => s);
    }

    let resumePath = '';
    if (req.file) {
      resumePath = `/uploads/${req.file.filename}`;
    }

    const seeker = new JobSeeker({
      fullName,
      whatsappNumber: whatsappNumber || '',
      email: email || '',
      skillType: skillType || 'IT',
      skills: parsedSkills,
      experience: experience ? Number(experience) : 0,
      location: location || '',
      currentCTC: currentCTC ? Number(currentCTC) : null,
      expectedCTC: expectedCTC ? Number(expectedCTC) : null,
      noticePeriod: noticePeriod || '',
      lastWorkingDate: lastWorkingDate || null,
      bio: bio || '',
      resume: resumePath,
      appliedJobs: [],
    });

    await seeker.save();
    res.status(201).json({ message: 'Profile created successfully', user: seeker });
  } catch (error) {
    console.error('Error creating seeker profile:', error);
    res.status(500).json({ message: 'Error creating profile' });
  }
};

const createProviderProfile = async (req, res) => {
  const { companyName, hrName, hrWhatsappNumber, email } = req.body;

  try {
    const existingProvider = await JobProvider.findOne({ $or: [{ hrWhatsappNumber }, { email }] });
    if (existingProvider) {
      return res.status(400).json({ message: 'Provider already exists. Please login.' });
    }

    const provider = new JobProvider({
      companyName,
      hrName,
      hrWhatsappNumber,
      email,
    });

    await provider.save();
    res.status(201).json({ message: 'Profile created successfully', user: provider });
  } catch (error) {
    console.error('Error creating provider profile:', error);
    res.status(500).json({ message: 'Error creating profile' });
  }
};

const updateSeekerProfile = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('File:', req.file);

    const {
      _id,
      fullName,
      whatsappNumber,
      email,
      skillType,
      skills,
      experience,
      location,
      currentCTC,
      expectedCTC,
      noticePeriod,
      lastWorkingDate,
      bio,
    } = req.body;

    if (!_id) {
      return res.status(400).json({ message: 'Seeker ID is required' });
    }

    let parsedSkills = skills;
    if (typeof skills === 'string') {
      parsedSkills = skills.split(',').map(s => s.trim()).filter(s => s);
    }

    let resumePath = undefined;
    if (req.file) {
      resumePath = `/uploads/${req.file.filename}`;
    }

    const updateData = {
      fullName,
      whatsappNumber,
      email,
      skillType,
      skills: parsedSkills,
      experience: experience ? Number(experience) : undefined,
      location,
      currentCTC: currentCTC ? Number(currentCTC) : undefined,
      expectedCTC: expectedCTC ? Number(expectedCTC) : undefined,
      noticePeriod,
      lastWorkingDate,
      bio,
      // resume: resumePath,
      ...(resumePath && { resume: resumePath }),
    };

    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const updatedSeeker = await JobSeeker.findByIdAndUpdate(_id, updateData, { new: true });
    if (!updatedSeeker) {
      return res.status(404).json({ message: 'Seeker not found' });
    }

    res.json({ message: 'Seeker profile updated successfully', user: updatedSeeker });
  } catch (error) {
    console.error('Error updating seeker profile:', error);
    res.status(500).json({ message: 'Error updating seeker profile' });
  }
};

const updateProviderProfile = async (req, res) => {
  const { _id, companyName, hrName, hrWhatsappNumber, email } = req.body;

  try {
    if (!_id) {
      return res.status(400).json({ message: 'Provider ID is required' });
    }

    const updateData = {
      companyName,
      hrName,
      hrWhatsappNumber,
      email,
    };

    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const provider = await JobProvider.findByIdAndUpdate(_id, updateData, { new: true });
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    res.json({ message: 'Provider profile updated successfully', user: provider });
  } catch (error) {
    console.error('Error updating provider profile:', error);
    res.status(500).json({ message: 'Error updating provider profile' });
  }
};

const getProfile = async (req, res) => {
  const { role, whatsappNumber, email } = req.query;

  try {
    let user;
    if (role === 'seeker') {
      user = await JobSeeker.findOne({ $or: [{ whatsappNumber }, { email }] });
    } else if (role === 'provider') {
      user = await JobProvider.findOne({ $or: [{ hrWhatsappNumber: whatsappNumber }, { email }] });
    } else {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// Export all functions
module.exports = {
  createSeekerProfile,
  createProviderProfile,
  updateSeekerProfile,
  updateProviderProfile,
  getProfile,
};
