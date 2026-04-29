import React from 'react';

const SummaryCards = ({ summary }) => {
    const cards = [
        { title: 'Matched', count: summary.Matched || 0, color: 'text-green-600', bg: 'bg-green-100' },
        { title: 'Conflicting', count: summary.Conflicting || 0, color: 'text-yellow-600', bg: 'bg-yellow-100' },
        { title: 'Unmatched (User)', count: summary.Unmatched_User || 0, color: 'text-red-600', bg: 'bg-red-100' },
        { title: 'Unmatched (Exchange)', count: summary.Unmatched_Exchange || 0, color: 'text-blue-600', bg: 'bg-blue-100' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {cards.map((card) => (
                <div key={card.title} className="bg-white rounded-lg shadow p-4 flex flex-col items-center justify-center">
                    <h3 className="text-gray-500 text-sm font-medium">{card.title}</h3>
                    <p className={`text-3xl font-bold mt-2 ${card.color}`}>
                        {card.count}
                    </p>
                </div>
            ))}
        </div>
    );
};

export default SummaryCards;
