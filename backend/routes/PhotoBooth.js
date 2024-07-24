const express = require('express');
const router = express.Router();
const PhotoBooth = require('../models/PhotoBooth');
const upload = require('../utils/multer');
const s3 = require('../utils/aws-s3');

// Upload photo screenshot
router.post('/', upload.single('file'), async (req, res) => {
    const file = req.file;

    if (!file) {
        return res.status(400).send('Please upload a file.');
    }

    const allowedTypes = /jpeg|jpg|png/;
    const extension = allowedTypes.test(file.originalname.toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype);

    if (!(extension && mimeType)) {
        return res.status(400).send('Invalid file type. Only JPEG, JPG and PNG files are allowed.');
    }

    const s3Params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `photo-booth-images/${Date.now()}`,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read' 
    };

    try {
        const data = await s3.upload(s3Params).promise();
        const newPhoto = new PhotoBooth({ link: data.Location });
        await newPhoto.save();
        res.status(200).json({ message: 'photo image uploaded successfully!', photo: data.Location });
    } catch (err) {
        console.error('Error uploading image to S3:', err);
        res.status(500).json({ message: 'Failed to upload photo.' });
    }
});


module.exports = router;
