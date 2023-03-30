import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

interface OpenaiParams {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: Array<string>;
}

type CursorStyle =
  | 'line'
  | 'block'
  | 'underline'
  | 'line-thin'
  | 'block-outline'
  | 'underline-thin';

export interface Config {
  openaiKey?: string;
  openaiUrl?: string;
  openaiParams?: OpenaiParams;
  customCompletionFunction?: (code: string) => Promise<string>;
  maxCodeLinesToOpenai?: number;
  cursorStyleLoading?: CursorStyle;
  cursorStyleNormal?: CursorStyle;
  assistantMessage?: string;
}

export const defaultOpenaiParams: OpenaiParams = {
  model: 'gpt-3.5-turbo-0301',
  temperature: 0,
  max_tokens: 64,
  top_p: 1.0,
  frequency_penalty: 0.0,
  presence_penalty: 0.0,
};

export const defaultConfig: Config = {
  openaiKey: '',
  openaiUrl: 'https://api.openai.com',
  openaiParams: defaultOpenaiParams,
  cursorStyleLoading: 'underline',
  cursorStyleNormal: 'line',
  assistantMessage: '',
};

function minimizeWhitespace(code:string) {
  return code
    .split('\n')
    .map((line:string) => line.trim())
    .join('\n');
}

async function fetchCompletionFromOpenAI(
  code: string,
  config: Config,
  controller: AbortController
): Promise<string> {

  const response = await fetch(`${config.openaiUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${config.openaiKey}`,
    },
    body: JSON.stringify({
      messages: [
        {role: "assistant", content: "你是一个代码补全器, 帮我简短地补全这段代码的结尾部分, 请智能结束补全, 只需给出补全的代码, 不需要任何解释"},
        {role: "user", content: config.assistantMessage + '\n' + minimizeWhitespace(code)},
      ],
      ...config.openaiParams,
    }),
    signal: controller.signal,
  });

  if (!response.ok) {
    throw new Error(`OpenAI API request failed: ${response.statusText}`);
  }

  const responseJson = await response.json();
  return responseJson?.choices?.[0]?.message?.content || '';
}

const handleCompletion = async (
  editor: monaco.editor.IStandaloneCodeEditor,
  config: Config,
  controller: AbortController,
  cursorStyleLoading: () => void,
  cursorStyleNormal: () => void
) => {
  const currentPosition = editor.getPosition();
  if (!currentPosition) {
    return;
  }
  const currentLineNumber = currentPosition.lineNumber;
  const startLineNumber = !config.maxCodeLinesToOpenai
    ? 1
    : Math.max(1, currentLineNumber - config.maxCodeLinesToOpenai);
  const endLineNumber = currentLineNumber;
  const code = editor
    .getModel()!
    .getLinesContent()
    .slice(startLineNumber - 1, endLineNumber)
    .join('\n');

  cursorStyleLoading();

  try {
    let newCode = '';
    if (config.customCompletionFunction) {
      newCode = await config.customCompletionFunction(code);
    } else {
      newCode = await fetchCompletionFromOpenAI(code, config, controller);
    }
    cursorStyleNormal();
    if (!newCode) {
      return;
    }

    const position = editor.getPosition();
    if (!position) {
      return;
    }
    const offset = editor.getModel()?.getOffsetAt(position);
    if (!offset) {
      return;
    }

    const edits = [
      {
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        },
        text: newCode,
      },
    ];

    editor.executeEdits('', edits);
  } catch (error) {
    cursorStyleNormal();
    console.error('MonacoEditorCopilot error:', error);
  }
};

const MonacoEditorCopilot = (
  editor: monaco.editor.IStandaloneCodeEditor,
  config: Config
) => {
  const mergedConfig: Config = {
    ...defaultConfig,
    ...config,
    openaiParams: { ...defaultOpenaiParams, ...config.openaiParams },
  };

  const cursorStyleLoading = () => {
    editor.updateOptions({ cursorStyle: mergedConfig.cursorStyleLoading });
  };

  const cursorStyleNormal = () => {
    editor.updateOptions({ cursorStyle: mergedConfig.cursorStyleNormal });
  };

  cursorStyleNormal();

  let controller: AbortController | null = null;

  const cursorPositionChanged = editor.onDidChangeCursorPosition(() => {
    if (controller) {
      controller.abort();
    }
  });

  let copilotAction: monaco.editor.IActionDescriptor | null = {
    id: 'copilot-completion',
    label: 'Trigger Copilot Completion',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB],
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 1.5,
    run: async () => {
      controller = new AbortController();
      await handleCompletion(
        editor,
        mergedConfig,
        controller,
        cursorStyleLoading,
        cursorStyleNormal
      );
    },
  };

  editor.addAction(copilotAction);

  const dispose = () => {
    cursorPositionChanged.dispose();
    if (copilotAction) {
      copilotAction.run = async () => {
        console.warn('Copilot functionality has been disabled');
      };
      copilotAction = null;
    }
  };

  return dispose;
};

export default MonacoEditorCopilot;
