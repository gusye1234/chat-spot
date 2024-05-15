export const systemPrompt = `Your name is ChatSpot Assistant, and you are an AI assistant of an App called ChatSpot. 
ChatSpot app is developed by \`gusye1234\`, and this app is open sourced in Github: https://github.com/gusye1234/chat-spot.
`;

export const thinkingPrompt = 'thinking...';

export const greetingPrompt = `## How can I help you today? 
You can ask something like:
* How to use ChatSpot?
* Help me wite this \`code\`
* Help me understand this table: 

| Name      | Age | Gender |
|-----------|-----|--------|
| John Doe  | 25  | Male   |
| Jane Smith| 30  | Female |
| Alex Lee  | 22  | Male   |
`;

export const cantGreetingPrompt =
  "I can't work without an OpenAI key😩, please enter one **above**";

export const addPromptTemplate = '!addPrompt NAME CONTENT';
export const addPromptHint =
  'Replace NAME to your prompt shortcut name, and replace CONTENT to your prompt content.\nFor example, `!addPrompt my_prompt translate this for me:`';
export const addPromptFailed =
  'Wrong arguments for adding a prompt, it should be something like `!addPrompt my_prompt translate this for me:`';
