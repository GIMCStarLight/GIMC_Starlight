import { DataSource } from 'typeorm';
import { Tag } from '../entities/tag.entity';
import * as fs from 'fs';
import * as path from 'path';

export default class SeedPugongyingTags1758610867003 {
  public async run(dataSource: DataSource): Promise<any> {
    const tagRepository = dataSource.getRepository(Tag);

    // 清空现有的蒲公英标签数据
    await tagRepository.delete({ platform: '蒲公英' });

    // 读取CSV文件
    const csvFilePath = path.join(
      process.cwd(),
      'DBcsv',
      '社媒平台标签体系 - 蒲公英.csv',
    );

    if (!fs.existsSync(csvFilePath)) {
      console.log('蒲公英CSV文件不存在，跳过种子数据导入');
      return;
    }

    const csvData: any[] = [];

    // 读取CSV数据
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    const lines = csvContent.split('\n');

    for (let i = 1; i < lines.length; i++) {
      // 跳过标题行
      const line = lines[i].trim();
      if (line) {
        const columns = line
          .split(',')
          .map((col) => col.trim().replace(/"/g, ''));
        if (columns.length >= 4 && columns[0]) {
          csvData.push({
            level_1: columns[0],
            level_2: columns[1] || '',
            level_3: columns[2] || '',
            level_4: columns[3] || '',
          });
        }
      }
    }

    console.log(`读取到 ${csvData.length} 条蒲公英标签数据`);

    // 用于存储已创建的标签，避免重复创建
    const createdTags = new Map<string, Tag>();

    // 按层级处理数据
    for (const row of csvData) {
      await this.processTagHierarchy(tagRepository, createdTags, row);
    }

    console.log('蒲公英标签数据导入完成');
  }

  private async processTagHierarchy(
    tagRepository: any,
    createdTags: Map<string, Tag>,
    row: any,
  ): Promise<void> {
    const levels = ['level_1', 'level_2', 'level_3', 'level_4'];
    let parentTag: Tag | null = null;
    let currentPath = '';

    for (let i = 0; i < levels.length; i++) {
      const levelValue = row[levels[i]];

      // 如果当前层级没有值或者值为'null'，跳出循环
      if (
        !levelValue ||
        levelValue.trim() === '' ||
        levelValue.toLowerCase() === 'null'
      ) {
        break;
      }

      // 构建当前标签的唯一路径
      currentPath = currentPath ? `${currentPath}/${levelValue}` : levelValue;

      // 检查是否已经创建过这个标签
      if (createdTags.has(currentPath)) {
        parentTag = createdTags.get(currentPath)!;
        continue;
      }

      // 检查数据库中是否已存在相同的标签
      const existingTag = await tagRepository.findOne({
        where: {
          name: levelValue,
          platform: '蒲公英',
          parentId: parentTag?.id || null,
        },
      });

      if (existingTag) {
        createdTags.set(currentPath, existingTag);
        parentTag = existingTag;
        continue;
      }

      // 创建新标签
      const newTag = tagRepository.create({
        name: levelValue,
        platform: '蒲公英',
        level: i + 1,
        parentId: parentTag?.id || null,
        sort: 0,
        isActive: true,
        code: this.generateCode(levelValue),
        description: `蒲公英平台${i + 1}级标签：${levelValue}`,
      });

      const savedTag = await tagRepository.save(newTag);
      createdTags.set(currentPath, savedTag);
      parentTag = savedTag;

      console.log(`创建标签: ${currentPath} (ID: ${savedTag.id})`);
    }
  }

  private generateCode(name: string): string {
    // 简单的代码生成逻辑，可以根据需要调整
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50);
  }
}
