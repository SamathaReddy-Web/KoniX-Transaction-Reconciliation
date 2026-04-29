import React, { useState, useEffect } from 'react';
import UploadDashboard from './components/UploadDashboard';
import SummaryCards from './components/SummaryCards';
import ReportTable from './components/ReportTable';
import { getSummary, getReport } from './services/api';

function App() {
    const [runId, setRunId] = useState(null);
    const [summary, setSummary] = useState(null);
    const [reportData, setReportData] = useState([]);
    const [filter, setFilter] = useState('');
    const [loadingData, setLoadingData] = useState(false);

    const fetchReportData = async (id, currentFilter) => {
        setLoadingData(true);
        try {
            const [sumData, repData] = await Promise.all([
                getSummary(id),
                getReport(id, { status: currentFilter })
            ]);
            setSummary(sumData);
            setReportData(repData.data);
        } catch (error) {
            console.error("Failed to fetch report data", error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleRunComplete = (id) => {
        setRunId(id);
        setFilter('');
        fetchReportData(id, '');
    };

    useEffect(() => {
        if (runId) {
            fetchReportData(runId, filter);
        }
    }, [filter, runId]);

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">KoinX Reconciliation Engine</h1>
                        <p className="mt-1 text-sm text-gray-500">Automated transaction matching & reporting</p>
                    </div>
                </header>

                <UploadDashboard onRunComplete={handleRunComplete} />

                {runId && (
                    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-gray-800">Reconciliation Report</h2>
                            <span className="text-sm text-gray-500 bg-gray-200 px-3 py-1 rounded-full">Run ID: {runId}</span>
                        </div>
                        
                        {summary && <SummaryCards summary={summary} />}
                        
                        {loadingData ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : (
                            <ReportTable runId={runId} reportData={reportData} filter={filter} setFilter={setFilter} />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
