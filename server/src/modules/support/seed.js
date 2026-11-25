const Faq = require('./models/Faq');
const HelpBox = require('./models/HelpBox');
const Complaint = require('./models/Complaint');
const ComplaintHistory = require('./models/ComplaintHistory');

const SAMPLE_FAQ = [
  {
    title: 'How do I activate my NUST student LMS and Wi-Fi account?',
    category: 'it_lms',
    body: 'Visit the IT Directorate helpdesk in the Main Office or reset your password via the NUST portal using your institutional @students.nust.edu.pk email.',
    tags: ['lms', 'wifi', 'eduroam', 'it'],
    isSample: true,
  },
  {
    title: 'Where do NUST H-12 shuttle buses stop on campus?',
    category: 'transport',
    body: 'Shuttles loop every 15 minutes from Gate 1 & Gate 2 past SEECS, Central Library, Concordia 1, Concordia 2, and the Hostel blocks.',
    tags: ['shuttle', 'transport', 'gates'],
    isSample: true,
  },
  {
    title: 'How do I apply for hostel accommodation or mess changes?',
    category: 'hostels',
    body: 'Submit your hostel/mess form through the Deputy Director Hostels office before the 25th of each month for next-month changes.',
    tags: ['hostel', 'mess', 'freshie'],
    isSample: true,
  },
  {
    title: 'How does the Anonymous Help Box protect my identity?',
    category: 'campus_life',
    body: 'The Help Box database schema does not include user IDs, emails, or IP addresses. Only your category and question text are saved.',
    tags: ['privacy', 'help-box', 'anonymous'],
    isSample: true,
  },
];

const SAMPLE_HELPBOX = [
  {
    category: 'academics',
    question: 'Can freshies change their elective course during the first two weeks of semester?',
    status: 'answered',
    answer: 'Yes. Submit an add/drop request through your school academic coordinator within the official add/drop window.',
    answeredByRole: 'moderator',
    answeredAt: new Date(Date.now() - 2 * 86400000),
    isSample: true,
  },
];

const SAMPLE_COMPLAINTS = [
  {
    ownerId: 'demo-ahmed-khan',
    ownerName: 'Ahmed Khan',
    category: 'electrical',
    title: 'Flickering projector in SEECS Room 204',
    description: 'The ceiling projector flickers intermittently during lectures and dims every few minutes.',
    location: 'SEECS Room 204',
    status: 'in_progress',
    assignedTo: 'Campus Maintenance Team B',
    isSample: true,
  },
];

async function seed() {
  const faqCount = await Faq.countDocuments({ isSample: true });
  if (faqCount === 0) {
    await Faq.insertMany(SAMPLE_FAQ);
    console.log(`[seed:support] inserted ${SAMPLE_FAQ.length} sample FAQ articles`);
  }

  const hbCount = await HelpBox.countDocuments({ isSample: true });
  if (hbCount === 0) {
    await HelpBox.insertMany(SAMPLE_HELPBOX);
    console.log(`[seed:support] inserted ${SAMPLE_HELPBOX.length} sample help-box entries`);
  }

  const cmpCount = await Complaint.countDocuments({ isSample: true });
  if (cmpCount === 0) {
    const inserted = await Complaint.insertMany(SAMPLE_COMPLAINTS);
    await ComplaintHistory.insertMany([
      {
        complaintId: inserted[0]._id,
        fromStatus: '',
        toStatus: 'submitted',
        actorId: 'demo-ahmed-khan',
        actorName: 'Ahmed Khan',
        actorRole: 'student',
        note: 'Complaint submitted',
      },
      {
        complaintId: inserted[0]._id,
        fromStatus: 'submitted',
        toStatus: 'in_progress',
        actorId: 'sample-staff-1',
        actorName: 'Facility Moderator',
        actorRole: 'moderator',
        note: 'Assigned to electrical team',
      },
    ]);
    console.log(`[seed:support] inserted ${SAMPLE_COMPLAINTS.length} sample complaints`);
  }
}

module.exports = seed;
