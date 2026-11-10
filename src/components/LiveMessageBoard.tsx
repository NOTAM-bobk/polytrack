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

export interface ChatMessage {
  id: string;
  from: "user" | "assistant" | "system" | "racer";
  author: string;
  text: string;
  timestamp: string;
  badge?: string;
  color?: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [];

// Extend window for backend hookups
declare global {
  interface Window {
    PolyTrackChat?: {
      addMessage: (msg: Partial<ChatMessage> & { text: string }) => void;
      setMessages: (msgs: ChatMessage[]) => void;
      getMessages: () => ChatMessage[];
      onSend: (cb: (msg: ChatMessage) => void) => void;
      clear: () => void;
      _onSendCallback?: (msg: ChatMessage) => void;
    };
  }
}

export function LiveMessageBoard() {
  const [messages, setMessages] = React.useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("polytrack_chat_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_MESSAGES;
  });

  const [nickname, setNickname] = React.useState(() => {
    return localStorage.getItem("polytrack_nickname") || "Racer_" + Math.floor(100 + Math.random() * 900);
  });
  const [inputText, setInputText] = React.useState("");
  const onSendCallbackRef = React.useRef<((msg: ChatMessage) => void) | null>(null);

  // Expose window.PolyTrackChat for future backend
  React.useEffect(() => {
    window.PolyTrackChat = {
      addMessage: (newMsg) => {
        const fullMsg: ChatMessage = {
          id: newMsg.id || "msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
          from: newMsg.from || "racer",
          author: newMsg.author || "Guest",
          text: newMsg.text,
          timestamp: newMsg.timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          badge: newMsg.badge || "RACER",
          color: newMsg.color || "blue"
        };
        setMessages((prev) => {
          const updated = [...prev, fullMsg];
          try {
            localStorage.setItem("polytrack_chat_history", JSON.stringify(updated.slice(-100)));
          } catch {}
          return updated;
        });
      },
      setMessages: (newMessages) => {
        setMessages(newMessages);
        try {
          localStorage.setItem("polytrack_chat_history", JSON.stringify(newMessages.slice(-100)));
        } catch {}
      },
      getMessages: () => messages,
      onSend: (callback) => {
        onSendCallbackRef.current = callback;
        if (window.PolyTrackChat) {
          window.PolyTrackChat._onSendCallback = callback;
        }
      },
      clear: () => {
        setMessages(INITIAL_MESSAGES);
        localStorage.removeItem("polytrack_chat_history");
      }
    };
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText) return;

    const newMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      from: "user",
      author: nickname.trim() || "You",
      text: cleanText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      badge: "PILOT",
      color: "cyan"
    };

    setMessages((prev) => {
      const next = [...prev, newMsg];
      try {
        localStorage.setItem("polytrack_chat_history", JSON.stringify(next.slice(-100)));
      } catch {}
      return next;
    });

    setInputText("");

    // Trigger backend hook callback if set
    if (typeof onSendCallbackRef.current === "function") {
      onSendCallbackRef.current(newMsg);
    }
  };

  const handleNicknameChange = (val: string) => {
    setNickname(val);
    localStorage.setItem("polytrack_nickname", val);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 rounded-xl bg-zinc-900/30 border border-zinc-800/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-zinc-800 text-zinc-300">
            <Radio className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-medium text-zinc-200">Messages</span>
        </div>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-label="Online" />
      </div>

      {/* Message Scroller Viewport using exact component implementation */}
      <div className="flex-1 min-h-0 relative bg-zinc-950/30">
        <MessageScrollerProvider autoScroll defaultScrollPosition="end">
          <MessageScroller className="size-full">
            <MessageScrollerViewport className="p-3">
              <MessageScrollerContent className="gap-2.5">
                {messages.map((message) => {
                  const isUser = message.from === "user";
                  return (
                    <MessageScrollerItem
                      key={message.id}
                      messageId={message.id}
                      scrollAnchor={isUser}
                      className="transition-all duration-150"
                    >
                      <div
                        className={`flex flex-col ${
                          isUser ? "items-end" : "items-start"
                        }`}
                      >
                        <div className="flex items-center gap-2 px-1 mb-1 text-[10px] text-zinc-500">
                          <span className="font-medium text-zinc-400">{message.author}</span>
                          <span>{message.timestamp}</span>
                        </div>

                        {/* Bubble */}
                        <div
                          className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed break-words shadow-sm ${
                            isUser
                              ? "bg-zinc-100 text-zinc-950 rounded-br-sm"
                              : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-sm"
                          }`}
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

      {/* Composer footer */}
      <form
        onSubmit={handleSendMessage}
        className="p-2.5 border-t border-zinc-800/80 flex items-center gap-1.5 shrink-0"
      >
        <input
          type="text"
          value={nickname}
          onChange={(e) => handleNicknameChange(e.target.value)}
          placeholder="Name"
          title="Your name"
          className="w-20 px-2 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 shrink-0"
        />
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Write a message..."
          className="flex-1 min-w-0 px-2.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          aria-label="Send message"
          className="p-2 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 rounded-lg transition-colors cursor-pointer shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
