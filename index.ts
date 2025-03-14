import OpenAI from "openai";
const client = new OpenAI();

// 模拟获取天气的工具函数
const getWeather = async (location: string) => {
    // 模拟 API 延迟
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
        location,
        temperature: 25,
        condition: "sunny"
    };
};

const weatherInfo = await getWeather("Shanghai");
console.log(weatherInfo);

const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
        {
            role: "user",
            content: "how about the weather in shanghai?"
        }
    ],
    tools: [{
        type: "function",
        function: {
            name: "getWeather",
            description: "Get the current weather for a location",
            parameters: {
                type: "object",
                properties: {
                    location: {
                        type: "string",
                        description: "The location to get weather for"
                    }
                },
                required: ["location"]
            }
        }
    }],
    tool_choice: "auto"
});

// 处理工具调用
if (response.choices[0].message.tool_calls) {
    const toolCall = response.choices[0].message.tool_calls[0];
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);

    let toolResult;
    if (functionName === 'getWeather') {
        toolResult = await getWeather(functionArgs.location);
    }

    // 发送后续请求，包含工具执行结果
    const secondResponse = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "user",
                content: "how about the weather in shanghai?"
            },
            response.choices[0].message,
            {
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(toolResult)
            }
        ]
    });
    
    console.log(secondResponse.choices[0].message);
} else {
    console.log(response.choices[0].message);
}
