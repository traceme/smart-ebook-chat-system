# 电子书智能对话系统 PRD

## Context

### Overview
本项目旨在开发一个基于Web的电子书智能对话系统。该系统能够接收用户上传的多种格式电子书（PDF、EPUB、TXT等），自动将其转换为结构化的Markdown格式，并通过先进的向量化技术建立知识索引。用户可以通过Gmail风格的对话界面与书籍内容进行自然语言交互，系统支持OpenAI、Claude、Gemini等多种大语言模型，为用户提供精准、高效的内容理解和问答服务。这个工具主要面向个人读者、教育工作者、企业知识管理等场景，提供一种革新性的阅读和学习体验。

## Core Features

### 1. 多格式电子书上传与管理
- **功能**: 系统支持批量上传PDF、EPUB、TXT、DOCX等主流电子书格式，提供拖拽上传、断点续传等便捷功能
- **重要性**: 这是系统的入口功能，良好的上传体验直接影响用户的第一印象和使用意愿
- **工作原理**: 
  - 前端使用React实现分片上传，支持5MB/chunk的并发上传
  - 后端生成S3预签名URL，确保上传安全性
  - 实现SHA-256去重检查，避免重复存储
  - WebSocket实时推送上传进度

### 2. 文档格式转换（使用MarkItDown）
- **功能**: 将上传的各种格式文档自动转换为结构化的Markdown格式
- **重要性**: Markdown格式便于后续的文本处理、索引和展示，是实现智能对话的基础
- **工作原理**:
  - 集成Microsoft MarkItDown开源项目进行格式转换
  - 使用Celery实现异步任务队列，支持大文件处理
  - 保留原文档的结构信息（标题、段落、表格、图片占位等）
  - 实现3次自动重试机制，确保转换成功率≥97%

### 3. 知识向量化与索引（使用memvidg）
- **功能**: 将Markdown文本切分成语义片段，并通过向量化建立可检索的知识库
- **重要性**: 这是实现精准语义检索和高质量对话的核心技术
- **工作原理**:
  - 使用memvidg将文本切分为1-2k tokens的语义块
  - 调用text-embedding-3 API生成向量表示
  - 存储到Qdrant向量数据库，支持高效相似度搜索
  - 构建倒排索引，支持混合检索策略

### 4. 智能对话系统
- **功能**: 用户可以与上传的书籍内容进行自然语言对话，获得精准的答案和引用
- **重要性**: 这是系统的核心价值，将静态的书籍转化为可交互的知识助手
- **工作原理**:
  - 向量检索：对用户问题进行向量化，检索top-8相关片段
  - Rerank重排序：使用bge-reranker-base模型优化检索结果
  - Prompt构建：将检索结果和用户问题组合成上下文
  - LLM生成：调用选定的大模型生成答案
  - 引用定位：返回答案对应的原文页码和高亮显示

### 5. 多模型灵活切换
- **功能**: 支持在OpenAI GPT-4o、Claude 3.5、Gemini 2.5 Pro之间灵活切换
- **重要性**: 满足不同场景下对成本、速度、效果的平衡需求
- **工作原理**:
  - 实现统一的LLMProvider抽象接口
  - 支持流式响应（SSE）
  - 实时成本估算和Token计数
  - 自动降级和熔断机制

### 6. Gmail风格用户界面
- **功能**: 提供熟悉、优雅的Gmail风格界面，降低学习成本
- **重要性**: 良好的UI/UX是用户持续使用的关键
- **工作原理**:
  - 使用Material-UI v6组件库
  - 左侧文档列表，支持标签分类和搜索
  - 右侧对话区域，支持Markdown渲染
  - 响应式设计，适配移动端（≥360px）

## User Experience

### 用户画像
1. **个人阅读者**：希望快速理解和查询技术书籍、教材内容的学生和职场人士
2. **培训讲师**：需要快速备课、现场答疑的教育工作者
3. **企业知识管理员**：负责构建和维护企业内部知识库的IT人员
4. **出版社运营**：希望为读者提供增值服务的内容运营人员

### 关键用户流程
1. **注册登录**：用户通过邮箱或OAuth（Google/GitHub）注册登录
2. **上传书籍**：拖拽或选择文件批量上传，查看转换进度
3. **选择书籍**：从文档列表中选择要对话的书籍
4. **开始对话**：在对话框输入问题，选择AI模型
5. **查看答案**：获得带引用的答案，可以查看原文位置
6. **管理文档**：对文档进行分类、搜索、删除等操作

### UI/UX考虑
- **熟悉性**：采用Gmail风格，用户无需学习新界面
- **响应性**：首屏加载≤1秒，对话响应P95≤4秒
- **可访问性**：支持键盘导航，符合WCAG标准
- **实时反馈**：上传进度、转换状态、对话流式响应
- **错误处理**：友好的错误提示和恢复建议

