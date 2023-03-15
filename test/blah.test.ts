import { editor,  } from "monaco-editor/esm/vs/editor/editor.api";
import MonacoEditorCopilot, { Config } from "../src/index";

jest.mock("monaco-editor/esm/vs/editor/editor.api");

const mockEditorInstance = {
  updateOptions: jest.fn(),
  getPosition: jest.fn(),
  getModel: jest.fn(),
  executeEdits: jest.fn(),
  onKeyDown: jest.fn(),
};

(editor as any).create = jest.fn(() => mockEditorInstance);

describe("MonacoEditorCopilot", () => {
  let config: Config;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    config = {
      openaiKey: "test-key",
      customCompletionFunction: jest.fn(),
      maxCodeLinesToOpenai: 10,
    };

    mockFetch = jest.fn();
    (global as any).fetch = mockFetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should update cursor style on keydown", () => {
    MonacoEditorCopilot(mockEditorInstance as any, config);

    mockEditorInstance.onKeyDown({
  code: "KeyB",
  ctrlKey: true,
  preventDefault: () => {},
});

    expect(mockEditorInstance.updateOptions).toHaveBeenCalledWith({
      cursorStyle: "underline",
    });
  });

  test("should call custom completion function if provided", async () => {
    MonacoEditorCopilot(mockEditorInstance as any, config);

    mockEditorInstance.getPosition.mockReturnValue({ lineNumber: 1 });

    mockEditorInstance.onKeyDown({
  code: "KeyB",
  ctrlKey: true,
  preventDefault: () => {},
});

    expect(config.customCompletionFunction).toHaveBeenCalled();
  });

  test("should call fetch with correct url and options if custom completion function not provided", async () => {
    delete config.customCompletionFunction;

    MonacoEditorCopilot(mockEditorInstance as any, config);

    mockEditorInstance.getPosition.mockReturnValue({ lineNumber: 1 });
    mockFetch.mockResolvedValueOnce({ json: () => Promise.resolve({ choices: [{ text: "test" }] }) });

    mockEditorInstance.onKeyDown({
  code: "KeyB",
  ctrlKey: true,
  preventDefault: () => {},
});

    expect(mockFetch).toHaveBeenCalledWith("https://api.openai.com/v1/completions", expect.any(Object));
  });
})
