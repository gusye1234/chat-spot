import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Separator } from './components/ui/separator';
import {
  Copy,
  CopyCheck,
  Clipboard,
  ClipboardCopy,
  Pause,
  BugPlay,
  Eraser,
  Plus,
  X,
  Camera,
  ArrowRight,
  Sun,
  Moon,
} from 'lucide-react';
import { cn, validateOpenAIKey } from './lib/utils';
import { OpenAI } from 'openai';
import {
  systemPrompt,
  thinkingPrompt,
  greetingPrompt,
  cantGreetingPrompt,
  addPromptFailed,
  addPromptTemplate,
  addPromptHint,
} from './lib/constants';
import { User, Bot } from './components/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

let openaiUserKey = window.electron.openai.openaiKey;
let openaiModel = window.electron.openai.openaiModel;
let localTheme = window.utils.getTheme();

window.electron.ipcRenderer.on('reset-openai-key', () => {
  openaiUserKey = '';
  window.location.reload();
});

window.electron.ipcRenderer.on('reload-openai-model', () => {
  openaiModel = window.electron.openai.openaiModel;
  window.location.reload();
});

function Spotlight() {
  const [openAIKey, setOpenAIKey] = useState('');
  const [promptDict, setPromptDict] = useState(window.utils.getPrompts());
  const specialKey = window.utils.isDarwin ? '⌘' : 'Ctrl';
  const openaiKeyAlready = validateOpenAIKey(openaiUserKey);
  const [userInput, setUserInput] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptSelect, setPromptSelect] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [theme, setTheme] = useState(localTheme);

  const stopGenerating = useRef(false);
  const totalWindow = useRef<HTMLDivElement>(null);
  const inputBox = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);
  const [autoCopy, setAutoCopy] = useState(true);
  const [userHistory, setUserHistory] = useState<string[]>([]);
  const [historyNextIndex, setHistoryNextIndex] = useState(0);
  const [aiResponse, setAiResponse] = useState('');

  const openai = new OpenAI({
    apiKey: openaiUserKey,
    dangerouslyAllowBrowser: true,
  });

  useEffect(() => {
    document.documentElement.classList.add('dark');
    // document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      window.utils.setTheme('light');
    } else {
      document.documentElement.classList.add('dark');
      window.utils.setTheme('dark');
    }
  }, [theme]);

  useEffect(() => {
    const cancelListen = window.electron.ipcRenderer.on(
      'take-shot',
      async (...args) => {
        const image = args[0] as string;
        setImageInput(image);
      },
    );
    return cancelListen;
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (window.utils.isDarwin) {
      if (e.metaKey && e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
      if (e.metaKey && e.key === 'ArrowUp') {
        if (historyNextIndex < userHistory.length) {
          setUserInput(userHistory[historyNextIndex]);
          setHistoryNextIndex(historyNextIndex + 1);
        }
      }
      if (e.metaKey && e.key === 'ArrowDown') {
        if (historyNextIndex > 1) {
          setUserInput(userHistory[historyNextIndex - 2]);
          setHistoryNextIndex(historyNextIndex - 1);
        } else {
          setHistoryNextIndex(0);
          setUserInput('');
        }
      }
    } else {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
      if (e.ctrlKey && e.key === 'ArrowUp') {
        if (historyNextIndex < userHistory.length) {
          setUserInput(userHistory[historyNextIndex]);
          setHistoryNextIndex(historyNextIndex + 1);
        }
      }
      if (e.ctrlKey && e.key === 'ArrowDown') {
        if (historyNextIndex > 1) {
          setUserInput(userHistory[historyNextIndex - 2]);
          setHistoryNextIndex(historyNextIndex - 1);
        } else {
          setHistoryNextIndex(0);
          setUserInput('');
        }
      }
    }
  };

  // if (window.utils.isDebug) {
  //   window.electron.openai.deleteOpenAIKey();
  //   window.electron.openai.deleteOpenAIModel();
  // }
  const handleSetOpenAIKey = async () => {
    if (validateOpenAIKey(openAIKey)) {
      window.electron.openai.saveOpenAIKey(openAIKey);
      openaiUserKey = openAIKey;
      setOpenAIKey('');
    }
  };
  const handleNewPrompt = (name: string, content: string) => {
    window.utils.addPrompt(name, content);
    promptDict[name] = content;
    setPromptDict(promptDict);
    setAiResponse(`🚀 Your prompt is added:

title: ${name}
prompt: ${content}`);
    setUserInput('');
  };

  const handleSend = async () => {
    if (!userInput) {
      return;
    }
    // command mode
    if (userInput.startsWith('!')) {
      const command = userInput.trim().split(' ');
      if (command[0] === '!addPrompt') {
        if (command.length < 3) {
          setAiResponse(addPromptFailed);
        } else {
          handleNewPrompt(
            command[1],
            command.slice(2, command.length).join(' '),
          );
        }
      }

      return;
    }
    stopGenerating.current = false;
    setCopied(false);
    setWaiting(true);
    setUserInput('');
    setAiResponse(thinkingPrompt);
    let currentResponse = '';
    console.log('Using', openaiModel);
    try {
      let stream;
      if (!imageInput) {
        stream = await openai.chat.completions.create({
          model: openaiModel,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            { role: 'user', content: userInput },
          ],
          temperature: 0.1,
          stream: true,
        });
      } else {
        stream = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: userInput,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageInput,
                  },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 2400,
          stream: true,
        });
      }

      for await (const chunk of stream) {
        currentResponse += chunk.choices[0]?.delta?.content || '';
        setAiResponse(currentResponse);
        if (stopGenerating.current) {
          break;
        }
      }

      //console.log("response", result.data.choices[0].text);
    } catch (e) {
      //console.log(e);
      setAiResponse('Something is going wrong, Please try again.');
    }

    if (userHistory.length > 0) {
      // not repeated and consecutive input
      if (userInput !== userHistory[0]) {
        setUserHistory([userInput, ...userHistory]);
      }
    } else {
      setUserHistory([userInput]);
    }
    setUserInput('');
    setHistoryNextIndex(0);
    if (autoCopy) {
      handleCopy(currentResponse);
    }
    setWaiting(false);
  };

  const handlePromptSheetAdd = () => {
    setPromptOpen(false);
    setUserInput(addPromptTemplate);
    setAiResponse(addPromptHint);
  };
  const handlePromptClick = (key: string) => {
    setPromptOpen(false);
    setUserInput(userInput.slice(0, userInput.length - 1) + promptDict[key]);
  };
  const handleCopy = (content: string) => {
    // clipboard.writeText(aiResponse);
    window.utils.clipboardWrite(content);
    setCopied(true);
  };

  useEffect(() => {
    if (userInput.endsWith('/')) {
      setPromptOpen(true);
    }
  }, [userInput]);

  useEffect(() => {
    if (!promptOpen) {
      if (inputBox && inputBox.current) inputBox.current.focus();
    }
  }, [promptOpen]);

  useEffect(() => {
    if (inputBox && inputBox.current) inputBox.current.focus();
  }, [aiResponse]);

  useEffect(() => {
    window.electron.ipcRenderer.on('open-window', () => {
      if (inputBox.current) {
        inputBox.current.focus();
      }
      return () => {
        window.electron.ipcRenderer.removeAllListeners('open-window');
      };
    });
  }, []);
  return (
    <div className="" ref={totalWindow}>
      <div className="max-h-[512px] min-h-[512px] overflow-clip flex flex-col justify-start items-center bg-background">
        {openaiKeyAlready ? (
          <div className="relative flex flex-row justify-start items-center w-full border-b-2 py-1 dark:border-b dark:border-blue-950">
            <Textarea
              autoFocus
              ref={inputBox}
              maxRows={4}
              placeholder="Ask me anything ..."
              value={userInput}
              onChange={(e) => {
                setHistoryNextIndex(0);
                setUserInput(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              disabled={waiting || promptOpen}
              className="grow bg-transparent rounded-none border-none text-primary text-ellipsis overflow-clip pl-11 pr-16 h-12 text-xl placeholder:font-light scrollbar-w-2 scrollbar-track-blue-lighter dark:scrollbar-track-blue-darker scrollbar-thumb-blue scrollbar-thumb-rounded overflow-y-auto resize-none"
            />
            <User ready={userInput.length > 0 && !waiting} />
            <Button
              className="absolute bottom-2 right-9 text-zinc-500 px-1 rounded-md text-center flex justify-center items-center"
              variant="ghost"
              onClick={() => {
                window.electron.ipcRenderer.sendMessage('open-screenshot');
              }}
            >
              <Camera className="w-6 h-6" strokeWidth={1} />
            </Button>
            <Button
              className="absolute bottom-2 right-1 text-zinc-500 px-1 rounded-md text-center flex justify-center items-center"
              variant="ghost"
              onClick={() => {
                handleSend();
              }}
            >
              <ArrowRight className="w-6 h-6" strokeWidth={1} />
            </Button>
          </div>
        ) : (
          <div className="relative border-b-2 flex flex-row justify-start items-center w-full dark:border-b dark:border-blue-950">
            <Input
              autoFocus
              type="password"
              ref={(input) => input && input.focus()}
              placeholder="your Open AI key..., press enter ⏎ to save locally"
              value={openAIKey}
              onChange={(e) => {
                setOpenAIKey(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (validateOpenAIKey(openAIKey)) {
                    setAiResponse(greetingPrompt);
                    handleSetOpenAIKey();
                  } else {
                    setAiResponse(
                      `Your key is wrong, please try again😢. '${openAIKey}' is not a valid key.`,
                    );
                  }
                }
              }}
              className="grow bg-background text-primary border-none text-ellipsis overflow-clip focus:rounded-none pl-11 h-12 text-xl placeholder:text-lg placeholder:font-light"
            />
            <User ready={validateOpenAIKey(openAIKey)} />
          </div>
        )}
        <div className="relative grow overflow-auto w-full flex flex-row justify-start items-stretch py-2 pl-2 bg-background">
          {promptOpen && (
            <div
              id="promptSheet"
              className="absolute inset-x-10 top-0 z-50 bg-transparent border-t-0 dark:border-blue-950 shadow-lg backdrop-blur-md p-1 max-h-[196px] border rounded-b-md overflow-y-auto scrollbar-w-2 scrollbar-thumb-blue scrollbar-thumb-rounded"
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setPromptSelect(promptSelect ? promptSelect - 1 : 0);
                  return;
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  const promptLength = Object.keys(promptDict).length;
                  setPromptSelect(
                    promptSelect < promptLength
                      ? promptSelect + 1
                      : promptLength,
                  );
                  return;
                }
                if (e.key === 'Escape') {
                  setPromptOpen(false);
                  return;
                }
              }}
              onMouseLeave={(e) => {
                setPromptOpen(false);
              }}
            >
              <div className="w-full flex flex-col justify-start items-center">
                <Button
                  id="promptSheet"
                  ref={(button) =>
                    promptSelect === 0 && button && button.focus()
                  }
                  size="sm"
                  className="w-full text-primary"
                  variant="ghost"
                  key={0}
                  onClick={() => handlePromptSheetAdd()}
                >
                  <Plus />
                </Button>
                {Object.keys(promptDict).map((key, index) => {
                  const indexR = index + 1;
                  return (
                    <div
                      key={key}
                      className="w-full flex flex-col justify-start items-center"
                    >
                      <Separator className="w-full mt-0.5" />
                      <div className="group w-full relative flex flex-row items-center">
                        <Button
                          id="promptSheet"
                          ref={(button) =>
                            promptSelect === indexR && button && button.focus()
                          }
                          className={cn(
                            'grow flex flex-row justify-start items-center',
                          )}
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            console.log('Clicked');
                            handlePromptClick(key);
                          }}
                        >
                          <span className="font-semibold mr-1 text-primary">
                            {key}
                          </span>
                          <span className="grow overflow-x-clip text-ellipsis font-normal text-zinc-500 whitespace-nowrap text-start">
                            {promptDict[key]}
                          </span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute w-5 h-5 right-1 text-zinc-500 invisible group-hover:visible"
                          onClick={() => {
                            setPromptOpen(false);
                            if (indexR === promptSelect) {
                              setPromptSelect(0);
                            }
                            window.utils.deletePrompt(key);
                            delete promptDict[key];
                            setPromptDict(promptDict);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex flex-col justify-start items-center gap-1">
            <TooltipProvider>
              <div className="flex flex-col items-center justify-start gap-1">
                <Tooltip>
                  <TooltipTrigger>
                    <Bot waiting={waiting} />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="text-xs italic text-muted">{openaiModel}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
            <TooltipProvider>
              <div className="flex flex-col justify-center items-center bg-secondary rounded-md dark:bg-blue-950">
                {window.utils.isDebug && (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="bg-secondary p-1 rounded-md dark:bg-blue-950">
                        <BugPlay
                          className="w-4 h-4 text-zinc-500"
                          strokeWidth={1}
                          onClick={() => {
                            window.electron.ipcRenderer.sendMessage(
                              'open-dev-mode',
                            );
                          }}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Dev mode</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant={'ghost'}
                      size={'icon'}
                      className="w-7 h-7 text-zinc-500"
                      onClick={() => {
                        setAiResponse('');
                      }}
                      disabled={!aiResponse || waiting || !openaiKeyAlready}
                    >
                      <Eraser className="w-4 h-4" strokeWidth={1} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>empty the output</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant={'ghost'}
                      size={'icon'}
                      className="w-7 h-7 text-zinc-500"
                      onClick={() => (stopGenerating.current = true)}
                      disabled={!waiting}
                    >
                      <Pause className="w-4 h-4" strokeWidth={1} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>stop generating</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant={'ghost'}
                      size={'icon'}
                      className="w-7 h-7 text-zinc-500"
                      onClick={() => {
                        handleCopy(aiResponse);
                      }}
                      disabled={!aiResponse || waiting || !openaiKeyAlready}
                    >
                      {copied ? (
                        <CopyCheck className="w-4 h-4" strokeWidth={1} />
                      ) : (
                        <Copy className="w-4 h-4" strokeWidth={1} />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>copy the content</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant={'ghost'}
                      size={'icon'}
                      className="w-7 h-7 text-zinc-500"
                      onClick={() => {
                        setAutoCopy(!autoCopy);
                      }}
                    >
                      {autoCopy ? (
                        <ClipboardCopy className="w-4 h-4" strokeWidth={1} />
                      ) : (
                        <Clipboard className="w-4 h-4" strokeWidth={1} />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>auto-copy: {autoCopy ? 'on' : 'off'}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant={'ghost'}
                      size={'icon'}
                      className="w-7 h-7 text-zinc-500"
                      onClick={() => {
                        setTheme(theme === 'light' ? 'dark' : 'light');
                      }}
                    >
                      {theme === 'light' ? (
                        <Sun className="w-4 h-4" strokeWidth={1} />
                      ) : (
                        <Moon className="w-4 h-4" strokeWidth={1} />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>theme: {theme}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
            {imageInput && (
              <div className="relative group w-7 h-7">
                <X
                  className="absolute -top-1 -right-1 bg-secondary rounded-full w-4 h-4 invisible group-hover:visible cursor-pointer"
                  onClick={() => {
                    setImageInput('');
                  }}
                />
                <img
                  src={imageInput}
                  alt="screen shot"
                  className="w-7 h-7 rounded-md border-2 border-blue-500 cursor-pointer"
                  onClick={() => {
                    window.electron.ipcRenderer.sendMessage(
                      'open-image',
                      imageInput,
                    );
                    handleCopy(imageInput);
                  }}
                />
              </div>
            )}
          </div>
          <Markdown
            remarkPlugins={[remarkGfm]}
            className="w-full text-sm py-1 px-2 font-sans rounded-md text-zinc-500 dark:text-zinc-300 font-semibold overflow-auto scrollbar-w-2 scrollbar-track-blue-lighter dark:scrollbar-track-blue-darker scrollbar-thumb-blue scrollbar-thumb-rounded"
          >
            {aiResponse
              ? aiResponse
              : openaiKeyAlready
                ? greetingPrompt
                : cantGreetingPrompt}
          </Markdown>
        </div>
        <div className="w-full border-t bg-secondary font-mono text-zinc-400 py-1 px-4 text-xs font-medium dark:bg-background dark:text-zinc-600 dark:hover:text-zinc-300 hover:text-zinc-500 dark:border-blue-950 flex flex-row justify-center items-center gap-4">
          <span>{`${specialKey} + Alt + K Toggle`}</span>
          <Separator className="h-4" orientation="vertical" />
          <span>{`⏎ New line`}</span>
          <Separator className="h-4" orientation="vertical" />
          <span>{`${specialKey} + ⏎ Send`}</span>
          <Separator className="h-4" orientation="vertical" />
          <span>{`/ Prompt`}</span>
          <Separator className="h-4" orientation="vertical" />
          <span>{`${specialKey} + ↑↓ Browser history`}</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Spotlight />} />
      </Routes>
    </Router>
  );
}
