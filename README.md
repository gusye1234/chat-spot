<div align="center">
  <h1>ChatSpot🥸</h1>
  <p><strong>Spotlight app for ChatGPT</strong></p>
    <p>
    <a href="https://github.com/gusye1234/chat-spot/releases/tag/v0.0.2">
      <img src="https://img.shields.io/badge/version-v0.0.2 beta-blue">
    </a>
          <a href="https://github.com/gusye1234/chat-spot/actions?query=workflow%3APublish">
      <img src="https://github.com/gusye1234/chat-spot/actions/workflows/build.yml/badge.svg">
    </a>
    <a href="https://github.com/gusye1234/chat-spot">
      <img src="https://img.shields.io/badge/platform-macOS-green">
    </a>
          <a href="https://github.com/gusye1234/chat-spot">
      <img src="https://img.shields.io/badge/platform-windows-green">
    </a>
  </p>
</div>






<p align="center">
  <img src="https://github.com/gusye1234/chat-spot/releases/download/v0.0.1/show.gif" alt="show" style="border-radius:20px;">
</p>




ChatSpot is an AI-powered, Spotlight assistant designed to help users complete tasks quickly and efficiently. Anytime or anywhere, press `command/ctrl + alt + k` and ChatSpot is always ready to assist. 

By default, anything said by ChatSpot will be automatically copied. So all you need is:

1. Toggle ChatSpot with gobal shortcut  `command/ctrl + alt + k`
2. Ask question and wait the streaming output finished
3. Untoggle ChatSpot with gobal shortcut  `command/ctrl + alt + k`, and the focus will be back to your previsous working place, where you can paste the response from ChatGPT

ChatSpot also supports custom prompts. You can use "/" to invoke a window customized with your prompt.

<p align="center">
  <img src="https://github.com/gusye1234/chat-spot/releases/download/v0.0.1/prompt.gif" alt="prompt" style="border-radius:20px;">
</p>




## Get Started

> **Using ChatSpot requires your own OpenAI key to connect to ChatGPT.**

Download the app

| Platform | Tested Supports    | Download                                                     |
| -------- | ------------------ | ------------------------------------------------------------ |
| MacOS    | Support 13.5.2+    | [Release](https://github.com/gusye1234/chat-spot/releases/tag/v0.0.2) |
| Windows  | Haven't tested yet | [Release](https://github.com/gusye1234/chat-spot/releases/tag/v0.0.2) |
| Linux    | Haven't tested yet | /                                                            |



## Development

Clone this repo and run the following commands:

```shell
pnpm install
pnpm dev
```

To package the App in your platform (MacOS, Windows, Linux...), run:

```shell
pnpm package
```



## Credits

* Thanks to [Electron React Boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate) , I saved a lot of time for the inital setup.i
