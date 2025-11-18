#!/usr/bin/env node

/**
 * 批量替换console语句为log工具
 * 用于统一日志系统迁移
 */

import fs from 'fs';
import path from 'path';

// 需要处理的文件扩展名
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue'];

// 日志映射关系
const logMappings = {
  'console.log': 'log.debug',
  'console.info': 'log.info',
  'console.warn': 'log.warn',
  'console.error': 'log.error',
  'console.debug': 'log.debug',
  'console.trace': 'log.trace'
};

// 检查文件是否应该被处理
function shouldProcessFile(filePath) {
  return extensions.some(ext => filePath.endsWith(ext));
}

// 处理单个文件
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let changed = false;

    // 检查是否已导入log工具
    const hasLogImport = content.includes('import { log } from') || 
                         content.includes('import log from') ||
                         content.includes('#/utils/logger');

    // 替换console语句
    Object.entries(logMappings).forEach(([consoleStmt, logStmt]) => {
      const regex = new RegExp(consoleStmt.replace('.', '\\.'), 'g');
      if (regex.test(content)) {
        content = content.replace(regex, logStmt);
        changed = true;
      }
    });

    // 如果文件有更改且没有导入log，则添加导入语句
    if (changed && !hasLogImport) {
      // 在第一个import语句后添加log导入
      const importMatch = content.match(/(import\s+[^;]+;)/);
      if (importMatch) {
        const firstImport = importMatch[0];
        const logImport = "import { log } from '#/utils/logger';";
        content = content.replace(firstImport, `${firstImport}\n${logImport}`);
      }
    }

    // 如果文件有更改，则写入
    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 已处理文件: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ 处理文件失败: ${filePath}`, error.message);
    return false;
  }
}

// 递归处理目录
function processDirectory(dirPath) {
  let processedCount = 0;
  
  try {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const fullPath = path.join(dirPath, item);
      
      // 获取文件状态
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // 递归处理子目录
        processedCount += processDirectory(fullPath);
      } else if (stat.isFile() && shouldProcessFile(fullPath)) {
        // 处理文件
        if (processFile(fullPath)) {
          processedCount++;
        }
      }
    });
  } catch (error) {
    console.error(`❌ 处理目录失败: ${dirPath}`, error.message);
  }
  
  return processedCount;
}

// 主函数
function main() {
  const srcDir = './src';
  
  console.log('🔍 开始批量替换console语句...');
  console.log(`📁 处理目录: ${srcDir}`);
  
  const startTime = Date.now();
  const processedCount = processDirectory(srcDir);
  const endTime = Date.now();
  
  console.log(`\n✅ 替换完成!`);
  console.log(`📊 处理文件数: ${processedCount}`);
  console.log(`⏱️  耗时: ${endTime - startTime}ms`);
  console.log('\n💡 请检查git状态确认更改是否正确');
}

// 执行主函数
main();
