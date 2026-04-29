const fs = require('fs');
const path = require('path');
const reconciliationService = require('../services/reconciliationService');
const Report = require('../models/Report');

exports.runReconciliation = async (req, res) => {
    try {
        if (!req.files || !req.files['userTransactions'] || !req.files['exchangeTransactions']) {
            return res.status(400).json({ error: 'Both userTransactions and exchangeTransactions CSV files are required.' });
        }

        const userFile = req.files['userTransactions'][0];
        const exchangeFile = req.files['exchangeTransactions'][0];

        const options = {
            timestampTolerance: req.body.timestampTolerance,
            quantityTolerance: req.body.quantityTolerance
        };

        const runId = await reconciliationService.runReconciliation(userFile.path, exchangeFile.path, options);

        try { fs.unlinkSync(userFile.path); } catch (e) { console.error('Failed to delete user file', e); }
        try { fs.unlinkSync(exchangeFile.path); } catch (e) { console.error('Failed to delete exchange file', e); }

        res.status(200).json({ runId, message: 'Reconciliation completed successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred during reconciliation.' });
    }
};

exports.getReport = async (req, res) => {
    try {
        const { runId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 1000;
        const skip = (page - 1) * limit;

        const filter = { runId };
        if (req.query.status) {
            filter.status = req.query.status;
        }

        const reports = await Report.find(filter)
            .populate('userTransaction')
            .populate('exchangeTransaction')
            .skip(skip)
            .limit(limit)
            .lean();

        if (req.query.format === 'csv') {
            let csvData = 'Status,Reason,User_TransactionID,User_Asset,User_Type,User_Quantity,User_Timestamp,Exchange_TransactionID,Exchange_Asset,Exchange_Type,Exchange_Quantity,Exchange_Timestamp\n';
            reports.forEach(r => {
                const u = r.userTransaction || {};
                const e = r.exchangeTransaction || {};
                const safeString = (str) => str ? `"${String(str).replace(/"/g, '""')}"` : '';
                
                csvData += `${r.status},${safeString(r.reason)},${safeString(u.transactionId)},${safeString(u.asset)},${safeString(u.type)},${u.quantity||''},${u.timestamp||''},${safeString(e.transactionId)},${safeString(e.asset)},${safeString(e.type)},${e.quantity||''},${e.timestamp||''}\n`;
            });
            res.setHeader('Content-Type', 'text/csv');
            res.attachment(`reconciliation_report_${runId}.csv`);
            return res.status(200).send(csvData);
        }

        const total = await Report.countDocuments(filter);

        res.status(200).json({
            data: reports,
            page,
            totalPages: Math.ceil(total / limit),
            total
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch report.' });
    }
};

exports.getSummary = async (req, res) => {
    try {
        const { runId } = req.params;
        const summary = await Report.aggregate([
            { $match: { runId } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const result = {
            Matched: 0,
            Conflicting: 0,
            Unmatched_User: 0,
            Unmatched_Exchange: 0
        };

        summary.forEach(item => {
            result[item._id] = item.count;
        });

        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch summary.' });
    }
};

exports.getUnmatched = async (req, res) => {
    try {
        const { runId } = req.params;
        const unmatched = await Report.find({ 
            runId, 
            status: { $in: ['Unmatched_User', 'Unmatched_Exchange'] } 
        })
        .populate('userTransaction')
        .populate('exchangeTransaction')
        .lean();

        res.status(200).json(unmatched);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch unmatched.' });
    }
};
