import * as React from "react";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller";
import { Send, Radio, RefreshCw, AlertTriangle } from "lucide-react";
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

const LOCAL_SENT_MESSAGES_KEY = "polytrack_sent_messages";

function readStoredMessages(key: string): ChatMessage[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (message): message is ChatMessage =>
        !!message &&
        typeof message.id === "string" &&
        typeof message.createdAt === "string" &&
        typeof message.author === "string" &&
        typeof message.text === "string" &&
        typeof message.from === "string"
    );
  } catch {
    return [];
  }
}

function loadLocalSentMessages(): ChatMessage[] {
  return readStoredMessages(LOCAL_SENT_MESSAGES_KEY);
}

function mergeMessages(...groups: ChatMessage[][]): ChatMessage[] {
  const unique = new Map<string, ChatMessage>();
  for (const message of groups.flat()) unique.set(message.id, message);
  return [...unique.values()]
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .slice(-100);
}

function persistSentMessage(message: ChatMessage) {
  try {
    const saved = mergeMessages(loadLocalSentMessages(), [message]);
    localStorage.setItem(LOCAL_SENT_MESSAGES_KEY, JSON.stringify(saved));
  } catch {
    // Private browsing or full storage must not block sending a chat message.
  }
}

const fallbackMessages = (): ChatMessage[] =>
  mergeMessages(readStoredMessages("polytrack_chat_history"), loadLocalSentMessages());

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

const CHIP_STYLE: React.CSSProperties = {
  borderRadius: 36,
  background: "rgba(255, 255, 255, 0.04)",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.02), inset 0 1px 0 0 rgba(255, 255, 255, 0.04)",
};