## Technical Architecture

### 系统组件
```
┌─────────────────────────────────────────────────────┐
│                   前端层（React + Gatsby）            │
├─────────────────────────────────────────────────────┤
│  认证模块 │ 文档管理 │ 对话界面 │ 设置中心 │ 监控面板 │
└─────────────────────────────────────────────────────┘
                            │
                     REST API / WebSocket
                            │
┌─────────────────────────────────────────────────────┐
│                   API网关（FastAPI）                  │
├─────────────────────────────────────────────────────┤
│  路由管理 │ 认证中间件 │ 限流控制 │ 日志追踪 │ 监控   │
└─────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────┴────────┐                    ┌────────┴────────┐
│   业务服务层    │                    │   异步任务层     │
├────────────────┤                    ├─────────────────┤
│ 用户服务       │                    │ 转换Worker      │
│ 文档服务       │                    │ 索引Worker      │
│ 对话服务       │                    │ 通知Worker      │
│ 计费服务       │                    └─────────────────┘
└────────────────┘                              │
        │                                       │
        └───────────────┬───────────────────────┘
                        │
┌───────────────────────┴────────────────────────────┐
│                      数据层                          │
├────────────────────────────────────────────────────┤
│ PostgreSQL │ Redis │ S3/MinIO │ Qdrant │ 消息队列  │
└────────────────────────────────────────────────────┘
```

### 数据模型
```sql
-- 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    plan VARCHAR(50) DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 文档表
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    original_filename VARCHAR(500),
    file_type VARCHAR(50),
    file_size BIGINT,
    status VARCHAR(50) DEFAULT 'uploading',
    s3_url TEXT,
    markdown_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 对话表
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    document_id UUID REFERENCES documents(id),
    title VARCHAR(500),
    model_used VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 消息表
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats(id),
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]',
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 向量索引（在Qdrant中）
-- Collection: document_chunks
-- Fields: id, document_id, chunk_text, embedding, metadata
```

### APIs和集成
1. **MarkItDown API**：文档转换核心
   - 输入：多格式文档
   - 输出：结构化Markdown
   - 错误处理：重试机制

2. **memvidg集成**：向量化和检索
   - 文本切分和向量化
   - 相似度搜索
   - 上下文构建

3. **LLM APIs**：
   - OpenAI API (GPT-4o)
   - Anthropic API (Claude 3.5)
   - Google API (Gemini 2.5 Pro)

4. **第三方服务**：
   - Stripe：支付和订阅管理
   - Auth0/NextAuth：身份认证
   - Sentry：错误监控
   - Prometheus/Grafana：性能监控

### 未来增强
1. **智能功能**：
   - 多文档联合推理
   - 知识图谱构建
   - 自动摘要生成

2. **协作功能**：
   - 团队共享
   - 实时协作批注
   - 版本控制

3. **企业功能**：
   - SSO集成
   - 私有化部署
   - 审计日志

## Logical Dependency Chain

1. **环境搭建**（优先级：最高）
   - 开发环境配置
   - CI/CD流水线
   - 代码规范和文档

2. **用户系统**（依赖：环境搭建）
   - 认证和授权
   - 用户管理
   - 配额控制

3. **文档处理**（依赖：用户系统）
   - 上传功能
   - 格式转换
   - 存储管理

4. **知识索引**（依赖：文档处理）
   - 文本切分
   - 向量化
   - 检索优化

5. **对话系统**（依赖：知识索引）
   - LLM集成
   - 对话管理
   - 引用追踪

6. **UI完善**（并行开发）
   - Gmail风格实现
   - 响应式设计
   - 交互优化

7. **测试部署**（依赖：所有功能）
   - 单元测试
   - 集成测试
   - 性能测试
   - 生产部署

## Appendix

### 研究发现
1. **技术选型依据**：
   - Gatsby：优秀的性能和SEO，丰富的插件生态
   - FastAPI：高性能异步框架，自动API文档
   - Qdrant：专为向量检索优化，支持过滤和payload
   - Celery：成熟的分布式任务队列

2. **竞品分析**：
   - ChatPDF：简单易用但功能有限
   - Anthropic Claude：强大但不支持自定义文档
   - 本系统优势：多格式支持、多模型选择、企业级功能

### 技术规格
1. **性能指标**：
   - 并发用户：500+
   - 文档处理：100MB < 45秒
   - 对话延迟：P95 < 4秒
   - 可用性：99.9% SLA

2. **安全标准**：
   - OWASP Top 10合规
   - SOC 2 Type II认证（计划）
   - GDPR/CCPA合规

3. **技术栈版本**：
   - Python 3.11+
   - Node.js 18+
   - React 18
   - PostgreSQL 15
   - Redis 7
