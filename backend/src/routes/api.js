const express = require('express');
const router = express.Router();
const multer = require('multer');
const reconciliationController = require('../controllers/reconciliationController');

const upload = multer({ dest: 'uploads/' });

router.post('/reconcile', upload.fields([
    { name: 'userTransactions', maxCount: 1 },
    { name: 'exchangeTransactions', maxCount: 1 }
]), reconciliationController.runReconciliation);

router.get('/report/:runId', reconciliationController.getReport);
router.get('/report/:runId/summary', reconciliationController.getSummary);
router.get('/report/:runId/unmatched', reconciliationController.getUnmatched);

module.exports = router;
