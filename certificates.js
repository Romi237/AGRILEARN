const express = require('express');
const Certificate = require('../models/certificate');
const User = require('../models/User');
const Course = require('../models/Course');
const PDFDocument = require('pdfkit');

const router = express.Router();

// ✅ Issue a certificate (Teacher only)
router.post('/issue', async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Only teachers can issue certificates' });
    }

    const { studentId, courseId } = req.body;
    const cert = new Certificate({ student: studentId, course: courseId });
    await cert.save();

    res.json({ success: true, certificate: cert });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to issue certificate' });
  }
});

// ✅ Get certificates for logged-in student
router.get('/my', async (req, res) => {
  try {
    const certs = await Certificate.find({ student: req.user.id }).populate('course', 'title');
    res.json({ success: true, certificates: certs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch certificates' });
  }
});

// ✅ Download PDF certificate
router.get('/download/:certificateId', async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.certificateId)
      .populate('student', 'name email')
      .populate('course', 'title');

    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found' });

    // Authorization check
    if (cert.student._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // PDF response setup
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',` attachment; filename="${cert.course.title}-certificate.pdf"`);

    doc.fontSize(24).text('AgriLearn Certificate of Completion', { align: 'center' });
    doc.moveDown();
    doc.fontSize(18).text(`Awarded to: ${cert.student.name}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`For successfully completing the course: "${cert.course.title}"`, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(12).text(`Issued on: ${new Date(cert.issuedAt).toLocaleDateString()}`, { align: 'center' });

    doc.pipe(res);
    doc.end();
  } catch (err) {
    console.error('[CERTIFICATE DOWNLOAD ERROR]', err);
    res.status(500).json({ success: false, message: 'Failed to generate certificate' });
  }
});

module.exports = router;