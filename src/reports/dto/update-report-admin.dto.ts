import { ReportStatus, ReportActionResult, ReportPostAction } from '../reports.enum';

export class UpdateReportAdminDto {
  status: ReportStatus;
  actionResult: ReportActionResult;
  postAction?: ReportPostAction;
  adminMemo?: string;
}
