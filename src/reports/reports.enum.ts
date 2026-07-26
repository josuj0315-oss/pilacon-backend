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

// 신고 대상 사용자에 대한 제재
export enum ReportActionResult {
  NONE = 'NONE',                 // 조치 없음
  USER_WARNED = 'USER_WARNED',   // 사용자 경고
  USER_SUSPENDED = 'USER_SUSPENDED', // 사용자 정지
  USER_BANNED = 'USER_BANNED',   // 사용자 영구 정지
}

// 신고 대상 게시물에 대한 처리 (사용자 제재와 독립적으로 선택)
export enum ReportPostAction {
  NONE = 'NONE',       // 그대로 두기
  HIDDEN = 'HIDDEN',   // 게시물 숨김
  DELETED = 'DELETED', // 게시물 삭제
}
