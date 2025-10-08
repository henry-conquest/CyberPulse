import { AnalystCommentsProps } from '@/models/AnalystModel';
import React, { useState } from 'react';

const AnalystComments = (props: AnalystCommentsProps) => {
  const { latest, previous } = props;

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleNote = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="space-y-6 p-4">
      {/* Latest Analyst Comment */}
      <div className="border border-brand-teal p-4 rounded-md">
        <h2 className="text-brand-teal text-sm font-semibold mb-2">Latest Analyst Comments</h2>

        <div className="min-h-[100px] text-gray-700">{latest.comment}</div>

        <div className="flex justify-between text-brand-teal text-sm mt-4">
          <span>Written By: {latest.author}</span>
          <span>Updated: {latest.date}</span>
        </div>
      </div>

      {/* Previous Analyst Comments */}
      <div className="border border-brand-teal p-4 rounded-md">
        <h2 className="text-brand-teal text-sm font-semibold mb-4">Previous Analyst Comments</h2>

        <div className="space-y-2">
          {previous.map((item, index) => (
            <div key={index} className="border border-green-200 px-4 py-2 rounded">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Update on {item.date}</span>
                <button className="text-brand-teal text-sm hover:underline" onClick={() => toggleNote(index)}>
                  {expandedIndex === index ? 'Hide note' : 'Click to see previous note'}
                </button>
              </div>

              {expandedIndex === index && <p className="mt-2 text-gray-600 text-sm">{item.note}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalystComments;
