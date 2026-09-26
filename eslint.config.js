// ESLint flat config. Besides correctness, it enforces the app's security invariants:
//  - no HTML string sinks (innerHTML/outerHTML/insertAdjacentHTML/document.write/createContextualFragment)
//  - no dynamic code (eval, new Function, string timers)
//  - health data never goes to localStorage/sessionStorage (only non-sensitive prefs may)

import js from '@eslint/js';
import globals from 'globals';

const HTML_SINKS = [
  { selector: "AssignmentExpression[left.property.name=/^(innerHTML|outerHTML|srcdoc)$/]", message: 'Build DOM with h()/s() from core/dom.js; HTML strings are forbidden (XSS).' },
  { selector: "CallExpression[callee.property.name=/^(insertAdjacentHTML|createContextualFragment|parseFromString)$/]", message: 'HTML parsing sinks are forbidden (XSS).' },
  { selector: "CallExpression[callee.object.name='document'][callee.property.name=/^(write|writeln)$/]", message: 'document.write is forbidden.' },
  { selector: "CallExpression[callee.name=/^(setTimeout|setInterval)$/][arguments.0.type='Literal']", message: 'String timers are dynamic code.' },
  { selector: "CallExpression[callee.property.name='setAttribute'][arguments.0.value=/^on/i]", message: 'Inline event handler attributes are forbidden (CSP).' },
  { selector: "CallExpression[callee.property.name='replaceChildren']", message: 'Use replace() from core/dom.js: native replaceChildren() turns null children into "null" text.' },
];

export default [
  {
    ignores: ['node_modules/', 'coverage/', 'test-results/', 'playwright-report/', '.scratch/', '.claude/', 'public/js/ui/icon-data.js'],
  },
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-proto': 'error',
      'no-extend-native': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
    },
  },
  {
    files: ['public/**/*.js'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.browser } },
    rules: {
      'no-restricted-syntax': ['error', ...HTML_SINKS],
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Only data/prefs.js, data/legacy.js and boot.js may touch localStorage (never health data).' },
        { name: 'sessionStorage', message: 'Not used: nothing sensitive may be stored unencrypted.' },
      ],
      'no-console': ['error', { allow: ['error', 'warn'] }],
    },
  },
  {
    files: ['public/js/data/prefs.js', 'public/js/data/legacy.js', 'public/js/boot.js'],
    rules: { 'no-restricted-globals': 'off' },
  },
  {
    files: ['public/sw.js'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'script', globals: { ...globals.serviceworker } },
  },
  {
    files: ['scripts/**/*.mjs', 'netlify/**/*.mjs', 'tests/**/*.{js,mjs}', '*.config.{js,mjs}', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.node } },
  },
  {
    files: ['tests/**/*.{js,mjs}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
