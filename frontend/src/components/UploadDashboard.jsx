import React, { useState } from 'react';
import { Upload, Play, Loader2 } from 'lucide-react';
import { runReconciliation } from '../services/api';

const UploadDashboard = ({ onRunComplete }) => {
    const [userFile, setUserFile] = useState(null);
    const [exchangeFile, setExchangeFile] = useState(null);
    const [timestampTolerance, setTimestampTolerance] = useState(300);
    const [quantityTolerance, setQuantityTolerance] = useState(0.01);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRun = async () => {
        if (!userFile || !exchangeFile) {
            setError('Please upload both CSV files.');
            return;
        }

        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('userTransactions', userFile);
        formData.append('exchangeTransactions', exchangeFile);
        formData.append('timestampTolerance', timestampTolerance);
        formData.append('quantityTolerance', quantityTolerance);

        try {
            const data = await runReconciliation(formData);
            onRunComplete(data.runId);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to run reconciliation.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Start Reconciliation</h2>
            
            {error && <div className="mb-4 text-red-600 bg-red-50 p-3 rounded">{error}</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center relative">
                    <Upload className="w-8 h-8 text-blue-500 mb-2" />
                    <span className="text-gray-600 font-medium text-sm">Upload User Transactions CSV</span>
                    <input 
                        type="file" 
                        accept=".csv" 
                        onChange={(e) => setUserFile(e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                    {userFile && <p className="mt-2 text-sm text-green-600 truncate max-w-full px-2">{userFile.name}</p>}
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center relative">
                    <Upload className="w-8 h-8 text-blue-500 mb-2" />
                    <span className="text-gray-600 font-medium text-sm">Upload Exchange Transactions CSV</span>
                    <input 
                        type="file" 
                        accept=".csv" 
                        onChange={(e) => setExchangeFile(e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    />
                    {exchangeFile && <p className="mt-2 text-sm text-green-600 truncate max-w-full px-2">{exchangeFile.name}</p>}
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timestamp Tolerance (seconds)</label>
                    <input 
                        type="number" 
                        value={timestampTolerance}
                        onChange={(e) => setTimestampTolerance(e.target.value)}
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Tolerance (%)</label>
                    <input 
                        type="number" 
                        step="0.001"
                        value={quantityTolerance}
                        onChange={(e) => setQuantityTolerance(e.target.value)}
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="w-full md:w-auto mt-4 md:mt-0">
                    <button 
                        onClick={handleRun}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded flex items-center justify-center transition-colors disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                        {loading ? 'Reconciling...' : 'Run Reconciliation'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadDashboard;