export function LiveMessageBoard() {
  const [messages, setMessages] = React.useState<ChatMessage[]>(fallbackMessages);
  const [nickname, setNickname] = React.useState(() => localStorage.getItem("polytrack_nickname") || `Racer_${Math.floor(100 + Math.random() * 900)}`);
  const [inputText, setInputText] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState("");
  const [refreshing, setRefreshing] = React.useState(false);
  const onSendCallbackRef = React.useRef<((msg: ChatMessage) => void) | null>(null);

  const refreshMessages = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const loaded = await loadMessages();
      setMessages(
        mergeMessages(
          loaded.map((message) => toChatMessage(message)),
          loadLocalSentMessages()
        )
      );
      setError("");
    } catch {
      setError("Chat is offline. Check your connection, then retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshMessages();
  }, [refreshMessages]);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshMessages();
    }, 45_000);
    return () => window.clearInterval(interval);
  }, [refreshMessages]);

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
      persistSentMessage(message);
      setMessages((current) => mergeMessages(current, [message]));
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

  const remainingChars = 280 - inputText.length;

  return (
    <div
      className="solid-3d-panel flex-1 flex flex-col min-h-0 overflow-hidden"
      style={{
        background: "#1d1d1d",
        borderRadius: 20,
        boxShadow:
          "inset 0 0 0 1px rgba(44,47,54,0.52), inset 0 0 50px 0 rgba(255,255,255,0.02), 0 14px 30px -8px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <div style={CHIP_STYLE} className="p-1.5 text-zinc-300">
            <Radio aria-hidden="true" className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-zinc-200">Chat</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void refreshMessages()}
            disabled={refreshing}
            title="Refresh chat"
            aria-label="Refresh chat"
            style={CHIP_STYLE}
            className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <RefreshCw aria-hidden="true" className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <span role="status" className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`w-1.5 h-1.5 rounded-full ${
                loading ? "bg-amber-400 animate-pulse" : error ? "bg-red-400" : "bg-emerald-500"
              }`}
            />
            <span className="text-[10px] font-medium text-zinc-500">
              {loading ? "Connecting…" : error ? "Offline" : "Live"}
            </span>
          </span>
        </div>
      </div>

      <div
        className="flex-1 min-h-0 relative"
        style={{
          background: "rgba(0, 0, 0, 0.18)",
          boxShadow: "inset 0 1px 4px rgba(0, 0, 0, 0.3)",
        }}
      >
        <MessageScrollerProvider autoScroll defaultScrollPosition="end">
          <MessageScroller className="size-full">
            <MessageScrollerViewport className="p-3">
              <MessageScrollerContent className="gap-2.5">
                {messages.length === 0 && !loading && !error && (
                  <p className="px-4 py-8 text-center text-xs leading-relaxed text-zinc-500">
                    No messages yet. Say hello to start the chat.
                  </p>
                )}
                {loading && (
                  <p className="py-8 text-center text-xs text-zinc-500">Connecting to chat…</p>
                )}
                {messages.map((message) => {
                  const isUser = message.from === "user";
                  return (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={message.id}
                      scrollAnchor={isUser}
                      className="transition-all duration-150"
                    >
                      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                        <div className="flex items-center gap-2 px-1 mb-1 text-[10px] text-zinc-400">
                          <span className="font-medium text-zinc-300">{message.author}</span>
                          <span className="text-zinc-500">{message.timestamp}</span>
                        </div>
                        <div
                          className={`max-w-[88%] px-3 py-2 text-xs leading-relaxed break-words shadow-sm ${
                            isUser
                              ? "bg-white text-zinc-950 rounded-2xl rounded-br-sm font-medium"
                              : "text-[#caccd2] rounded-2xl rounded-bl-sm"
                          }`}
                          style={
                            isUser
                              ? {
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                                }
                              : {
                                  background: "rgba(255, 255, 255, 0.05)",
                                  boxShadow:
                                    "inset 0 0 0 1px rgba(255, 255, 255, 0.04), 0 2px 6px rgba(0, 0, 0, 0.2)",
                                }
                          }
                        >
                          {message.text}
                        </div>
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

      {error && (
        <div
          role="status"
          className="mx-2.5 mb-2 flex items-center gap-2 rounded-xl bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-200 sm:mx-3"
        >
          <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 leading-snug">{error}</span>
          <button
            type="button"
            onClick={() => void refreshMessages()}
            className="shrink-0 cursor-pointer rounded-full bg-amber-400/15 px-2 py-0.5 font-medium text-amber-100 transition-colors hover:bg-amber-400/25"
          >
            Retry
          </button>
        </div>
      )}

      <form
        onSubmit={handleSendMessage}
        className="p-2.5 sm:p-3 border-t border-white/[0.06] flex items-center gap-2 shrink-0"
      >
        <label htmlFor="chat-name" className="sr-only">
          Your display name
        </label>
        <input
          id="chat-name"
          type="text"
          value={nickname}
          onChange={(event) => handleNicknameChange(event.target.value)}
          placeholder="Your name…"
          title="Your name"
          maxLength={32}
          autoComplete="nickname"
          spellCheck={false}
          style={{
            ...CHIP_STYLE,
            borderRadius: 14,
            background: "rgba(255, 255, 255, 0.03)",
          }}
          className="w-[5.5rem] shrink-0 px-2.5 py-2 text-[11px] text-[#caccd2] placeholder-zinc-500"
        />
        <label htmlFor="chat-message" className="sr-only">
          Message
        </label>
        <input
          id="chat-message"
          type="text"
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          placeholder="Write a message…"
          maxLength={280}
          enterKeyHint="send"
          autoComplete="off"
          aria-describedby={remainingChars <= 40 ? "chat-char-count" : undefined}
          style={{
            ...CHIP_STYLE,
            borderRadius: 14,
            background: "rgba(255, 255, 255, 0.03)",
          }}
          className="flex-1 min-w-0 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500"
        />
        {remainingChars <= 40 && (
          <span
            id="chat-char-count"
            aria-live="polite"
            className="shrink-0 text-[10px] tabular-nums text-zinc-500"
          >
            {remainingChars}
          </span>
        )}
        <button
          type="submit"
          disabled={!inputText.trim() || sending}
          aria-label={sending ? "Sending message" : "Send message"}
          style={{
            ...CHIP_STYLE,
            borderRadius: 14,
          }}
          className="flex items-center justify-center w-8 h-8 text-zinc-200 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
        >
          <Send aria-hidden="true" className={`w-3.5 h-3.5 ${sending ? "animate-pulse" : ""}`} />
        </button>
      </form>
    </div>
  );
}
