<template>
  <div>
    <h1>Monaco Editor Copilot</h1>
    <p>Monaco Editor Copilot is a plugin for the Monaco Editor that integrates OpenAI's GPT-based code completion engine to provide a seamless and intelligent coding experience. This library is designed to work with the Monaco Editor and allows developers to easily configure and customize the plugin to suit their needs.</p>
    <h4>Use ctrl+b or cmd+b in the editor to preview the effect.</h4>
    <div class="editor-container-wrap">
      <div v-for="(editorInstance, index) in editorInstances" :key="index" ref="editorContainers"
        class="editor-container"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import * as monaco from 'monaco-editor';
import MonacoEditorCopilot from 'monaco-editor-copilot';


const key = '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'

const config = [
  {
    testName: 'basic example',
    openaiKey: key,
  },
  {
    testName: 'example with custom openaiParams',
    openaiKey: key,
    openaiParams: {
      model: 'code-davinci-002',
      temperature: 0.8,
      max_tokens: 64,
    },
  },
  {
    testName: 'example with custom maxCodeLinesToOpenai',
    openaiKey: key,
    maxCodeLinesToOpenai: 2,
  },
  {
    testName: 'example with custom cursorStyle',
    openaiKey: key,
    cursorStyleLoading: 'block-outline',
    cursorStyleNormal: 'block',
  },
  {
    testName: 'example with customCompletionFunction',
    customCompletionFunction: async (code) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve('// example with customCompletionFunction\n');
        }, 1000);
      });
    },
    'customCompletionFunction.show': `
      async (code) => {
        return 'example with customCompletionFunction\n';
      }
    `
  },
  {
    testName: 'example with dispose',
    openaiKey: key,
  },
]

const editorContainers = ref([]);
const editorInstances = Array(config.length).fill(null);
let editors = [];

onMounted(() => {
  editorInstances.forEach((_, index) => {
    initMonacoEditor(index);
  });
});

function initMonacoEditor(index) {
  const container = editorContainers.value[index];
  const editor = monaco.editor.create(container, {
    value: `const config = ${JSON.stringify(config[index] || {}, null, 2)}
// generated a sleep Promise function
`.replace(key, 'your-openai-key'),
    language: 'javascript',
  });


  const dispose = MonacoEditorCopilot(editor, config[index] || {});
  if (config[index]?.testName === 'example with dispose') {
    setTimeout(() => {
      dispose();
    }, 1000);
  }
  editors.push(editor);
}
</script>

<style scoped>
.editor-container-wrap {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-gap: 20px;
}

.editor-container {
  overflow: hidden;
  height: 300px;
  border: 1px solid #000;
  padding: 10px 0;
}
</style>
