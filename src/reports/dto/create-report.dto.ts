import { ReportTargetType, ReportReasonCode } from '../reports.enum';

export class CreateReportDto {
  targetType: ReportTargetType;
  targetId: number;
  reasonCode: ReportReasonCode;
  reasonDetail?: string;
}
