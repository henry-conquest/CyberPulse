import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Send, Edit } from 'lucide-react';

interface AnalystCommentsProps {
  comments: string;
  onEdit?: () => void;
  onSend?: () => void;
  onDownload?: () => void;
  isEditable?: boolean;
}

export default function AnalystComments({
  comments,
  onEdit,
  onSend,
  onDownload,
  isEditable = false,
}: AnalystCommentsProps) {
  if (!comments) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="p-6 text-center text-secondary-500">
            <p className="mb-4">No analyst comments have been provided yet.</p>
            {isEditable && (
              <Button onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Add Comments
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Split the comments into paragraphs
  const paragraphs = comments.split(/\n\n|\r\n\r\n/);

  // Function to identify and process bullet points
  const processBulletPoint = (text: string) => {
    // Match patterns like "• Item" or "* Item" or "- Item"
    const bulletMatch = text.match(/^\s*[•\*\-]\s+(.*)/);
    if (bulletMatch) {
      return <li key={text}>{bulletMatch[1]}</li>;
    }
    return null;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-base font-semibold mb-4">Analyst Comments</h3>
        <div className="bg-secondary-50 p-4 rounded-md text-sm text-secondary-600 border-l-4 border-primary-600">
          {paragraphs.map((paragraph, index) => {
            // Check if this paragraph contains bullet points
            if (paragraph.includes('•') || paragraph.includes('*') || paragraph.includes('-')) {
              // Split into lines to process each bullet point
              const lines = paragraph.split(/\n|\r\n/);
              const bulletItems = lines.map((line) => processBulletPoint(line)).filter(Boolean);

              if (bulletItems.length > 0) {
                return (
                  <div key={index} className="mb-3">
                    {index > 0 && lines[0].trim().match(/^[A-Za-z]/) && (
                      <p className="font-semibold mb-2">{lines[0]}</p>
                    )}
                    <ul className="list-disc pl-5 space-y-1">{bulletItems}</ul>
                  </div>
                );
              }
            }

            // Regular paragraph
            return (
              <p key={index} className="mb-3">
                {paragraph}
              </p>
            );
          })}
        </div>

        <div className="mt-4 text-right flex justify-end space-x-2">
          {onDownload && (
            <Button variant="outline" onClick={onDownload} className="inline-flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          )}

          {isEditable && onEdit && (
            <Button variant="outline" onClick={onEdit} className="inline-flex items-center">
              <Edit className="h-4 w-4 mr-2" />
              Edit Comments
            </Button>
          )}

          {onSend && (
            <Button onClick={onSend} className="inline-flex items-center">
              <Send className="h-4 w-4 mr-2" />
              Send Report
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
