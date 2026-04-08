import { ReportStatus, ReportActionResult } from '../reports.enum';

export class UpdateReportAdminDto {
  status: ReportStatus;
  actionResult: ReportActionResult;
  adminMemo?: string;
}
