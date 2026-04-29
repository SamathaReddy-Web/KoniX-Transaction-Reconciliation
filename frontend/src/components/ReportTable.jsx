import React from 'react';

const ReportTable = ({ runId, reportData, filter, setFilter }) => {
    const handleDownload = () => {
        window.open(`http://localhost:5000/api/report/${runId}?format=csv`, '_blank');
    };

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">Reconciliation Details</h2>
                <div className="flex gap-4 items-center">
                    <button 
                        onClick={handleDownload}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-sm font-medium rounded transition-colors"
                    >
                        Download CSV
                    </button>
                    <select 
                        value={filter} 
                        onChange={(e) => setFilter(e.target.value)}
                        className="border rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All</option>
                        <option value="Matched">Matched</option>
                        <option value="Conflicting">Conflicting</option>
                        <option value="Unmatched_User">Unmatched User</option>
                        <option value="Unmatched_Exchange">Unmatched Exchange</option>
                    </select>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-gray-700 text-sm">
                            <th className="py-3 px-4 border-b">Status</th>
                            <th className="py-3 px-4 border-b">Asset</th>
                            <th className="py-3 px-4 border-b">Type</th>
                            <th className="py-3 px-4 border-b">Quantity</th>
                            <th className="py-3 px-4 border-b">Timestamp</th>
                            <th className="py-3 px-4 border-b">Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.map((row) => {
                            const tx = row.userTransaction || row.exchangeTransaction;
                            
                            let statusColor = 'text-gray-600';
                            let statusBg = 'bg-gray-100';
                            if (row.status === 'Matched') { statusColor = 'text-green-700'; statusBg = 'bg-green-100'; }
                            if (row.status === 'Conflicting') { statusColor = 'text-yellow-700'; statusBg = 'bg-yellow-100'; }
                            if (row.status === 'Unmatched_User') { statusColor = 'text-red-700'; statusBg = 'bg-red-100'; }
                            if (row.status === 'Unmatched_Exchange') { statusColor = 'text-blue-700'; statusBg = 'bg-blue-100'; }

                            return (
                                <tr key={row._id} className="border-b hover:bg-gray-50">
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor} ${statusBg}`}>
                                            {row.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">{tx?.asset || '-'}</td>
                                    <td className="py-3 px-4">{tx?.type || '-'}</td>
                                    <td className="py-3 px-4">{tx?.quantity || '-'}</td>
                                    <td className="py-3 px-4 text-sm text-gray-500">
                                        {tx?.timestamp ? new Date(tx.timestamp).toLocaleString() : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate" title={row.reason}>
                                        {row.reason}
                                    </td>
                                </tr>
                            );
                        })}
                        {reportData.length === 0 && (
                            <tr>
                                <td colSpan="6" className="py-8 text-center text-gray-500">
                                    No records found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ReportTable;
