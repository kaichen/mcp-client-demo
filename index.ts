import OpenAI from "openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const client = new OpenAI();

// 初始化 MCP 客户端
let mcpClient: Client | null = null;
let mcpTransport: StdioClientTransport | null = null;

// MCP 服务器配置
interface ServerConfig {
  command: string;
  args: string[];
}

const MCP_SERVERS: Record<string, ServerConfig> = {
  "exa": {
    "command": "npx",
    "args": ["-y", "@smithery/cli", "install", "exa", "--client", "claude"]
  }
};

// 连接到 MCP 服务器
async function connectToMcpServer(serverName: string = "exa") {
  try {
    const serverConfig = MCP_SERVERS[serverName];
    
    if (!serverConfig) {
      throw new Error(`未找到服务器配置: ${serverName}`);
    }
    
    mcpTransport = new StdioClientTransport({
      command: serverConfig.command,
      args: serverConfig.args
    });
    
    mcpClient = new Client({
      name: "openai-mcp-client",
      version: "1.0.0"
    });
    
    mcpClient.connect(mcpTransport);
    
    const toolsResult = await mcpClient.listTools();
    console.log("已连接到 MCP 服务器，可用工具:", toolsResult.tools.map(tool => tool.name));
    
    return toolsResult.tools;
  } catch (error) {
    console.error("连接 MCP 服务器失败:", error);
    throw error;
  }
}

// 调用 MCP 工具
async function callMcpTool(toolName: string, args: any) {
  if (!mcpClient) {
    throw new Error("MCP 客户端未初始化");
  }
  
  try {
    const result = await mcpClient.callTool({
      name: toolName,
      arguments: args
    });
    
    return result;
  } catch (error) {
    console.error(`调用 MCP 工具 ${toolName} 失败:`, error);
    throw error;
  }
}

// 主函数
async function main() {
  // 连接到 Exa MCP 服务器
  const mcpTools = await connectToMcpServer("exa");
  console.log("mcpTools", mcpTools);

  // 维护整个对话历史的消息数组
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "user",
      content: "帮我搜索关于量子计算最新的研究进展"
    }
  ];

  // 第一次调用 API
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages,
    tools: mcpTools.map(tool => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description || "",
        parameters: tool.inputSchema
      }
    }))
  });

  console.log("response", response.choices[0].message);
  
  // 将 AI 回复添加到消息历史中
  messages.push(response.choices[0].message);

  // 处理工具调用
  if (response.choices[0]?.message?.tool_calls) {
    const toolCalls = response.choices[0].message.tool_calls;
    
    for (const toolCall of toolCalls) {
      const args = JSON.parse(toolCall.function.arguments);
      const mcpResult = await callMcpTool(toolCall.function.name, args);
      console.log("mcpResult", mcpResult);
      
      // 将工具调用结果添加到消息历史中
      messages.push({
        tool_call_id: toolCall.id,
        role: "tool",
        content: typeof mcpResult.content === 'string' 
          ? mcpResult.content 
          : JSON.stringify(mcpResult.content)
      });
    }
    
    // 如果有工具调用，发送第二次请求获取最终回复
    if (toolCalls.length > 0) {
      const secondResponse = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages
      });
      
      // 将最终回复添加到消息历史中
      messages.push(secondResponse.choices[0].message);
      
      console.log("最终回复:", secondResponse.choices[0].message.content);
    }
  } else {
    console.log("AI回复:", response.choices[0].message.content);
  }
  
  // 关闭 MCP 客户端
  if (mcpClient) {
    await mcpClient.close();
  }
  
  // 打印完整的对话历史
  console.log("\n完整对话历史:");
  messages.forEach((msg, index) => {
    const contentPreview = msg.content 
      ? (typeof msg.content === 'string' 
          ? msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '')
          : JSON.stringify(msg.content).substring(0, 50) + '...')
      : '(无内容)';
    console.log(`[${index}] ${msg.role}: ${contentPreview}`);
  });
}

// 执行主函数
main().catch(error => {
  console.error("程序执行出错:", error);
});
