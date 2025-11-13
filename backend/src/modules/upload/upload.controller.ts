import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiResponse,
} from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { UploadService } from './upload.service';
import { ValidateDataDto, ImportDataDto } from './dto/upload.dto';
import { Public } from '../../common/decorators/auth.decorator';

@ApiTags('文件上传')
@Controller('upload')
@Public()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('excel')
  @ApiOperation({ summary: '上传Excel文件' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '文件上传成功' })
  @ApiResponse({ status: 400, description: '文件格式不支持' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadExcel(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    try {
      const result = await this.uploadService.parseExcelFile(file);

      return {
        code: 200,
        message: '文件上传成功',
        data: {
          fileId: result.fileId,
          rowCount: result.rowCount,
          preview: result.preview,
        },
      };
    } catch (error) {
      throw new BadRequestException(`文件上传失败: ${error.message}`);
    }
  }

  @Post('validate')
  @ApiOperation({ summary: '验证导入数据' })
  @ApiResponse({ status: 200, description: '数据验证完成' })
  @HttpCode(HttpStatus.OK)
  async validateData(@Body() validateDataDto: ValidateDataDto) {
    try {
      const result = await this.uploadService.validateImportData(
        validateDataDto.fileId,
        validateDataDto.type,
      );

      return {
        code: 200,
        message: '数据验证完成',
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(`数据验证失败: ${error.message}`);
    }
  }

  @Post('import')
  @ApiOperation({ summary: '导入数据（同步，不推荐大批量数据）' })
  @ApiResponse({ status: 200, description: '数据导入完成' })
  @HttpCode(HttpStatus.OK)
  async importData(@Body() importDataDto: ImportDataDto) {
    try {
      const result = await this.uploadService.importData(
        importDataDto.fileId,
        importDataDto.type,
      );

      return {
        code: 200,
        message: '数据导入完成',
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(`数据导入失败: ${error.message}`);
    }
  }

  @Post('import-async')
  @ApiOperation({ summary: '异步导入数据（推荐用于大批量数据）' })
  @ApiResponse({ status: 200, description: '导入任务已启动' })
  @HttpCode(HttpStatus.OK)
  async importDataAsync(@Body() importDataDto: any) {
    try {
      const result = await this.uploadService.importDataAsync(
        importDataDto.fileId,
        importDataDto.type,
        importDataDto.fileName,
      );

      return {
        code: 200,
        message: '导入任务已启动，可在导入历史中查看进度',
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(`启动导入任务失败: ${error.message}`);
    }
  }

  @Get('import-progress/:taskId')
  @ApiOperation({ summary: '获取导入进度' })
  @ApiResponse({ status: 200, description: '进度获取成功' })
  async getImportProgress(@Param('taskId') taskId: string) {
    try {
      const result = await this.uploadService.getImportProgress(taskId);

      return {
        code: 200,
        message: '进度获取成功',
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(`获取进度失败: ${error.message}`);
    }
  }

  @Get('import-history')
  @ApiOperation({ summary: '获取导入历史列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getImportHistory(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
  ) {
    try {
      const result = await this.uploadService.getImportHistory(
        Number(page),
        Number(pageSize),
      );

      return {
        code: 200,
        message: '获取成功',
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(`获取导入历史失败: ${error.message}`);
    }
  }

  @Get('import-history/:taskId')
  @ApiOperation({ summary: '获取导入历史详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getImportHistoryDetail(@Param('taskId') taskId: string) {
    try {
      const result = await this.uploadService.getImportHistoryDetail(taskId);

      return {
        code: 200,
        message: '获取成功',
        data: result,
      };
    } catch (error) {
      throw new BadRequestException(`获取导入历史详情失败: ${error.message}`);
    }
  }
}
