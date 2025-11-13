import { Controller, Get } from '@nestjs/common';

@Controller('test-v2')
export class TestController {
  @Get()
  test() {
    return { message: 'Test controller is working' };
  }
}
