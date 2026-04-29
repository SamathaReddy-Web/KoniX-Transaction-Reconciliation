const { v4: uuidv4 } = require('uuid');
const UserTransaction = require('../models/UserTransaction');
const ExchangeTransaction = require('../models/ExchangeTransaction');
const Report = require('../models/Report');
const { parseCSV } = require('../utils/csvParser');

const ASSET_ALIASES = {
    'bitcoin': 'btc',
    'ethereum': 'eth',
};

const TYPE_MAPPING = {
    'TRANSFER_IN': ['TRANSFER_OUT', 'WITHDRAWAL'],
    'TRANSFER_OUT': ['TRANSFER_IN', 'DEPOSIT'],
    'DEPOSIT': ['TRANSFER_OUT', 'WITHDRAWAL', 'TRANSFER_IN'],
    'WITHDRAWAL': ['TRANSFER_IN', 'DEPOSIT', 'TRANSFER_OUT'],
    'BUY': ['BUY'],
    'SELL': ['SELL']
};

const normalizeAsset = (asset) => {
    if (!asset) return '';
    const lower = asset.toLowerCase().trim();
    return ASSET_ALIASES[lower] || lower;
};

const validateAndParseRow = (row) => {
    const parsed = {
        isValid: true,
        errorReason: null,
        transactionId: row.transaction || row.transactionId,
        timestamp: new Date(row.timestamp),
        type: row.type ? row.type.toUpperCase().trim() : null,
        asset: normalizeAsset(row.asset),
        quantity: parseFloat(row.quantity),
        price_usd: row.price_usd ? parseFloat(row.price_usd) : null,
        fee: row.fee ? parseFloat(row.fee) : null,
        note: row.note
    };

    if (isNaN(parsed.timestamp.getTime())) {
        parsed.isValid = false;
        parsed.errorReason = 'Invalid timestamp';
        parsed.timestamp = null;
    } 
    
    if (isNaN(parsed.quantity)) {
        parsed.isValid = false;
        parsed.errorReason = parsed.errorReason || 'Invalid quantity';
        parsed.quantity = null;
    } 
    
    if (!parsed.type) {
        parsed.isValid = false;
        parsed.errorReason = parsed.errorReason || 'Missing type';
    } 
    
    if (!parsed.asset) {
        parsed.isValid = false;
        parsed.errorReason = parsed.errorReason || 'Missing asset';
    }

    if (isNaN(parsed.price_usd)) parsed.price_usd = null;
    if (isNaN(parsed.fee)) parsed.fee = null;

    return parsed;
};

const isTypeEquivalent = (type1, type2) => {
    if (type1 === type2) return true;
    const mappedTypes = TYPE_MAPPING[type1] || [];
    return mappedTypes.includes(type2);
};

const runReconciliation = async (userFilePath, exchangeFilePath, options) => {
    const runId = uuidv4();
    
    const userRows = await parseCSV(userFilePath);
    const exchangeRows = await parseCSV(exchangeFilePath);

    const userDocs = userRows.map(row => {
        const parsed = validateAndParseRow(row);
        return { runId, originalRow: row, ...parsed };
    });

    const exchangeDocs = exchangeRows.map(row => {
        const parsed = validateAndParseRow(row);
        return { runId, originalRow: row, ...parsed };
    });

    await UserTransaction.insertMany(userDocs);
    await ExchangeTransaction.insertMany(exchangeDocs);

    const validUserTx = await UserTransaction.find({ runId, isValid: true }).lean();
    const validExchangeTx = await ExchangeTransaction.find({ runId, isValid: true }).lean();

    const timestampTolerance = options.timestampTolerance !== undefined ? parseFloat(options.timestampTolerance) : (parseFloat(process.env.TIMESTAMP_TOLERANCE_SECONDS) || 300);
    const quantityTolerancePct = options.quantityTolerance !== undefined ? parseFloat(options.quantityTolerance) : (parseFloat(process.env.QUANTITY_TOLERANCE_PCT) || 0.01);

    let unmatchedExchange = [...validExchangeTx];
    const reports = [];

    for (const uTx of validUserTx) {
        let bestMatch = null;
        let bestMatchIndex = -1;
        let minTimeDiff = Infinity;
        let isConflicting = false;
        let conflictReason = '';

        for (let i = 0; i < unmatchedExchange.length; i++) {
            const eTx = unmatchedExchange[i];

            if (uTx.asset !== eTx.asset) continue;

            if (!isTypeEquivalent(uTx.type, eTx.type)) continue;

            const timeDiff = Math.abs((uTx.timestamp - eTx.timestamp) / 1000);
            const qtyDiff = Math.abs(Math.abs(uTx.quantity) - Math.abs(eTx.quantity));
            const qtyToleranceAmt = Math.abs(uTx.quantity * (quantityTolerancePct / 100));

            const timeMatch = timeDiff <= timestampTolerance;
            const qtyMatch = qtyDiff <= qtyToleranceAmt;

            if (timeMatch && qtyMatch) {
                if (timeDiff < minTimeDiff) {
                    minTimeDiff = timeDiff;
                    bestMatch = eTx;
                    bestMatchIndex = i;
                    isConflicting = false;
                }
            } else if (!bestMatch && (timeMatch || qtyMatch)) {
                if (timeDiff < minTimeDiff) { 
                    minTimeDiff = timeDiff;
                    bestMatch = eTx;
                    bestMatchIndex = i;
                    isConflicting = true;
                    if (!timeMatch && !qtyMatch) {
                         conflictReason = `Timestamp diff (${timeDiff}s) and Quantity diff exceed tolerance`;
                    } else if (!timeMatch) {
                         conflictReason = `Timestamp difference (${timeDiff}s) exceeds tolerance`;
                    } else {
                         conflictReason = `Quantity difference exceeds tolerance`;
                    }
                }
            }
        }

        if (bestMatch && !isConflicting) {
            reports.push({
                runId,
                userTransaction: uTx._id,
                exchangeTransaction: bestMatch._id,
                status: 'Matched',
                reason: 'All criteria within tolerances'
            });
            unmatchedExchange.splice(bestMatchIndex, 1);
        } else if (bestMatch && isConflicting) {
            reports.push({
                runId,
                userTransaction: uTx._id,
                exchangeTransaction: bestMatch._id,
                status: 'Conflicting',
                reason: conflictReason
            });
            unmatchedExchange.splice(bestMatchIndex, 1);
        } else {
            reports.push({
                runId,
                userTransaction: uTx._id,
                status: 'Unmatched_User',
                reason: 'No corresponding exchange transaction found'
            });
        }
    }

    for (const eTx of unmatchedExchange) {
        reports.push({
            runId,
            exchangeTransaction: eTx._id,
            status: 'Unmatched_Exchange',
            reason: 'No corresponding user transaction found'
        });
    }
    
    const invalidUserTx = await UserTransaction.find({ runId, isValid: false }).lean();
    for (const iTx of invalidUserTx) {
        reports.push({
            runId,
            userTransaction: iTx._id,
            status: 'Unmatched_User',
            reason: `Invalid Data: ${iTx.errorReason}`
        });
    }
    
    const invalidExchangeTx = await ExchangeTransaction.find({ runId, isValid: false }).lean();
    for (const iTx of invalidExchangeTx) {
        reports.push({
            runId,
            exchangeTransaction: iTx._id,
            status: 'Unmatched_Exchange',
            reason: `Invalid Data: ${iTx.errorReason}`
        });
    }

    await Report.insertMany(reports);

    return runId;
};

module.exports = { runReconciliation };
