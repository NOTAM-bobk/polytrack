"use client";

import * as React from "react";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "@/components/ui/message-scroller";

const messages = [
  { id: "1", from: "assistant", text: "Hi! How can I help you today?" },
  {
    id: "2",
    from: "user",
    text: "I'm building a chat and the scroll behavior keeps jumping around whenever a reply streams in.",
  },
  {
    id: "3",
    from: "assistant",
    text: "MessageScroller anchors new turns near the top and follows streamed replies, so the reader never loses their place.",
  },
  { id: "4", from: "user", text: "That sounds exactly like what I need." },
  {
    id: "5",
    from: "assistant",
    text: "Wrap each row in MessageScrollerItem, mark the turn start with scrollAnchor, and the rest is handled for you.",
  },
];

export default function MessageScrollerDemo() {
  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <MessageScroller className="h-[420px] w-full max-w-md rounded-xl border border-border bg-background">
        <MessageScrollerViewport>
          <MessageScrollerContent className="gap-3 p-4">
            {messages.map((message) => (
              <MessageScrollerItem
                key={message.id}
                messageId={message.id}
                scrollAnchor={message.from === "user"}
              >
                <div
                  className={
                    message.from === "user"
                      ? "ml-auto max-w-[80%] rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground"
                      : "mr-auto max-w-[80%] rounded-2xl bg-muted px-3 py-2 text-sm text-foreground"
                  }
                >
                  {message.text}
                </div>
              </MessageScrollerItem>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
