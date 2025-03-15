# MCP Client Demo

这是一个基于 Model Context Protocol (MCP) 的客户端演示项目，用于展示如何使用 OpenAI API 与 MCP 工具进行交互。

## 项目介绍

本项目是一个简单的命令行应用，演示了如何：
- 使用 OpenAI 的 GPT-4o-mini 模型
- 处理工具调用和响应
- 连接到 MCP 服务器
- 维护完整的对话历史

## 技术栈

- **运行时**: [Bun](https://bun.sh) - 一个快速的 JavaScript 全能运行时
- **语言**: TypeScript
- **依赖**:
  - `openai`: ^4.87.3 - OpenAI API 客户端
  - `@modelcontextprotocol/sdk`: ^1.7.0 - MCP SDK

## 安装

```bash
# 安装依赖
bun install
```

## 使用方法

```bash
# 运行应用
bun run index.ts
```

## 环境变量

请确保在运行前设置以下环境变量或创建 `.env` 文件：

```
OPENAI_API_KEY=your_openai_api_key
EXA_API_KEY=your_exa_api_key
```

## 开发

本项目使用 `bun init` 在 bun v1.1.38 中创建。如需进行开发，可以修改 `index.ts` 文件中的用户提示或添加更多功能。
