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
import { StarmediaInfluencerService } from '../services/starmedia-influencer.service';

@ApiTags('省广星媒独家签约达人管理')
@Controller('starmedia-influencers')
export class StarmediaInfluencerController {
  constructor(
    private readonly starmediaService: StarmediaInfluencerService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取省广星媒独家签约达人列表' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    try {
      return await this.starmediaService.findAll(+page, +limit);
    } catch (error) {
      throw new HttpException(
        error.message || '获取数据失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个省广星媒独家签约达人详情' })
  async findOne(@Param('id') id: string) {
    try {
      const data = await this.starmediaService.findOne(+id);
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
  @ApiOperation({ summary: '更新省广星媒独家签约达人信息' })
  async update(
    @Param('id') id: string,
    @Body() updateData: any,
  ) {
    try {
      return await this.starmediaService.update(+id, updateData);
    } catch (error) {
      throw new HttpException(
        error.message || '更新失败',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除省广星媒独家签约达人' })
  async delete(@Param('id') id: string) {
    try {
      const success = await this.starmediaService.delete(+id);
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
