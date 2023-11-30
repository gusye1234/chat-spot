import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from './components/ui/textarea';
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
window.electron.ipcRenderer.on('reset-openai-key', () => {
  openaiUserKey = '';
  window.location.reload();
});

window.electron.ipcRenderer.on('reload-openai-model', () => {
  openaiUserKey = window.electron.openai.openaiModel;
  window.location.reload();
});

function Spotlight() {
  const [openAIKey, setOpenAIKey] = useState('');
  const [promptDict, setPromptDict] = useState(window.utils.getPrompts());
  // const [openaiKeyAlready, setOpenaiKeyAlready] = useState(
  //   validateOpenAIKey(window.electron.openai.openaiKey),
  // );
  const openaiKeyAlready = validateOpenAIKey(openaiUserKey);
  const [userInput, setUserInput] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptSelect, setPromptSelect] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [canvasRect, setCanvasRect] = useState({
    width: 0,
    height: 0,
  });
  const stopGenerating = useRef(false);
  const totalWindow = useRef<HTMLDivElement>(null);
  const inputBox = useRef<HTMLInputElement>(null);
  const outputPane = useRef<HTMLTextAreaElement>(null);
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
    window.electron.ipcRenderer.on('open-window', () => {
      if (inputBox.current) {
        inputBox.current.focus();
      }
      return () => {
        window.electron.ipcRenderer.removeAllListeners('open-window');
      };
    });
  }, []);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'ArrowUp') {
      if (historyNextIndex < userHistory.length) {
        setUserInput(userHistory[historyNextIndex]);
        setHistoryNextIndex(historyNextIndex + 1);
      }
    }
    if (e.key === 'ArrowDown') {
      if (historyNextIndex > 1) {
        setUserInput(userHistory[historyNextIndex - 2]);
        setHistoryNextIndex(historyNextIndex - 1);
      } else {
        setHistoryNextIndex(0);
        setUserInput('');
      }
    }
  };

  // if (window.utils.isDebug) {
  //   window.electron.openai.deleteOpenAIKey();
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
    setAiResponse(thinkingPrompt);
    let currentResponse = '';
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
          model: 'gpt-4-vision-preview',
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
      if (inputBox.current) inputBox.current.focus();
    }
  }, [promptOpen]);

  useEffect(() => {
    if (inputBox.current) inputBox.current.focus();
  }, [aiResponse]);

  useLayoutEffect(() => {
    if (totalWindow && totalWindow.current) {
      window.electron.ipcRenderer.sendMessage('resize-window', {
        width: totalWindow.current.clientWidth,
        height: totalWindow.current.clientHeight,
      });
      setCanvasRect({
        width: totalWindow.current.clientWidth,
        height: totalWindow.current.clientHeight,
      });
    }
    if (inputBox.current) inputBox.current.focus();
  }, []);

  useEffect(() => {
    if (totalWindow && totalWindow.current) {
      const currentRect = {
        width: totalWindow.current.clientWidth,
        height: totalWindow.current.clientHeight,
      };
      if (
        currentRect.width !== canvasRect.width ||
        currentRect.height !== canvasRect.height
      ) {
        window.electron.ipcRenderer.sendMessage('resize-window', currentRect);
        setCanvasRect(currentRect);
      }
    }
    // if (inputBox.current) inputBox.current.focus();
  }, [
    openaiKeyAlready,
    userInput,
    promptOpen,
    aiResponse,
    canvasRect,
    totalWindow,
  ]);

  return (
    <div className="p-1" ref={totalWindow}>
      <div className="p-2 flex flex-col justify-center items-center rounded-2xl bg-background border-2">
        {openaiKeyAlready ? (
          <div className="relative flex flex-row justify-start items-center w-full">
            <Input
              autoFocus
              ref={inputBox}
              placeholder="... press enter ⏎ to send, or use / to invoke prompt"
              value={userInput}
              onChange={(e) => {
                setHistoryNextIndex(0);
                setUserInput(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              disabled={waiting || promptOpen}
              className="grow text-ellipsis overflow-clip pl-10 pr-8 h-12 text-xl placeholder:text-lg placeholder:font-light shadow-md"
            />
            <User ready={userInput.length > 0 && !waiting} />
            <Button
              className="absolute right-1 text-zinc-500 px-1 rounded-md text-center flex justify-center items-center"
              variant="ghost"
              onClick={() => {
                window.electron.ipcRenderer.sendMessage('open-screenshot');
              }}
            >
              <Camera className="w-6 h-6" />
            </Button>
          </div>
        ) : (
          <div className="relative flex flex-row justify-start items-center w-full">
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
              className="grow text-ellipsis overflow-clip pl-10 h-12 text-xl placeholder:text-lg placeholder:font-light shadow-md"
            />
            <User ready={validateOpenAIKey(openAIKey)} />
          </div>
        )}
        {promptOpen && (
          <div
            id="promptSheet"
            className="mt-1 p-1 max-h-[176px] w-full border-2 shadow-md rounded-md overflow-y-scroll scrollbar-w-2 scrollbar-thumb-blue scrollbar-thumb-rounded"
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
                  promptSelect < promptLength ? promptSelect + 1 : promptLength,
                );
                return;
              }
              if (e.key === 'Escape') {
                setPromptOpen(false);
                return;
              }
            }}
          >
            <div className="w-full flex flex-col justify-start items-center gap-0.5">
              <Button
                id="promptSheet"
                ref={(button) => promptSelect === 0 && button && button.focus()}
                size="sm"
                className="w-full text-start"
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
                    className="w-full relative flex flex-row items-center"
                    key={key}
                  >
                    <Button
                      id="promptSheet"
                      ref={(button) =>
                        promptSelect === indexR && button && button.focus()
                      }
                      className={cn(
                        'grow flex flex-row justify-start items-center',
                        indexR % 2 ? ' bg-muted' : '',
                      )}
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log('Clicked');
                        handlePromptClick(key);
                      }}
                    >
                      <span className="font-semibold mr-1">{key}</span>
                      <span className="grow overflow-x-clip text-ellipsis font-normal text-zinc-500 whitespace-nowrap text-start">
                        {promptDict[key]}
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute w-5 h-5 right-1 text-zinc-500"
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
                );
              })}
            </div>
          </div>
        )}
        <div className="relative w-full grow mt-1">
          <Textarea
            ref={outputPane}
            maxRows={18}
            minRows={1}
            value={aiResponse}
            // TODO how to focus at the end of the line when generating?
            placeholder={openaiKeyAlready ? greetingPrompt : cantGreetingPrompt}
            className="w-full resize-none pt-10 px-2 scrollbar-w-2 scrollbar-track-blue-lighter scrollbar-thumb-blue scrollbar-thumb-rounded font-sans font-semibold text-sm text-zinc-500 shadow-md overflow-visible"
          />
          <TooltipProvider>
            <div className="absolute top-2 left-2 flex flex-row items-center justify-start gap-2">
              <Tooltip>
                <TooltipTrigger>
                  <Bot waiting={waiting} />
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="text-xs italic text-muted">{openaiModel}</p>
                </TooltipContent>
              </Tooltip>
              {window.utils.isDebug && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="bg-secondary p-1 rounded-md">
                      <BugPlay
                        className="w-4 h-4 text-zinc-500"
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
          </TooltipProvider>
          <TooltipProvider>
            <div className="absolute top-2 right-2 h-7 flex flex-row justify-center items-center bg-secondary rounded-md border-b-2">
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
                    <Eraser className="w-4 h-4" />
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
                    <Pause className="w-4 h-4" />
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
                      <CopyCheck className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
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
                      <ClipboardCopy className="w-4 h-4" />
                    ) : (
                      <Clipboard className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>auto-copy: {autoCopy ? 'on' : 'off'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
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
