const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createResponseObject,
  normalizeResponsesContent,
  responsesInputToMessages,
} = require('../clean/responses');

test('normalizeResponsesContent: string passthrough', () => {
  assert.equal(normalizeResponsesContent('hi'), 'hi');
});

test('normalizeResponsesContent: input_text parts joined', () => {
  const content = [
    { type: 'input_text', text: 'hello' },
    { type: 'input_text', text: 'world' },
  ];
  assert.equal(normalizeResponsesContent(content), 'hello\nworld');
});

test('responsesInputToMessages: string input + instructions', () => {
  const msgs = responsesInputToMessages('hello', 'be concise');
  assert.equal(msgs[0].role, 'system');
  assert.equal(msgs[0].content, 'be concise');
  assert.equal(msgs[1].role, 'user');
  assert.equal(msgs[1].content, 'hello');
});

test('responsesInputToMessages: message items', () => {
  const msgs = responsesInputToMessages([
    { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'hi' }] },
  ]);
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].role, 'user');
  assert.equal(msgs[0].content, 'hi');
});

test('responsesInputToMessages: function_call_output -> tool', () => {
  const msgs = responsesInputToMessages([
    { type: 'function_call_output', call_id: 'call_1', output: '42' },
  ]);
  assert.equal(msgs[0].role, 'tool');
  assert.equal(msgs[0].tool_call_id, 'call_1');
  assert.equal(msgs[0].content, '42');
});

test('responsesInputToMessages: assistant function_call -> tool_calls', () => {
  const msgs = responsesInputToMessages([
    { type: 'function_call', call_id: 'call_2', name: 'get_weather', arguments: { city: 'Beijing' } },
  ]);
  assert.equal(msgs[0].role, 'assistant');
  assert.equal(msgs[0].tool_calls[0].function.name, 'get_weather');
});

test('createResponseObject: text -> message output', () => {
  const r = createResponseObject({ id: 'resp_x', model: 'm', content: 'hi', parsedOutput: null });
  assert.equal(r.object, 'response');
  assert.equal(r.status, 'completed');
  assert.equal(r.output[0].type, 'message');
  assert.equal(r.output[0].content[0].type, 'output_text');
  assert.equal(r.output[0].content[0].text, 'hi');
});

test('createResponseObject: tool_calls -> function_call output', () => {
  const parsed = {
    type: 'tool_calls',
    toolCalls: [{ name: 'get_weather', arguments: { city: 'Beijing' } }],
    prefixText: '',
  };
  const r = createResponseObject({ id: 'resp_y', model: 'm', content: '', parsedOutput: parsed });
  assert.equal(r.output[0].type, 'function_call');
  assert.equal(r.output[0].name, 'get_weather');
  assert.equal(JSON.parse(r.output[0].arguments).city, 'Beijing');
});
