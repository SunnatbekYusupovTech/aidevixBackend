'use client';

import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Bundle the lockfile's audited editor and workers. The default React loader
// fetches an older CDN build whose embedded sanitizer bypasses npm overrides.
self.MonacoEnvironment = {
  getWorker(_moduleId, label) {
    if (label === 'typescript' || label === 'javascript') {
      return new Worker(new URL('monaco-editor/language/typescript/ts.worker.js', import.meta.url), { type: 'module' });
    }
    if (label === 'json') {
      return new Worker(new URL('monaco-editor/language/json/json.worker.js', import.meta.url), { type: 'module' });
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new Worker(new URL('monaco-editor/language/css/css.worker.js', import.meta.url), { type: 'module' });
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new Worker(new URL('monaco-editor/language/html/html.worker.js', import.meta.url), { type: 'module' });
    }
    return new Worker(new URL('monaco-editor/editor/editor.worker.js', import.meta.url), { type: 'module' });
  },
};

loader.config({ monaco });

export default Editor;
