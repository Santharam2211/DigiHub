const express = require('express');
const router = express.Router();
const { createCloudinaryUpload } = require('../utils/cloudinaryUpload');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const VolunteerApplication = require('../models/VolunteerApplication');
const generateCertificate = require('../utils/certificateGenerator');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Certificate template upload — stored in Cloudinary under event_management/certificates
const upload = createCloudinaryUpload('certificates', ['jpeg', 'jpg', 'png', 'webp'], 1, 'cert-template-');

// @desc    Upload certificate template and update config
// @route   POST /api/certificates/config/:eventId
// @access  Private/Admin
router.post('/config/:eventId', protect, authorize('Admin'), upload.single('template'), async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.eventId);
        if (!event) {
            res.status(404);
            throw new Error('Event not found');
        }

        const config = JSON.parse(req.body.config);
        if (req.file) {
            config.template = req.file.path;
        } else {
            // Keep existing template if not uploading new one
            config.template = event.certificateConfig?.template;
        }

        event.certificateConfig = config;
        await event.save();

        res.json(event.certificateConfig);
    } catch (error) {
        next(error);
    }
});

// @desc    Get certificate config
// @route   GET /api/certificates/config/:eventId
// @access  Private/Admin
router.get('/config/:eventId', protect, authorize('Admin'), async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.eventId);
        if (!event) {
            res.status(404);
            throw new Error('Event not found');
        }
        res.json(event.certificateConfig || { fields: [] });
    } catch (error) {
        next(error);
    }
});

// @desc    Download certificate (Participant version)
router.get('/download/:regId', protect, async (req, res, next) => {
    try {
        const registration = await Registration.findById(req.params.regId)
            .populate('participant')
            .populate('event');

        if (!registration) {
            res.status(404);
            throw new Error('Registration not found');
        }

        // Eligibility check
        if (!registration.attendanceStatus) {
            res.status(403);
            throw new Error('Attendance required for certificate');
        }

        // Feedback check (if feedback form exists)
        if (registration.event.feedbackForm && registration.event.feedbackForm.length > 0) {
            if (!registration.feedbackSubmitted) {
                res.status(403);
                throw new Error('Feedback submission required for certificate');
            }
        }

        const event = registration.event;
        if (!event.certificateConfig || !event.certificateConfig.template) {
            res.status(404);
            throw new Error('Certificate template not configured for this event. Please contact the administrator.');
        }

        const pdfBuffer = await generateCertificate(registration, event.certificateConfig);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=certificate_${registration.registrationId}.pdf`,
            'Content-Length': pdfBuffer.byteLength
        });

        res.send(Buffer.from(pdfBuffer));
    } catch (error) {
        next(error);
    }
});

// @desc    Preview certificate
// @route   POST /api/certificates/preview/:eventId
// @access  Private/Admin
router.post('/preview/:eventId', protect, authorize('Admin'), async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.eventId);
        if (!event) {
            res.status(404);
            throw new Error('Event not found');
        }

        // Dummy registration for preview
        const dummyReg = {
            participant: {
                username: 'Murugan',
                gender: 'Male',
                yearAndDept: 'III B.E. CSE',
                section: 'A',
                registrationNumber: 'ST12345'
            },
            event: event
        };

        const config = req.body; // Expect config in body
        if (!config.template && event.certificateConfig?.template) {
            config.template = event.certificateConfig.template;
        }

        const pdfBuffer = await generateCertificate(dummyReg, config);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.byteLength
        });
        res.send(Buffer.from(pdfBuffer));
    } catch (error) {
        next(error);
    }
});

// @desc    Bulk send certificates via email
// @route   POST /api/certificates/bulk-send/:eventId
// @access  Private/Admin
router.post('/bulk-send/:eventId', protect, authorize('Admin'), async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.eventId);
        if (!event) {
            res.status(404);
            throw new Error('Event not found');
        }
        if (!event.certificateConfig || !event.certificateConfig.template) {
            res.status(400);
            throw new Error('Certificate template not configured. Please upload a template image and configure fields before sending certificates.');
        }
        if (!event.certificateConfig.fields || event.certificateConfig.fields.length === 0) {
            res.status(400);
            throw new Error('Certificate fields not configured. Please add at least one field to the certificate configuration.');
        }

        const { sendEmail } = require('../utils/emailService');
        let successCount = 0;

        const target = req.body.target || 'both'; // 'participants', 'volunteers', 'both'

        if (target === 'both' || target === 'participants') {
            const eligibleRegs = await Registration.find({
                event: req.params.eventId,
                attendanceStatus: true
            }).populate('participant');

            for (const reg of eligibleRegs) {
                // Check feedback if required
                if (event.feedbackForm && event.feedbackForm.length > 0 && !reg.feedbackSubmitted) {
                    continue;
                }

                try {
                    const pdfBuffer = await generateCertificate(reg, event.certificateConfig);

                    await sendEmail({
                        to: reg.participant.email,
                        subject: `Certificate of Participation: ${event.title}`,
                        htmlContent: `
                            <p>Hello ${reg.participant.username},</p>
                            <p>Congratulations! Your certificate for <strong>${event.title}</strong> is ready.</p>
                            <p>Please find it attached to this email.</p>
                        `,
                        attachments: [
                            {
                                content: Buffer.from(pdfBuffer).toString('base64'),
                                filename: `certificate_${reg.registrationId}.pdf`,
                                type: 'application/pdf',
                                disposition: 'attachment'
                            }
                        ]
                    });
                    successCount++;
                } catch (err) {
                    console.error(`Failed to send cert to ${reg.participant.email}:`, err);
                }
            }
        }

        if (target === 'both' || target === 'volunteers') {
            const volunteers = await VolunteerApplication.find({
                event: req.params.eventId,
                status: 'Approved' // Send to approved volunteers
            }).populate('applicant');

            for (const vol of volunteers) {
                try {
                    const mockReg = {
                        participant: vol.applicant,
                        event: event,
                        registrationId: `VOL-${vol._id.toString().slice(-6).toUpperCase()}`
                    };
                    const pdfBuffer = await generateCertificate(mockReg, event.certificateConfig);

                    await sendEmail({
                        to: vol.applicant.email,
                        subject: `Certificate of Appreciation (Volunteer): ${event.title}`,
                        htmlContent: `
                            <p>Hello ${vol.applicant.username},</p>
                            <p>Thank you for your valuable contribution as a volunteer! Your certificate for <strong>${event.title}</strong> is ready.</p>
                            <p>Please find it attached to this email.</p>
                        `,
                        attachments: [
                            {
                                content: Buffer.from(pdfBuffer).toString('base64'),
                                filename: `certificate_${mockReg.registrationId}.pdf`,
                                type: 'application/pdf',
                                disposition: 'attachment'
                            }
                        ]
                    });
                    successCount++;
                } catch (err) {
                    console.error(`Failed to send volunteer cert to ${vol.applicant.email}:`, err);
                }
            }
        }

        res.json({ message: `Certificates sent to ${successCount} people successfully.` });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
