import OpenAI from "openai";
const client = new OpenAI();

// 模拟天气工具函数
const weatherTool = {
  type: "function" as const,
  function: {
    name: "get_weather",
    description: "获取指定城市的天气信息",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "城市名称，如北京、上海、广州等"
        },
        unit: {
          type: "string",
          enum: ["celsius", "fahrenheit"],
          description: "温度单位"
        }
      },
      required: ["location"]
    }
  }
};

// 模拟天气数据处理函数
function getWeather(location: string, unit: string = "celsius") {
  // 模拟数据
  const weatherData: Record<string, { temp: number, condition: string, humidity: number }> = {
    "北京": { temp: 20, condition: "晴朗", humidity: 45 },
    "上海": { temp: 22, condition: "多云", humidity: 60 },
    "广州": { temp: 28, condition: "雨", humidity: 80 },
    "深圳": { temp: 27, condition: "多云", humidity: 75 },
    "杭州": { temp: 21, condition: "晴朗", humidity: 50 }
  };
  
  // 默认天气数据
  const defaultWeather = { temp: 25, condition: "晴朗", humidity: 55 };
  
  // 获取城市天气，如果不存在则使用默认值
  const cityWeather = weatherData[location] || defaultWeather;
  
  // 温度单位转换
  let temperature = cityWeather.temp;
  if (unit === "fahrenheit") {
    temperature = (temperature * 9/5) + 32;
  }
  
  return {
    location,
    temperature,
    unit,
    condition: cityWeather.condition,
    humidity: cityWeather.humidity
  };
}

console.log("weatherTool", weatherTool);

const response = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    {
      role: "user",
      content: "今天北京的天气怎么样？"
    }
  ],
  tools: [weatherTool]
});

console.log("response", response.choices[0].message);

// 处理工具调用
if (response.choices[0]?.message?.tool_calls) {
  const toolCalls = response.choices[0].message.tool_calls;
  const toolResponses = [];
  
  for (const toolCall of toolCalls) {
    if (toolCall.function.name === "get_weather") {
      const args = JSON.parse(toolCall.function.arguments);
      const weatherResult = getWeather(args.location, args.unit);
      console.log("weatherResult", weatherResult);
      toolResponses.push({
        tool_call_id: toolCall.id,
        role: "tool" as const,
        content: JSON.stringify(weatherResult)
      });
    }
  }
  
  // 如果有工具调用，发送第二次请求获取最终回复
  if (toolResponses.length > 0) {
    const secondResponse = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: "今天北京的天气怎么样？"
        },
        response.choices[0].message,
        ...toolResponses
      ]
    });
    
    console.log("最终回复:", secondResponse.choices[0].message.content);
  }
} else {
  console.log("AI回复:", response.choices[0].message.content);
}
