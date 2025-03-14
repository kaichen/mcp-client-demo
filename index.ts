import OpenAI from "openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";

const openai = new OpenAI();

// 创建 MCP client
const mcpClient = new Client({ 
  name: "mcp-client-demo", 
  version: "1.0.0" 
});

// 定义 MCP 工具类型
interface McpTool {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

// 连接到 MCP server，使用 npx 运行 exa-mcp-server
async function connectToMcpServer(): Promise<McpTool[]> {
  try {
    // 从环境变量获取 EXA_API_KEY
    const exaApiKey = process.env.EXA_API_KEY;
    if (!exaApiKey) {
      throw new Error("EXA_API_KEY 环境变量未设置");
    }
    
    const transport = new StdioClientTransport({
      command: "npx",
      args: ["-y", "exa-mcp-server"]
    });
    
    await mcpClient.connect(transport);
    
    const toolsResult = await mcpClient.listTools();
    console.log(
      "Connected to MCP server with tools:",
      toolsResult.tools.map(({ name }) => name)
    );
    
    return toolsResult.tools as McpTool[];
  } catch (e) {
    console.log("Failed to connect to MCP server: ", e);
    throw e;
  }
}

async function main() {
  let useMcp = false;
  let mcpTools: McpTool[] = [];
  
  try {
    mcpTools = await connectToMcpServer();
    useMcp = true;
    console.log("成功连接到 Exa MCP 服务器");
  } catch (error) {
    console.log("无法连接到 MCP 服务器，将退出程序");
    process.exit(1);
  }

  // 准备 OpenAI 工具列表
  const openaiTools: ChatCompletionTool[] = mcpTools.map(tool => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description || `MCP tool: ${tool.name}`,
      parameters: tool.inputSchema || {
        type: "object",
        properties: {},
        required: []
      }
    }
  }));

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "user",
      content: "how about the capital of china?"
    }
  ];

  // 创建 OpenAI 请求
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    tools: openaiTools,
    tool_choice: "auto"
  });

  messages.push(response.choices[0].message);

  // 处理工具调用
  if (response.choices[0].message.tool_calls) {
    const toolCall = response.choices[0].message.tool_calls[0];
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);
    console.log("toolCall", toolCall, functionName, functionArgs);

    // 使用 MCP client 调用工具
    const mcpResult = await mcpClient.callTool({
      name: functionName,
      arguments: functionArgs
    });
    
    const toolResult = typeof mcpResult.content === 'string' 
      ? JSON.parse(mcpResult.content) 
      : mcpResult.content;

    messages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: JSON.stringify(toolResult)
    });

    // 发送后续请求，包含工具执行结果
    const secondResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages
    });
    
    console.log(secondResponse.choices[0].message);
  } else {
    console.log(response.choices[0].message);
  }
  await mcpClient.close();
}

// 执行主函数
main().catch(error => {
  console.error("Error:", error);
  process.exit(1);
});
