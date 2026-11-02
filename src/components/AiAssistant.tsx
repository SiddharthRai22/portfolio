import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { 
  X, 
  ArrowUp, 
  ArrowRight, 
  User, 
  RotateCcw, 
  Copy, 
  Check, 
  Sparkle,
  Mail,
  Phone,
  Github,
  Linkedin,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import leftBranch from '@/assets/images/left_branch.png';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// Botanical leaf icon — outlined with veins, matching the reference design exactly
export const AutumnLeafIcon = ({
  className = 'w-5 h-5',
  color = '#B9570A',
}: {
  className?: string;
  color?: string;
}) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Main leaf body */}
    <path
      d="M16 28C16 28 4 22 4 12C4 7 8 3 13 3C15 3 17 4 18.5 5.5C20 4 22 3 24 4C27 5.5 28 9 27 12C25 18 20 22 16 28Z"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Central vein / stem */}
    <path
      d="M16 28L16 10"
      stroke={color}
      strokeWidth="1.3"
      strokeLinecap="round"
    />
    {/* Left veins */}
    <path d="M16 14L10 11" stroke={color} strokeWidth="1" strokeLinecap="round" />
    <path d="M16 18L8 16" stroke={color} strokeWidth="1" strokeLinecap="round" />
    <path d="M16 22L11 21" stroke={color} strokeWidth="1" strokeLinecap="round" />
    {/* Right veins */}
    <path d="M16 14L22 11" stroke={color} strokeWidth="1" strokeLinecap="round" />
    <path d="M16 18L23 15" stroke={color} strokeWidth="1" strokeLinecap="round" />
    <path d="M16 22L21 20" stroke={color} strokeWidth="1" strokeLinecap="round" />
  </svg>
);

// Decorative maple leaf illustration for borders matching reference image
export const DecorativeMapleLeaf = ({
  className = 'w-10 h-10',
  rotation = 0,
  opacity = 0.9,
}: {
  className?: string;
  rotation?: number;
  opacity?: number;
}) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    style={{ transform: `rotate(${rotation}deg)`, opacity }}
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="maple-leaf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#C44B12" />
        <stop offset="45%" stopColor="#A83908" />
        <stop offset="85%" stopColor="#812403" />
        <stop offset="100%" stopColor="#5E1602" />
      </linearGradient>
      <filter id="leaf-shadow" x="-20%" y="-20%" width="150%" height="150%">
        <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#321609" floodOpacity="0.25" />
      </filter>
    </defs>
    <g filter="url(#leaf-shadow)">
      <path
        d="M50 12 L53 25 L65 18 L62 30 L76 25 L70 38 L84 37 L74 48 L86 54 L72 61 L78 72 L64 68 L60 80 L52 70 L50 88 L48 70 L40 80 L36 68 L22 72 L28 61 L14 54 L26 48 L16 37 L30 38 L24 25 L38 30 L35 18 L47 25 Z"
        fill="url(#maple-leaf-grad)"
      />
      <path d="M50 88 L50 96" stroke="#481202" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M50 25 L50 88" stroke="#DDA16B" strokeWidth="1.2" strokeOpacity="0.4" />
      <path d="M50 65 L68 45" stroke="#DDA16B" strokeWidth="1" strokeOpacity="0.35" />
      <path d="M50 65 L32 45" stroke="#DDA16B" strokeWidth="1" strokeOpacity="0.35" />
      <path d="M50 48 L72 32" stroke="#DDA16B" strokeWidth="0.9" strokeOpacity="0.3" />
      <path d="M50 48 L28 32" stroke="#DDA16B" strokeWidth="0.9" strokeOpacity="0.3" />
    </g>
  </svg>
);

const SUGGESTED_PROMPTS = [
  'What projects has Siddharth built?',
  'What’s in his tech stack?',
  'How can I contact him?',
  'Tell me about the AI travel planner',
];

const INITIAL_GREETING =
  "Hi! I'm Siddharth AI assistant. I can help you with projects, skills, experience, or anything.";

