import * as React from "react";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller";
import { Send, Radio } from "lucide-react";
import { HubMessage, loadMessages, sendMessage } from "@/lib/hubApi";

export interface ChatMessage extends HubMessage {
  from: "user" | "assistant" | "system" | "racer";
  timestamp: string;
  badge?: string;
  color?: string;
}

function toChatMessage(message: HubMessage, from: ChatMessage["from"] = "racer"): ChatMessage {
  return {
    ...message,
    from,
    timestamp: new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    badge: from === "user" ? "PILOT" : "RACER",
    color: from === "user" ? "cyan" : "blue",
  };
}

const fallbackMessages = (): ChatMessage[] => {
  try {
    const saved = localStorage.getItem("polytrack_chat_history");
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

declare global {
  interface Window {
    PolyTrackChat?: {
      addMessage: (msg: Partial<ChatMessage> & { text: string }) => void;
      setMessages: (msgs: ChatMessage[]) => void;
      getMessages: () => ChatMessage[];
      onSend: (cb: (msg: ChatMessage) => void) => void;
      clear: () => void;
    };
  }
}

export function LiveMessageBoard() {
  const [messages, setMessages] = React.useState<ChatMessage[]>(fallbackMessages);
  const [nickname, setNickname] = React.useState(() => localStorage.getItem("polytrack_nickname") || `Racer_${Math.floor(100 + Math.random() * 900)}`);
  const [inputText, setInputText] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState("");
  const onSendCallbackRef = React.useRef<((msg: ChatMessage) => void) | null>(null);

  React.useEffect(() => {
    let active = true;
    loadMessages()
      .then((loaded) => {
        if (active) setMessages(loaded.map((message) => toChatMessage(message)));
      })
      .catch(() => {
        if (active) setError("Live chat is offline; messages will retry when you send.");
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    window.PolyTrackChat = {
      addMessage: (newMessage) => {
        const message = toChatMessage({
          id: newMessage.id || `msg-${Date.now()}`,
          createdAt: newMessage.createdAt || new Date().toISOString(),
          author: newMessage.author || "Guest",
          text: newMessage.text,
        }, newMessage.from || "racer");
        setMessages((current) => [...current, message].slice(-100));
      },
      setMessages: (newMessages) => setMessages(newMessages.slice(-100)),
      getMessages: () => messages,
      onSend: (callback) => { onSendCallbackRef.current = callback; },
      clear: () => setMessages([]),
    };
  }, [messages]);

  const handleSendMessage = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText || sending) return;
    setSending(true);
    setError("");
    try {
      const saved = await sendMessage(nickname.trim() || "Guest", cleanText);
      const message = toChatMessage(saved, "user");
      setMessages((current) => [...current, message].slice(-100));
      setInputText("");
      onSendCallbackRef.current?.(message);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  const handleNicknameChange = (value: string) => {
    setNickname(value);
    localStorage.setItem("polytrack_nickname", value);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 rounded-xl bg-zinc-900/30 border border-zinc-800/80 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-zinc-800 text-zinc-300"><Radio className="w-3.5 h-3.5" /></div>
          <span className="text-xs font-medium text-zinc-200">Trackside chat</span>
        </div>
        <span className={`w-1.5 h-1.5 rounded-full ${loading ? "bg-amber-400 animate-pulse" : error ? "bg-red-400" : "bg-emerald-500"}`} aria-label={loading ? "Connecting" : error ? "Offline" : "Online"} />
      </div>

      <div className="flex-1 min-h-0 relative bg-zinc-950/30">
        <MessageScrollerProvider autoScroll defaultScrollPosition="end">
          <MessageScroller className="size-full">
            <MessageScrollerViewport className="p-3">
              <MessageScrollerContent className="gap-2.5">
                {messages.length === 0 && !loading && <p className="py-8 text-center text-xs text-zinc-600">No racers on comms yet. Start the conversation.</p>}
                {loading && <p className="py-8 text-center text-xs text-zinc-600">Connecting to the track...</p>}
                {messages.map((message) => {
                  const isUser = message.from === "user";
                  return (
                    <MessageScrollerItem key={message.id} messageId={message.id} scrollAnchor={isUser} className="transition-all duration-150">
                      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                        <div className="flex items-center gap-2 px-1 mb-1 text-[10px] text-zinc-500"><span className="font-medium text-zinc-400">{message.author}</span><span>{message.timestamp}</span></div>
                        <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed break-words shadow-sm ${isUser ? "bg-zinc-100 text-zinc-950 rounded-br-sm" : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-sm"}`}>{message.text}</div>
                      </div>
                    </MessageScrollerItem>
                  );
                })}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      </div>

      <form onSubmit={handleSendMessage} className="p-2.5 border-t border-zinc-800/80 flex items-center gap-1.5 shrink-0">
        <input type="text" value={nickname} onChange={(event) => handleNicknameChange(event.target.value)} placeholder="Name" title="Your name" maxLength={32} className="w-20 px-2 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 shrink-0" />
        <input type="text" value={inputText} onChange={(event) => setInputText(event.target.value)} placeholder="Write a message..." maxLength={280} aria-label="Message" className="flex-1 min-w-0 px-2.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600" />
        <button type="submit" disabled={!inputText.trim() || sending} aria-label="Send message" className="p-2 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 rounded-lg transition-colors cursor-pointer shrink-0"><Send className="w-3.5 h-3.5" /></button>
      </form>
      {error && <p className="px-3 pb-2 text-[10px] text-amber-400">{error}</p>}
    </div>
  );
}
