const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    runId: { type: String, required: true, index: true },
    userTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'UserTransaction' },
    exchangeTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'ExchangeTransaction' },
    status: {
        type: String,
        required: true,
        enum: ['Matched', 'Conflicting', 'Unmatched_User', 'Unmatched_Exchange']
    },
    reason: { type: String }
}, { timestamps: true });

schema.index({ runId: 1, status: 1 });

module.exports = mongoose.model('Report', schema);
