
import { MonthlyReport } from '@/hooks/useMonthlyReports';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { formatGMName } from '@/utils/gmNameFormatter';

interface ReportSummaryTableProps {
  reports: MonthlyReport[];
}

const ReportSummaryTable = ({ reports }: ReportSummaryTableProps) => {
  const totals = reports.reduce(
    (acc, report) => ({
      total_hours: acc.total_hours + report.total_hours,
      gaming_hours: acc.gaming_hours + report.gaming_hours,
      formation_hours: acc.formation_hours + report.formation_hours,
      maintenance_hours: acc.maintenance_hours + report.maintenance_hours,
      admin_hours: acc.admin_hours + report.admin_hours,
      travaux_informatiques_hours: acc.travaux_informatiques_hours + report.travaux_informatiques_hours,
      menage_hours: acc.menage_hours + report.menage_hours,
    }),
    {
      total_hours: 0,
      gaming_hours: 0,
      formation_hours: 0,
      maintenance_hours: 0,
      admin_hours: 0,
      travaux_informatiques_hours: 0,
      menage_hours: 0,
    }
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Game Master</TableHead>
            <TableHead>Période</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Gaming</TableHead>
            <TableHead className="text-right">Formation</TableHead>
            <TableHead className="text-right">Maintenance</TableHead>
            <TableHead className="text-right">Admin</TableHead>
            <TableHead className="text-right">Travaux Info</TableHead>
            <TableHead className="text-right">Ménage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell className="font-medium">
                {formatGMName(report.game_masters || {})}
              </TableCell>
              <TableCell>{report.month_year}</TableCell>
              <TableCell className="text-right">{Number(report.total_hours).toFixed(2)}h</TableCell>
              <TableCell className="text-right">{Number(report.gaming_hours).toFixed(2)}h</TableCell>
              <TableCell className="text-right">{Number(report.formation_hours).toFixed(2)}h</TableCell>
              <TableCell className="text-right">{Number(report.maintenance_hours).toFixed(2)}h</TableCell>
              <TableCell className="text-right">{Number(report.admin_hours).toFixed(2)}h</TableCell>
              <TableCell className="text-right">{Number(report.travaux_informatiques_hours).toFixed(2)}h</TableCell>
              <TableCell className="text-right">{Number(report.menage_hours).toFixed(2)}h</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2} className="font-medium">
              Total général
            </TableCell>
            <TableCell className="text-right font-medium">{Number(totals.total_hours).toFixed(2)}h</TableCell>
            <TableCell className="text-right font-medium">{Number(totals.gaming_hours).toFixed(2)}h</TableCell>
            <TableCell className="text-right font-medium">{Number(totals.formation_hours).toFixed(2)}h</TableCell>
            <TableCell className="text-right font-medium">{Number(totals.maintenance_hours).toFixed(2)}h</TableCell>
            <TableCell className="text-right font-medium">{Number(totals.admin_hours).toFixed(2)}h</TableCell>
            <TableCell className="text-right font-medium">{Number(totals.travaux_informatiques_hours).toFixed(2)}h</TableCell>
            <TableCell className="text-right font-medium">{Number(totals.menage_hours).toFixed(2)}h</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
};

export default ReportSummaryTable;
