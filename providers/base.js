export class ChatProvider {
  // Return an async generator of string chunks
  // stream(messages: Array<{role:'system'|'user'|'assistant', content:string}>)
  stream(_messages) { throw new Error("not implemented"); }
}
