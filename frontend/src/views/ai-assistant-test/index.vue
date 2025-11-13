<script setup lang="ts">
import { IconifyIcon as Icon } from '@vben/icons'

</script>


<template>
  <div class="first-title">
    <h1>一级标题</h1>
  </div>
  <div class="second-title">
    <h1>二级标题</h1>
  </div>
  <div class="content">
    <div class="basic-info">
      <ul>
        <li>创建应用</li>
        <li>
            <Icon icon="lucide:file-plus-2" />
            <span>创建空白应用</span>
        </li>
        <li>
            <Icon icon="lucide:file-text" />
            <span>从应用模板创建</span>
        </li>
        <li>
            <Icon icon="lucide:folder-input" />
            <span>导入DSL文件</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.first-title{
    height: 56px;
    line-height: 56px;
    border-bottom: 1px solid #e5e5e5;
    text-align: center;
}

.second-title{
    height: 80px;
    line-height: 80px;
}

.content .basic-info{
    width: 300px;
    height: 160px;
    padding: 8px;
    margin-left: 48px;
    background-color: #fff;
    border-radius: 8px;
}
.content .basic-info{
    font-size: 15px;
    color: #676f83
}
.content .basic-info ul li{
    padding: 7px 24px;
    border-radius: 8px;
    display: flex;
    align-items: center;
}
.content .basic-info ul li span{
    margin-left: 8px;
}
.content .basic-info ul li:first-child{
   padding: 8px 24px 4px;
}

.content .basic-info ul li:nth-child(2):hover,
.content .basic-info ul li:nth-child(3):hover,
.content .basic-info ul li:nth-child(4):hover {
    background-color: #f5f7fa;
    cursor: pointer;
}
</style>