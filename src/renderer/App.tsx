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
} from 'lucide-react';
import { validateOpenAIKey } from './lib/utils';
import { OpenAI } from 'openai';
import {
  systemPrompt,
  thinkingPrompt,
  greetingPrompt,
  cantGreetingPrompt,
} from './lib/constants';
import { User, Bot, Drag } from './components/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function Spotlight() {
  const [openAIKey, setOpenAIKey] = useState(window.electron.openai.openaiKey);
  const [openaiKeyAlready, setOpenaiKeyAlready] = useState(
    validateOpenAIKey(window.electron.openai.openaiKey),
  );
  const [userInput, setUserInput] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [canvasRect, setCanvasRect] = useState({
    width: 0,
    height: 0,
  });
  const stopGenerating = useRef(false);
  const totalWindow = useRef<HTMLDivElement>(null);
  const outputPane = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);
  const [autoCopy, setAutoCopy] = useState(true);
  const [userHistory, setUserHistory] = useState<string[]>([]);
  const [historyNextIndex, setHistoryNextIndex] = useState(0);
  const [aiResponse, setAiResponse] = useState('');

  const openai = new OpenAI({
    apiKey: openAIKey,
    dangerouslyAllowBrowser: true,
  });

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
      setOpenaiKeyAlready(true);
    }
  };
  const handleSend = async () => {
    if (!userInput) {
      return;
    }
    stopGenerating.current = false;
    setCopied(false);
    setWaiting(true);
    setAiResponse(thinkingPrompt);
    let currentResponse = '';
    try {
      const stream = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-0613',
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
  const handleCopy = async (content: string) => {
    console.log('Copied');
    // clipboard.writeText(aiResponse);
    window.utils.clipboardWrite(content);
    setCopied(true);
  };
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
  }, []);
  useLayoutEffect(() => {
    if (totalWindow && totalWindow.current) {
      console.log('Update!');
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
  }, [openaiKeyAlready, userInput, aiResponse, canvasRect, totalWindow]);
  return (
    <div className="p-0.5 overflow-hidden" ref={totalWindow}>
      <div className="p-2 flex flex-col justify-center gap-1 items-center rounded-lg bg-background">
        {openaiKeyAlready ? (
          <div className="relative flex flex-row justify-start items-center w-full">
            <Input
              autoFocus
              ref={(input) => input && input.focus()}
              placeholder="... press enter ⏎ to send"
              value={userInput}
              onChange={(e) => {
                setHistoryNextIndex(0);
                setUserInput(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              disabled={waiting}
              className="grow text-ellipsis overflow-clip pl-10 pr-8 h-12 text-xl placeholder:text-lg placeholder:font-light shadow-md"
            />
            <User ready={userInput.length > 0 && !waiting} />
            <Drag />
          </div>
        ) : (
          <div className="relative flex flex-row justify-start items-center w-full">
            <Input
              autoFocus
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
            <Drag />
          </div>
        )}
        <div className="relative w-full group grow">
          <Textarea
            ref={outputPane}
            maxRows={20}
            minRows={1}
            value={aiResponse}
            // TODO how to focus at the end of the line when generating?
            // onChange={() => {
            //   if (outputPane && outputPane.current) {
            //     outputPane.current.focus();
            //   }
            // }}
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
                  <p>ChatSpot Assistant</p>
                </TooltipContent>
              </Tooltip>
              {window.utils.isDebug && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="bg-secondary p-1 rounded-md">
                      <BugPlay className="w-4 h-4 text-zinc-500" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Dev mode</p>
                  </TooltipContent>
                </Tooltip>
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
                    disabled={!aiResponse || waiting}
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
                    disabled={!aiResponse || waiting}
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
