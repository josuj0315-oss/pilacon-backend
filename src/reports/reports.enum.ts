export enum ReportTargetType {
  JOB = 'JOB',
  USER = 'USER',
}

export enum ReportReasonCode {
  SPAM = 'SPAM',                 // 스팸/영리목적
  INAPPROPRIATE = 'INAPPROPRIATE', // 게시글 성격에 맞지 않음
  OFFENSIVE = 'OFFENSIVE',       // 욕설/비하/혐오 표현
  FALSE_INFO = 'FALSE_INFO',     // 허위 정보/사기
  DUPLICATE = 'DUPLICATE',       // 중복 게시물
  OTHER = 'OTHER',               // 기타
}

export enum ReportStatus {
  PENDING = 'PENDING',     // 접수 대기
  REVIEWING = 'REVIEWING', // 검토 중
  RESOLVED = 'RESOLVED',   // 처리 완료 (조치됨)
  DISMISSED = 'DISMISSED', // 기각 처리
}

export enum ReportActionResult {
  NONE = 'NONE',                 // 조치 없음
  POST_HIDDEN = 'POST_HIDDEN',   // 게시물 숨김
  POST_DELETED = 'POST_DELETED', // 게시물 삭제
  USER_WARNED = 'USER_WARNED',   // 사용자 경고
  USER_SUSPENDED = 'USER_SUSPENDED', // 사용자 정지
}
