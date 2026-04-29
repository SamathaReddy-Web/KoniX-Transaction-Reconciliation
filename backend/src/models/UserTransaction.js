const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    runId: { type: String, required: true, index: true },
    originalRow: { type: mongoose.Schema.Types.Mixed, required: true },
    isValid: { type: Boolean, required: true },
    errorReason: { type: String },

    transactionId: { type: String },
    timestamp: { type: Date },
    type: { type: String },
    asset: { type: String },
    quantity: { type: Number },
    price_usd: { type: Number },
    fee: { type: Number },
    note: { type: String }
}, { timestamps: true });

schema.index({ runId: 1, timestamp: 1 });

module.exports = mongoose.model('UserTransaction', schema);
