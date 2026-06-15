import { HttpException, HttpStatus } from '@nestjs/common';

export class NoChangesException extends HttpException {
  constructor(message = 'No changes detected') {
    super(
      {
        success: true,
        unchanged: true,
        message,
      },
      HttpStatus.OK,
    );
  }
}
