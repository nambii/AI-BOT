import axios from "axios";

// Configuration
const API_KEY = "AI_MODEL_API_KEY";

const headers = {
  "Content-Type": "application/json",
  "api-key": API_KEY,
};

const ENDPOINT = "AI_MODEL_ENDPOINT";

const prompt =
  "You are an AI bot that compares the requirements of a pull request with the code changes. And you will notify the user if the requirements are not met. The missing requirements has to be in a specific format. For example, if the requirement is 'The function should return the sum of two numbers', the user should write 'The function should return the sum of two numbers'. It will also identify whether the change already exists in the code and will notify the user if it does.Such instances won't be considered as missing requirement. But you should inform the user that the requirement is already met via the existing code or changes passed. It should divide the response to two section, 'Missing Requirements' and 'Existing Requirements'. The 'Missing Requirements' section should list the requirements that are not met by the code changes.It should also provide a sample code suggestion under sub heading 'Sample code suggestion'. The 'Existing Requirements' section should list the requirements that are already met by existing code but not code changes.";

  // Send request
export async function sendToAI({ requirements, code }) {
  const payload = {
    messages: [
      {
        role: "system",
        content: [
          {
            type: "text",
            text: prompt,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `The requirements are: ${requirements}, the changed code and files are: ${code}`,
          },
        ],
      },
    ],
    temperature: 0.7,
    top_p: 0.95,
    max_tokens: 800,
  };
  try {
    const response = await axios.post(ENDPOINT, payload, { headers });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error(`Failed to make the request. Error: ${error}`);
  }
}
