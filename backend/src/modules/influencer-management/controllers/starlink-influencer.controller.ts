import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StarlinkInfluencerService } from '../services/starlink-influencer.service';

@ApiTags('星链计划达人管理')
@Controller('api/starlink-influencers')
export class StarlinkInfluencerController {
  constructor(
    private readonly starlinkService: StarlinkInfluencerService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取星链计划达人列表' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    try {
      return await this.starlinkService.findAll(+page, +limit);
    } catch (error) {
      throw new HttpException(
        error.message || '获取数据失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个星链计划达人详情' })
  async findOne(@Param('id') id: string) {
    try {
      const data = await this.starlinkService.findOne(+id);
      if (!data) {
        throw new HttpException('记录不存在', HttpStatus.NOT_FOUND);
      }
      return data;
    } catch (error) {
      throw new HttpException(
        error.message || '获取数据失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @ApiOperation({ summary: '更新星链计划达人信息' })
  async update(
    @Param('id') id: string,
    @Body() updateData: any,
  ) {
    try {
      return await this.starlinkService.update(+id, updateData);
    } catch (error) {
      throw new HttpException(
        error.message || '更新失败',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除星链计划达人' })
  async delete(@Param('id') id: string) {
    try {
      const success = await this.starlinkService.delete(+id);
      if (!success) {
        throw new HttpException('删除失败', HttpStatus.NOT_FOUND);
      }
      return { success: true, message: '删除成功' };
    } catch (error) {
      throw new HttpException(
        error.message || '删除失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
