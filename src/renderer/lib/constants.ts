export const systemPrompt = `Your name is ChatSpot Assistant, and you are an AI assistant living in an App called ChatSpot. 

Below is a README of ChatSpot App:
# ChatSpot
## How to use this app
* Users can use global shortcut 'command/ctrl + alt + k' to toggle ChatSpot
* Users can input their questions then press enter key to send their questions to you in the input box.
* Users can use Up/Down arrow keys to browse the questions history.
* Users can use key: '/' to invoke their own prompt.
* You can change the current AI model in the menu bar.
## Project credits
ChatSpot app is developed by \`gusye1234\`, and this app is open sourced in Github: https://github.com/gusye1234/chat-spot.
`;

export const thinkingPrompt = 'thinking...';

export const greetingPrompt = `How can I help you today? You can ask something like:
* How to use ChatSpot?
* Help me wite this \`code\`...
* Can you write me a story?
* Can you write me a story?
* Can you write me a story?
* Can you write me a story?
* Can you write me a story?
* Can you write me a story?
* Can you write me a story?
* Can you write me a story?
* Can you write me a story?
* Can you write me a story?
* Can you write me a story?
* Can you write me a story?`;

export const cantGreetingPrompt =
  "I can't work without an OpenAI key😩, please enter one **above**";

export const addPromptTemplate = '!addPrompt NAME CONTENT';
export const addPromptHint =
  'Replace NAME to your prompt shortcut name, and replace CONTENT to your prompt content.\nFor example, `!addPrompt my_prompt translate this for me:`';
export const addPromptFailed =
  'Wrong arguments for adding a prompt, it should be something like `!addPrompt my_prompt translate this for me:`';
