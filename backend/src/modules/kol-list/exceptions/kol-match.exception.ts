import { HttpException, HttpStatus } from '@nestjs/common';

export class KolMatchException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
  }
}

export class KolNotFoundException extends KolMatchException {
  constructor(kolId: number) {
    super(`私域达人不存在: ${kolId}`, HttpStatus.NOT_FOUND);
  }
}

export class MatchAlreadyExistsException extends KolMatchException {
  constructor(privateKolId: number, publicAuthorId: string) {
    super(
      `匹配已存在: 私域达人${privateKolId} -> 公海达人${publicAuthorId}`,
      HttpStatus.CONFLICT,
    );
  }
}

export class MatchNotFoundException extends KolMatchException {
  constructor(privateKolId: number, publicAuthorId: string) {
    super(
      `匹配不存在: 私域达人${privateKolId} -> 公海达人${publicAuthorId}`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class InvalidMatchStatusException extends KolMatchException {
  constructor(currentStatus: string, expectedStatus: string) {
    super(
      `匹配状态无效: 当前状态${currentStatus}，期望状态${expectedStatus}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class MatchConfidenceTooLowException extends KolMatchException {
  constructor(confidence: number, minConfidence: number) {
    super(
      `匹配置信度过低: ${confidence}，最低要求${minConfidence}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class BatchProcessingException extends KolMatchException {
  constructor(message: string, errors: Error[]) {
    super(`批量处理失败: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    this.cause = errors;
  }
}

export class PublicApiException extends KolMatchException {
  constructor(message: string, originalError?: Error) {
    super(`公海API调用失败: ${message}`, HttpStatus.SERVICE_UNAVAILABLE);
    this.cause = originalError;
  }
}
