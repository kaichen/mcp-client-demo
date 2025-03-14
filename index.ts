import OpenAI from "openai";
const client = new OpenAI();

const response = await client.chat.completions.create({
    model: "gpt-4",
    messages: [
        {
            role: "user",
            content: "Write a one-sentence bedtime story about a unicorn."
        }
    ]
});

console.log(response.choices);
