const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const photoBoothSchema = new Schema({
    email: String,
    link: String
}, { timestamps: true });

photoBoothSchema.virtual('id').get(function () {
    return this._id.toHexString();
});
module.exports = mongoose.model('PhotoBooth', photoBoothSchema);