const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Regex to detect contact items (Email, Phone, GitHub, LinkedIn, etc.)
const CONTACT_LABEL_REGEX = /^(Email|Phone(?:\s*\(India\))?|Phone|GitHub|LinkedIn|Portfolio|Resume|Website)\s*[:：]\s*(.+)$/i;

// Helper to extract plain text from React children to detect contact patterns
function extractRawText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractRawText).join('');
  if (React.isValidElement(node) && node.props && (node.props as any).children) {
    return extractRawText((node.props as any).children);
  }
  return '';
}

// Aligned 2-column contact row renderer
function renderContactRow(label: string, value: string, key?: string | number) {
  let icon = <AutumnLeafIcon className="w-4 h-4 text-[#B9570A]" />;
  const l = label.toLowerCase();
  if (l.includes('email') || l.includes('mail')) {
    icon = <Mail className="w-4 h-4 text-[#B9570A]" />;
  } else if (l.includes('phone') || l.includes('tel')) {
    icon = <Phone className="w-4 h-4 text-[#B9570A]" />;
  } else if (l.includes('github') || l.includes('git')) {
    icon = <Github className="w-4 h-4 text-[#B9570A]" />;
  } else if (l.includes('linkedin')) {
    icon = <Linkedin className="w-4 h-4 text-[#B9570A]" />;
  }

  const trimmed = value.trim();
  let contentNode: React.ReactNode = trimmed;

  const emailMatch = trimmed.match(/^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
  if (emailMatch) {
    contentNode = (
      <a
        href={`mailto:${emailMatch[1]}`}
        className="text-[#b45309] font-medium underline underline-offset-2 hover:text-[#8a3c06] transition-colors break-all [overflow-wrap:anywhere]"
      >
        {emailMatch[1]}
      </a>
    );
  } else {
    const phoneMatch = trimmed.match(/^(\+?[\d\s-]{8,})$/);
    if (phoneMatch) {
      contentNode = (
        <a
          href={`tel:${phoneMatch[1].replace(/\s+/g, '')}`}
          className="text-[#b45309] font-medium hover:text-[#8a3c06] hover:underline transition-colors break-all [overflow-wrap:anywhere]"
        >
          {trimmed}
        </a>
      );
    } else {
      const urlMatch = trimmed.match(/^(https?:\/\/[^\s]+)$/i);
      if (urlMatch) {
        contentNode = (
          <a
            href={urlMatch[1]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#b45309] font-medium underline underline-offset-2 hover:text-[#8a3c06] transition-colors break-all [overflow-wrap:anywhere]"
          >
            <span>{urlMatch[1]}</span>
            <ExternalLink className="w-3 h-3 inline shrink-0 text-[#b45309]/80" />
          </a>
        );
      }
    }
  }

  return (
    <div key={key} className="my-1.5 flex items-start gap-2.5 text-sm leading-relaxed text-[#321609]">
      <span className="shrink-0 mt-1 text-[#B9570A]">{icon}</span>
      <div className="flex-1 min-w-0 flex flex-wrap sm:flex-nowrap items-baseline gap-x-2">
        <span className="font-semibold text-[#240e04] shrink-0 min-w-[95px] sm:min-w-[110px]">
          {label}:
        </span>
        <span className="flex-1 min-w-0 break-all [overflow-wrap:anywhere] text-[#321609]">
          {contentNode}
        </span>
      </div>
    </div>
  );
}

// Markdown Message Renderer with full GFM, tables, links, and contact alignment
export const FormattedAiMessage: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="markdown-content text-sm leading-relaxed text-[#321609] space-y-2 [overflow-wrap:anywhere] break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="font-serif text-[1.2rem] font-bold text-[#240e04] mt-3.5 mb-1.5 leading-snug tracking-tight border-b border-[#E8DACB]/60 pb-1" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="font-serif text-[1.1rem] font-bold text-[#240e04] mt-3 mb-1.5 leading-snug tracking-tight" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="font-serif text-[1.02rem] font-bold text-[#240e04] mt-2.5 mb-1 leading-snug tracking-tight" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="font-serif text-[0.92rem] font-semibold text-[#240e04] mt-2 mb-1" {...props} />
          ),
          p: ({ node, children, ...props }) => {
            const raw = extractRawText(children).trim();
            const contactMatch = raw.match(CONTACT_LABEL_REGEX);
            if (contactMatch) {
              return renderContactRow(contactMatch[1], contactMatch[2]);
            }
            return (
              <p className="mb-2 leading-relaxed text-[#321609] text-[0.91rem] last:mb-0 [overflow-wrap:anywhere] break-words" {...props}>
                {children}
              </p>
            );
          },
          ul: ({ node, ...props }) => (
            <ul className="my-2 space-y-1 pl-0 list-none" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="my-2 space-y-1.5 pl-5 list-decimal text-sm text-[#321609] marker:font-semibold marker:text-[#B9570A]" {...props} />
          ),
          li: ({ node, children, ...props }) => {
            const raw = extractRawText(children).trim();
            const contactMatch = raw.match(CONTACT_LABEL_REGEX);
            if (contactMatch) {
              return (
                <li className="list-none">
                  {renderContactRow(contactMatch[1], contactMatch[2])}
                </li>
              );
            }
            return (
              <li className="my-1.5 flex items-start gap-2 text-sm leading-relaxed text-[#321609]">
                <AutumnLeafIcon className="w-3.5 h-3.5 mt-1 shrink-0 text-[#B9570A]" />
                <div className="flex-1 min-w-0 [overflow-wrap:anywhere] break-words">
                  {children}
                </div>
              </li>
            );
          },
          table: ({ node, ...props }) => (
            <div className="my-3 w-full max-w-full overflow-x-auto rounded-xl border border-[#E2D0BC] bg-[#FAF7EF]/90 shadow-2xs scrollbar-thin">
              <table className="w-full min-w-[480px] border-collapse text-left text-[0.82rem] font-sans" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="border-b border-[#DECDBE] bg-[#F2E5D6] text-[#240e04]" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-[#EFE5D9]" {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-[#FAF4EE]/70 transition-colors" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-3 py-2 text-[0.72rem] font-bold tracking-wider text-[#3e1a0a] uppercase font-mono whitespace-nowrap border-r border-[#E8DACB] last:border-r-0" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-3 py-2 text-[#321609] align-top leading-relaxed text-[0.82rem] border-r border-[#F0E6DA] last:border-r-0 [overflow-wrap:anywhere]" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-[#240e04]" {...props} />
          ),
          a: ({ node, href, children, ...props }) => {
            const isExternal = href?.startsWith('http') || href?.startsWith('//');
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="text-[#b45309] font-medium underline underline-offset-2 hover:text-[#8a3c06] transition-colors break-all [overflow-wrap:anywhere]"
                {...props}
              >
                {children}
                {isExternal && <ExternalLink className="inline-block ml-0.5 w-3 h-3 text-[#b45309]/80 shrink-0" />}
              </a>
            );
          },
          code: ({ node, inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code className="rounded bg-[#E8D7C3]/60 px-1 py-0.5 font-mono text-[0.82em] text-[#B9570A] [overflow-wrap:anywhere]" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <pre className="my-2.5 w-full max-w-full overflow-x-auto rounded-xl border border-[#E2D0BC] bg-[#240e04] p-3 text-[0.8rem] text-[#FAF7EF] font-mono scrollbar-thin">
                <code className="[overflow-wrap:normal]" {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          blockquote: ({ node, ...props }) => (
            <blockquote className="my-2 border-l-2 border-[#B9570A] pl-3 italic text-[#6E462D] text-[0.9rem]" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export const AiAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bubbleVisible, setBubbleVisible] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Handle click outside and Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClickOutside);
    }, 150);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(timer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollToBottom('auto');
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading]);

  // Show speech bubble 1.8s after character slides in,
  // then auto-hide after 7s. Also hide on scroll.
  useEffect(() => {
    if (isOpen) {
      setBubbleVisible(false);
      return;
    }

    // Show after 1.8s
    const showTimer = setTimeout(() => setBubbleVisible(true), 1800);

    // Auto-hide after 1.8s (show delay) + 7s (display duration) = 8.8s total
    const hideTimer = setTimeout(() => setBubbleVisible(false), 8800);

    // Hide on scroll
    const handleScroll = () => setBubbleVisible(false);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isOpen]);
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-ai-assistant', handleOpen);
    return () => window.removeEventListener('open-ai-assistant', handleOpen);
  }, []);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    setInputValue('');

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, history }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch AI response');
      }

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'model',
        text: data.reply || "I couldn't process that response. Please feel free to reach out to Siddharth directly!",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error('AI chat error:', err);
      const errMsg = err?.message || 'Network error occurred.';
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `I had trouble reaching the server: ${errMsg}. Please check your connection or email Siddharth directly at siddharthkumarrai23@gmail.com.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetChat = () => {
    setMessages([]);
  };

  return (
    <>
      {/* ── CARTOON CHARACTER LAUNCHER ──────────────────────────── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            /* Entrance: slide in from right with bounce */
            initial={{ x: 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 120, opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 220, damping: 18, mass: 1 }}
            className="fixed bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end gap-3 select-none"
            style={
              /* Respect prefers-reduced-motion */
              typeof window !== 'undefined' &&
              window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? {}
                : undefined
            }
          >
            {/* Speech bubble */}
            <AnimatePresence>
              {bubbleVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.94, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="relative mr-2 max-w-[210px] sm:max-w-[230px]"
                  onClick={() => setIsOpen(true)}
                  role="button"
                  tabIndex={0}
                  aria-label="Open AI assistant"
                  onKeyDown={(e) => e.key === 'Enter' && setIsOpen(true)}
                >
                  {/* Bubble body */}
                  <div className="cursor-pointer rounded-2xl border border-[#E2D0BC] bg-[#FAF7EF] px-4 py-3 shadow-[0_8px_28px_-6px_rgba(50,22,9,0.18)] hover:shadow-[0_10px_32px_-6px_rgba(180,83,9,0.22)] hover:border-[#C8945A]/60 transition-all duration-200">
                    <p className="font-serif text-[0.88rem] leading-snug text-[#321609]">
                      Hi! 👋 I&apos;m Siddharth AI Assistant. Need help exploring portfolio?
                    </p>
                  </div>

                  {/* Bubble tail pointing right-down toward character */}
                  <div
                    className="absolute -bottom-[9px] right-6 h-0 w-0"
                    style={{
                      borderLeft: '9px solid transparent',
                      borderRight: '9px solid transparent',
                      borderTop: '10px solid #FAF7EF',
                      filter: 'drop-shadow(0 2px 2px rgba(50,22,9,0.10))',
                    }}
                  />
                  {/* Bubble tail border */}
                  <div
                    className="absolute -bottom-[11px] right-[22px] h-0 w-0 -z-10"
                    style={{
                      borderLeft: '11px solid transparent',
                      borderRight: '11px solid transparent',
                      borderTop: '12px solid #E2D0BC',
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Character image button */}
            <motion.button
              type="button"
              onClick={() => setIsOpen(true)}
              aria-label="Open Siddharth's AI Assistant"
              title="Siddharth's AI Assistant"
              /* Idle float animation */
              animate={{ y: [0, -8, 0] }}
              transition={{
                y: {
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  repeatType: 'loop',
                },
              }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.93 }}
              className="relative cursor-pointer focus:outline-none"
            >
              {/* Soft glow ring */}
              <div className="absolute inset-0 rounded-full bg-[#B9570A]/12 blur-xl scale-110 pointer-events-none" />
              {/* Character image */}
              <div className="relative h-20 w-20 sm:h-24 sm:w-24 drop-shadow-[0_12px_24px_rgba(50,22,9,0.22)]">
                <img
                  src="/images/ai-assistant.png"
                  alt="Siddharth's AI Assistant"
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Redesigned AI Chatbot Modal: Centered-right with balanced vertical spacing */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 sm:inset-y-0 sm:left-auto sm:right-6 md:right-8 lg:right-10 z-50 flex items-center justify-center sm:justify-end pointer-events-none p-4 sm:py-6 sm:px-0">
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="pointer-events-auto relative flex h-[min(540px,calc(100vh-4.5rem))] sm:h-[min(570px,calc(100vh-5.5rem))] max-h-[calc(100vh-3rem)] w-full max-w-[min(370px,calc(100vw-2rem))] sm:max-w-[380px] md:max-w-[390px] flex-col overflow-hidden rounded-2xl sm:rounded-[1.75rem] border border-[#E2D3C4] bg-[#FAF7EF] shadow-[0_24px_65px_-12px_rgba(50,22,9,0.25),0_6px_20px_-4px_rgba(50,22,9,0.1)]"
              style={{
                backgroundImage: 'radial-gradient(ellipse at 100% 0%, rgba(235,218,200,0.3) 0%, transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(235,218,200,0.18) 0%, transparent 45%)',
              }}
            >
              {/* Bottom-left autumn foliage branch */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 left-0 z-0 h-[190px] w-[170px] opacity-[0.28] mix-blend-multiply"
              >
                <img
                  src={leftBranch}
                  alt=""
                  className="h-full w-full object-contain object-left-bottom"
                />
              </div>

              {/* ── HEADER ───────────────────────────────────────────── */}
              <div className="relative z-10 flex items-center justify-between border-b border-[#E6D8CB] px-4.5 pt-4 pb-3 bg-[#FAF7EF]">
                {/* Left: Avatar + Title block */}
                <div className="flex items-center gap-2.5">
                  {/* SK circular avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#321609] font-serif text-[0.95rem] font-bold text-[#FAF7EF] shadow-sm tracking-tight select-none">
                    SK
                  </div>
                  {/* Title */}
                  <div className="flex flex-col justify-center">
                    <h3 className="font-serif text-[1.2rem] font-bold leading-tight tracking-tight text-[#240e04]">
                      Siddharth AI
                    </h3>
                  </div>
                </div>

                {/* Right: Reset + Close buttons */}
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={resetChat}
                      title="Reset conversation"
                      aria-label="Reset conversation"
                      className="flex h-7.5 w-7.5 items-center justify-center rounded-full border border-[#D8C6B3] bg-transparent text-[#6E4933] transition-colors hover:border-[#B9570A] hover:text-[#B9570A] cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    title="Close chat"
                    aria-label="Close chat"
                    className="flex h-7.5 w-7.5 items-center justify-center rounded-full border border-[#D8C6B3] bg-transparent text-[#5A3825] transition-colors hover:border-[#321609] hover:bg-[#E8D7C3]/50 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* ── SCROLLABLE CONTENT ───────────────────────────────── */}
              <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain px-4 pt-3.5 pb-2 space-y-3 scrollbar-thin">
                {/* Welcome greeting */}
                <p className="font-serif text-[0.89rem] leading-[1.6] text-[#321609]">
                  {INITIAL_GREETING}
                </p>

                {/* "YOU CAN ASK ME" label + suggestion buttons */}
                <div className="pt-0.5">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Sparkle className="w-3 h-3 fill-[#B9570A] text-[#B9570A] shrink-0" />
                    <span className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.2em] text-[#B9570A]">
                      YOU CAN ASK ME
                    </span>
                  </div>

                  <div className="space-y-2">
                    {SUGGESTED_PROMPTS.map((prompt, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        disabled={isLoading}
                        className="group flex w-full items-center justify-between rounded-xl border border-[#E4D6C5] bg-white/60 px-3.5 py-2.5 text-left transition-all duration-200 hover:border-[#C4864A]/60 hover:bg-[#FEF9F5] hover:shadow-[0_2px_10px_rgba(180,83,9,0.06)] active:scale-[0.99] cursor-pointer disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Botanical leaf icon matching reference */}
                          <AutumnLeafIcon className="w-[18px] h-[18px] shrink-0 group-hover:scale-110 transition-transform duration-200" color="#B9570A" />
                          <span className="font-serif text-[0.86rem] text-[#321609] group-hover:text-[#B9570A] transition-colors leading-snug">
                            {prompt}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#B9570A]/70 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#B9570A]" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat Message History */}
                {messages.length > 0 && (
                  <div className="pt-2 space-y-4">
                    {messages.map((message) => {
                      const isUser = message.role === 'user';
                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25 }}
                          className={cn(
                            'flex items-start gap-2.5',
                            isUser ? 'justify-end' : 'justify-start'
                          )}
                        >
                          {/* SK Avatar for AI response (Left) */}
                          {!isUser && (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#321609] font-serif text-xs font-bold text-[#FAF7EF] shadow-sm">
                              SK
                            </div>
                          )}

                          <div
                            className={cn(
                              'group relative min-w-0 max-w-[86%] sm:max-w-[88%] px-4 py-3 shadow-[0_2px_8px_rgba(50,22,9,0.05)] transition-all overflow-hidden [overflow-wrap:anywhere] break-words',
                              isUser
                                ? 'rounded-[18px] rounded-tr-[4px] border border-[#DBC4AD] bg-[#E8D7C3] text-[#321609]'
                                : 'rounded-[18px] rounded-tl-[4px] border border-[#EADBCC] bg-white/85 text-[#321609]'
                            )}
                          >
                            {isUser ? (
                              <p className="font-serif text-[0.92rem] leading-relaxed text-[#321609] [overflow-wrap:anywhere] break-words">
                                {message.text}
                              </p>
                            ) : (
                              <div className="w-full min-w-0 font-serif leading-relaxed text-[#321609] [overflow-wrap:anywhere] break-words">
                                <FormattedAiMessage content={message.text} />
                              </div>
                            )}

                            {/* Message Footer */}
                            <div className="mt-2 flex items-center justify-between border-t border-[rgba(50,22,9,0.07)] pt-1 text-[0.65rem] text-[#7C5D47]">
                              <span className="font-mono">{formatTime(message.timestamp)}</span>
                              {!isUser && (
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(message.id, message.text)}
                                  aria-label="Copy message"
                                  title="Copy message"
                                  className="flex items-center gap-1 font-mono text-[0.62rem] text-[#8C6C54] hover:text-[#B9570A] opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                                >
                                  {copiedId === message.id ? (
                                    <>
                                      <Check className="h-3 w-3 text-emerald-600" />
                                      <span>Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* User Avatar (Right) */}
                          {isUser && (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8C4318] text-[#FAF7EF] shadow-sm">
                              <User className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Loading Indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5 text-xs text-[#8C5D3D]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#321609] font-serif text-xs font-bold text-[#FAF7EF] shadow-sm">
                      SK
                    </div>
                    <div className="flex items-center gap-2 rounded-[18px] rounded-tl-[4px] border border-[#EADBCC] bg-white/80 px-4 py-2.5">
                      <AutumnLeafIcon className="w-4 h-4 animate-spin" color="#B9570A" />
                      <span className="font-serif text-sm text-[#8C5D3D]">
                        Siddharth AI is thinking...
                      </span>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* ── INPUT BAR ───────────────────────────────────────── */}
              <div className="relative z-10 px-3.5 pb-3.5 pt-2.5 bg-[#FAF7EF]/95 border-t border-[#E6D8CB]">
                <div className="flex items-center gap-2 rounded-full border border-[#DECDBE] bg-white/70 pl-3.5 pr-1 py-1 shadow-[0_2px_8px_rgba(50,22,9,0.05)] focus-within:border-[#B9570A]/60 focus-within:ring-2 focus-within:ring-[#B9570A]/10 transition-all">
                  {/* Botanical leaf icon on left */}
                  <AutumnLeafIcon className="w-[18px] h-[18px] shrink-0" color="#B9570A" />

                  {/* Input field */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about Siddharth..."
                    disabled={isLoading}
                    style={{ outline: 'none', boxShadow: 'none' }}
                    className="flex-1 bg-transparent font-serif text-[0.88rem] text-[#321609] placeholder-[#9A7B65]/60 border-none !outline-none !ring-0 focus:!outline-none focus:!ring-0 focus-visible:!outline-none focus-visible:!ring-0 disabled:opacity-50"
                  />

                  {/* Send button — circular */}
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={!inputValue.trim() || isLoading}
                    aria-label="Send message"
                    className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-[#321609] text-[#FAF7EF] transition-all hover:bg-[#B9570A] disabled:opacity-30 disabled:hover:bg-[#321609] cursor-pointer active:scale-90 shadow-sm"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AiAssistant;
