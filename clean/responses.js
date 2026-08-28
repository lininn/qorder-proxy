'use strict';

const { AppError } = require('./errors');
const { log } = require('./logger');
const { generateCallId, normalizeOpenAiTools } = require('./tool-parser');

/**
 * Normalize a Responses-API content field into plain text.
 *
 * `content` may be a string, or an array of content parts
 * (input_text / output_text / text / input_image / function_call_output ...).
 */
function normalizeResponsesContent(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return String(content);

  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (!part || typeof part !== 'object') return '';
      if (part.type === 'input_text' || part.type === 'output_text' || part.type === 'text') {
        return part.text || '';
      }
      if (part.type === 'input_image') {
        const src = part.image_url?.url || part.file_id || 'image';
        return `[image: ${src}]`;
      }
      if (part.type === 'function_call_output') {
        return `<tool_result id="${part.call_id || ''}">\n${part.output || ''}\n</tool_result>`;
      }
      if (part.type === 'refusal') return part.refusal || '';
      if (part.text) return part.text;
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Convert a Responses-API request's `input` (`string` or item array) plus an
 * optional `instructions` system prompt into the proxy's internal message list.
 *
 * Handles the shapes Codex actually sends:
 *   - `input` as a plain string
 *   - items with `{ type: 'message', role, content }`
 *   - items with a bare `role` (chat-style)
 *   - `{ type: 'function_call_output', call_id, output }`  -> tool result
 *   - assistant `{ type: 'function_call', ... }`            -> assistant tool_calls
 */
function responsesInputToMessages(input, instructions) {
  const messages = [];
  if (instructions) messages.push({ role: 'system', content: instructions });

  if (typeof input === 'string') {
    messages.push({ role: 'user', content: input });
    return messages;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      if (!item || typeof item !== 'object') continue;

      if (item.type === 'function_call_output') {
        messages.push({
          role: 'tool',
          tool_call_id: item.call_id || 'unknown',
          content: normalizeResponsesContent(item.output || ''),
        });
        continue;
      }

      if (item.type === 'function_call') {
        messages.push({
          role: 'assistant',
          tool_calls: [
            {
              id: item.call_id || item.id || generateCallId('call_'),
              type: 'function',
              function: {
                name: item.name || 'unknown',
                arguments: typeof item.arguments === 'string' ? item.arguments : JSON.stringify(item.arguments || {}),
              },
            },
          ],
        });
        continue;
      }

      if (item.type === 'message' || item.role) {
        messages.push({
          role: item.role || 'user',
          content: normalizeResponsesContent(item.content),
        });
        continue;
      }

      // Fallback: treat an unknown item like the client meant a message
      messages.push({ role: 'user', content: normalizeResponsesContent(item) });
    }
    return messages;
  }

  // Non-string, non-array input
  messages.push({ role: 'user', content: normalizeResponsesContent(input) });
  return messages;
}

function emptyUsage() {
  return { input_tokens: 0, output_tokens: 0, total_tokens: 0 };
}

/**
 * Build a full Responses-API response object from a completed result.
 *
 * - plain text -> `output` = [ message { content: [output_text] } ]
 * - tool calls -> `output` = [ function_call items ] (returned to the client,
 *   which owns tool execution)
 */
function createResponseObject({ id, model, content, parsedOutput }) {
  const output = [];

  if (parsedOutput && parsedOutput.type === 'tool_calls') {
    for (const call of parsedOutput.toolCalls) {
      output.push({
        type: 'function_call',
        id: generateCallId('fc_'),
        call_id: generateCallId('call_'),
        name: call.name,
        arguments: typeof call.arguments === 'string' ? call.arguments : JSON.stringify(call.arguments || {}),
        status: 'completed',
      });
    }
  } else {
    output.push({
      type: 'message',
      id: generateCallId('msg_'),
      status: 'completed',
      role: 'assistant',
      content: [{ type: 'output_text', text: content || '', annotations: [] }],
    });
  }

  return {
    id,
    object: 'response',
    created_at: Math.floor(Date.now() / 1000),
    status: 'completed',
    model,
    output,
    usage: emptyUsage(),
  };
}

function writeResponseSse(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/**
 * Emit the full Responses-API SSE event sequence for a completed result.
 *
 * Because tool calls must be detected before we can decide how to render
 * the output, `/v1/responses` always resolves the upstream call first, then
 * replays the result as SSE. This trades true token-by-token streaming for
 * correct tool handling (which is what Codex needs).
 */
function writeResponseStream(res, { id, model, content, parsedOutput }) {
  const responseBase = {
    id,
    object: 'response',
    created_at: Math.floor(Date.now() / 1000),
    status: 'in_progress',
    model,
    output: [],
    usage: emptyUsage(),
  };

  writeResponseSse(res, 'response.created', { type: 'response.created', response: responseBase });
  writeResponseSse(res, 'response.in_progress', { type: 'response.in_progress', response: responseBase });

  if (parsedOutput && parsedOutput.type === 'tool_calls') {
    // Emit one function_call output item per call
    parsedOutput.toolCalls.forEach((call, i) => {
      const item = {
        type: 'function_call',
        id: generateCallId('fc_'),
        call_id: generateCallId('call_'),
        name: call.name,
        arguments: typeof call.arguments === 'string' ? call.arguments : JSON.stringify(call.arguments || {}),
        status: 'in_progress',
      };
      writeResponseSse(res, 'response.output_item.added', {
        type: 'response.output_item.added',
        output_index: i,
        item,
      });
      const done = { ...item, status: 'completed' };
      writeResponseSse(res, 'response.output_item.done', {
        type: 'response.output_item.done',
        output_index: i,
        item: done,
      });
    });
  } else {
    const msgId = generateCallId('msg_');
    writeResponseSse(res, 'response.output_item.added', {
      type: 'response.output_item.added',
      output_index: 0,
      item: { type: 'message', id: msgId, status: 'in_progress', role: 'assistant', content: [] },
    });
    writeResponseSse(res, 'response.content_part.added', {
      type: 'response.content_part.added',
      item_id: msgId,
      output_index: 0,
      content_index: 0,
      part: { type: 'output_text', text: '', annotations: [] },
    });
    if (content) {
      writeResponseSse(res, 'response.output_text.delta', {
        type: 'response.output_text.delta',
        item_id: msgId,
        output_index: 0,
        content_index: 0,
        delta: content,
      });
    }
    writeResponseSse(res, 'response.output_text.done', {
      type: 'response.output_text.done',
      item_id: msgId,
      output_index: 0,
      content_index: 0,
      text: content || '',
    });
    writeResponseSse(res, 'response.content_part.done', {
      type: 'response.content_part.done',
      item_id: msgId,
      output_index: 0,
      content_index: 0,
      part: { type: 'output_text', text: content || '', annotations: [] },
    });
    writeResponseSse(res, 'response.output_item.done', {
      type: 'response.output_item.done',
      output_index: 0,
      item: {
        type: 'message',
        id: msgId,
        status: 'completed',
        role: 'assistant',
        content: [{ type: 'output_text', text: content || '', annotations: [] }],
      },
    });
  }

  writeResponseSse(res, 'response.completed', {
    type: 'response.completed',
    response: createResponseObject({ id, model, content, parsedOutput }),
  });
}

module.exports = {
  createResponseObject,
  normalizeResponsesContent,
  responsesInputToMessages,
  writeResponseSse,
  writeResponseStream,
};
