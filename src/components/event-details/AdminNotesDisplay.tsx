import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface AdminNotesDisplayProps {
  adminNotes: string;
}

const AdminNotesDisplay = ({ adminNotes }: AdminNotesDisplayProps) => {
  if (!adminNotes?.trim()) return null;

  return (
    <Card className="border-yellow-300 bg-yellow-50 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-yellow-800 text-base">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          📋 Information importante de l'administration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-900 whitespace-pre-wrap font-medium leading-relaxed">
            {adminNotes}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminNotesDisplay;