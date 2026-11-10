import * as React from "react";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller";
import { MessageSquare, Send, Radio, Sparkles } from "lucide-react";

export interface ChatMessage {
  id: string;
  from: "user" | "assistant" | "system" | "racer";
  author: string;
  text: string;
  timestamp: string;
  badge?: string;
  color?: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    from: "assistant",
    author: "RaceControl",
    badge: "SYSTEM",
    color: "amber",
    text: "Welcome to PolyTrack In-Light message scroller. Post your track codes and best times below!",
    timestamp: "10:14 AM"
  },
  {
    id: "msg-2",
    from: "racer",
    author: "ApexApex",
    badge: "RECORD",
    color: "emerald",
    text: "New PB on Track 4: 00:28.42! That chicane jump cut saves nearly 0.7s.",
    timestamp: "10:18 AM"
  },
  {
    id: "msg-3",
    from: "racer",
    author: "DriftKing99",
    badge: "RACER",
    color: "blue",
    text: "Anyone have custom desert track codes for v0.5.0? Looking for good hairpins.",
    timestamp: "10:25 AM"
  },
  {
    id: "msg-4",
    from: "user",
    author: "You",
    badge: "PILOT",
    color: "cyan",
    text: "Try Track 7 with low suspension tuning in v0.5.0, corner grip feels insane.",
    timestamp: "10:30 AM"
  },
  {
    id: "msg-5",
    from: "assistant",
    author: "SpeedBot",
    badge: "BOT",
    color: "purple",
    text: "Message scroller autoScroll is active. Scroll up to inspect history or press the down arrow to jump back to end.",
    timestamp: "10:32 AM"
  }
];

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
    <div className="flex-1 flex flex-col min-h-0 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950/80 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-blue-500/20 text-blue-400">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200 tracking-wide flex items-center gap-1.5">
              <span>IN-LIGHT MESSAGE BOARD</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-950 text-blue-300 border border-blue-500/30">
                REACT SCROLLER
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Live community feed & track codes</div>
          </div>
        </div>

        {/* Backend readiness badge */}
        <div
          title="window.PolyTrackChat API exposed for Supabase/WebSocket backend"
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-[10px] text-slate-300 font-mono"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>API READY</span>
        </div>
      </div>

      {/* Message Scroller Viewport using exact component implementation */}
      <div className="flex-1 min-h-0 relative bg-slate-950/40">
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
                        {/* Author info & timestamp */}
                        <div className="flex items-center gap-1.5 px-1 mb-0.5 text-[10px] font-mono text-slate-400">
                          <span className="font-semibold text-slate-300">
                            {message.author}
                          </span>
                          {message.badge && (
                            <span
                              className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                                message.badge === "SYSTEM"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : message.badge === "RECORD"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : isUser
                                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                  : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              }`}
                            >
                              {message.badge}
                            </span>
                          )}
                          <span>• {message.timestamp}</span>
                        </div>

                        {/* Bubble */}
                        <div
                          className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed break-words shadow-sm ${
                            isUser
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs"
                              : message.badge === "SYSTEM"
                              ? "bg-slate-900 border border-amber-500/30 text-amber-100 rounded-bl-xs"
                              : "bg-slate-800/90 border border-slate-700/60 text-slate-200 rounded-bl-xs"
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
        className="p-2.5 bg-slate-950/90 border-t border-slate-800 flex flex-col gap-1.5 shrink-0"
      >
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={nickname}
            onChange={(e) => handleNicknameChange(e.target.value)}
            placeholder="Nickname"
            title="Your racer callsign"
            className="w-24 px-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-[11px] font-mono text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500 shrink-0"
          />
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message or track code..."
            className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 px-0.5">
          <span>Press Enter to send</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Auto-anchor active
          </span>
        </div>
      </form>
    </div>
  );
}
