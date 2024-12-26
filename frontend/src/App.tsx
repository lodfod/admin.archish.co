import { RawBlogPost } from "./utils/blogTypes";
import { useState, useCallback, useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import BubbleMenu from "@tiptap/extension-bubble-menu";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";

import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { generateSummary } from "./utils/generateSummary";
const LIMIT = 1000;

const DUMMY_ARTICLES: RawBlogPost[] = [
  {
    id: "1",
    title: "Getting Started with React",
    date: "2024-03-20",
    markdown: `
      <p>This is where the content would go...</p>
    `,
    summary: "An introduction to React and its core concepts",
  },
  {
    id: "2",
    title: "Understanding TypeScript",
    date: "2024-03-19",
    markdown: `
      <p>This is where the content would go...</p>
    `,
    summary: "Deep dive into TypeScript fundamentals",
  },
  {
    id: "3",
    title: "Mastering Tailwind CSS",
    date: "2024-03-18",
    markdown: `
      <p>This is where the content would go...</p>
    `,
    summary: "Learn how to build beautiful interfaces with Tailwind",
  },
];

// Create a persistent atom that syncs with localStorage
const articlesAtom = atomWithStorage<RawBlogPost[]>("articles", DUMMY_ARTICLES);

// Add new type for trash items
interface TrashItem extends RawBlogPost {
  deletedAt: string;
}

// Add new atom for trash
const trashAtom = atomWithStorage<TrashItem[]>("trash", []);

// Add this outside the App component
const hashPassword = (input: string): string => {
  return btoa(input.split("").reverse().join("")).slice(5, 15);
};

// Replace isDarkMode state with atom
const darkModeAtom = atomWithStorage("darkMode", false);

function App() {
  const [isDarkMode, setIsDarkMode] = useAtom(darkModeAtom);
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [articles, setArticles] = useAtom(articlesAtom);
  const [currentArticle, setCurrentArticle] = useState<RawBlogPost | null>(
    null
  );
  const [title, setTitle] = useState("");
  const [articleToDelete, setArticleToDelete] = useState<RawBlogPost | null>(
    null
  );
  const [trash, setTrash] = useAtom(trashAtom);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: "Start writing your article here...",
        emptyEditorClass:
          "before:content-[attr(placeholder)] before:float-left before:text-[#adb5bd] before:h-0 before:pointer-events-none",
      }),
      CharacterCount.configure({
        limit: LIMIT,
      }),
      BubbleMenu.configure({
        shouldShow: ({ editor }) => {
          return (
            editor.isActive("link") ||
            editor.view.state.selection.content().size > 0
          );
        },
      }),
    ],
    content: currentArticle?.markdown || "",
    editorProps: {
      attributes: {
        class: `prose prose-xs  m-5 focus:outline-none ${
          isDarkMode
            ? "text-white placeholder:text-gray-400"
            : "text-slate-900 placeholder:text-slate-400"
        }`,
      },
    },
    onUpdate: ({ editor }) => {
      if (currentArticle) {
        const newContent = editor.getHTML();
        setArticles((prev) =>
          prev.map((article) =>
            article.id === currentArticle.id
              ? { ...article, markdown: newContent }
              : article
          )
        );
      }
    },
  });

  const percentage = editor
    ? Math.round((100 / LIMIT) * editor.storage.characterCount.characters())
    : 0;

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX;
        if (newWidth >= 200 && newWidth <= 600) {
          // Min and max width constraints
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  // Add and remove event listeners
  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const createNewArticle = useCallback(() => {
    const newArticle: RawBlogPost = {
      id: crypto.randomUUID(),
      title: "New Article",
      date: new Date().toISOString().split("T")[0],
      markdown: "",
      summary: "",
    };
    setArticles((prev) => [newArticle, ...prev]);
    setCurrentArticle(newArticle);
    setTitle("New Article");
    if (editor) {
      editor.commands.setContent("");
    }
    setIsMobileMenuOpen(false);
  }, [editor]);

  const handleArticleSelect = useCallback(
    (article: RawBlogPost) => {
      setCurrentArticle(article);
      setTitle(article.title);
      if (editor) {
        editor.commands.setContent(article.markdown);
      }
      // Update URL when selecting article
      window.history.pushState({}, "", `/article/${article.id}`);
      setIsMobileMenuOpen(false);
    },
    [editor]
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);

    if (currentArticle) {
      setArticles((prev) =>
        prev.map((article) =>
          article.id === currentArticle.id
            ? { ...article, title: newTitle }
            : article
        )
      );
      setCurrentArticle((prev) => (prev ? { ...prev, title: newTitle } : null));
    }
  };

  const handleDeleteClick = useCallback(
    (article: RawBlogPost, e: React.MouseEvent) => {
      e.stopPropagation();
      const trashItem: TrashItem = {
        ...article,
        deletedAt: new Date().toISOString(),
      };

      setTrash((prev) => [...prev, trashItem]);
      setArticles((prev) => prev.filter((a) => a.id !== article.id));

      if (currentArticle?.id === article.id) {
        setCurrentArticle(null);
        setTitle("");
        if (editor) {
          editor.commands.setContent("");
        }
      }
    },
    [currentArticle, editor]
  );

  const handlePermanentDelete = useCallback((article: TrashItem) => {
    setArticleToDelete(article);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (articleToDelete) {
      setTrash((prev) => prev.filter((item) => item.id !== articleToDelete.id));
    }
    setArticleToDelete(null);
  }, [articleToDelete]);

  const handleRestore = useCallback((article: TrashItem) => {
    setArticles((prev) => [{ ...article }, ...prev]);
    setTrash((prev) => prev.filter((item) => item.id !== article.id));
  }, []);

  useEffect(() => {
    const cleanupTrash = () => {
      const now = new Date();
      setTrash((prev) =>
        prev.filter((item) => {
          const deletedDate = new Date(item.deletedAt);
          const daysDiff =
            (now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff <= 3;
        })
      );
    };

    // Run cleanup on mount and every hour
    cleanupTrash();
    const interval = setInterval(cleanupTrash, 1000 * 60 * 60); // Every hour

    return () => clearInterval(interval);
  }, []);

  // Update keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log("Key pressed:", e.key, {
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        key: e.key,
      });

      // Check for Command + Control + P
      if (e.metaKey && e.ctrlKey && e.key.toLowerCase() === "p") {
        console.log("Command + Control + P pressed");
        e.preventDefault();
        e.stopPropagation();
        createNewArticle();
        return false;
      }
    };

    console.log("Setting up keyboard listener");
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      console.log("Cleaning up keyboard listener");
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [createNewArticle]);

  const handleExport = async () => {
    if (!currentArticle || !editor) return;

    try {
      // Get HTML content from editor
      const htmlContent = editor.getHTML();

      // Strip HTML tags for summary generation
      const plainText = htmlContent.replace(/<[^>]*>/g, "");
      console.log("Stripped content:", plainText);

      // Generate summary
      const summary = await generateSummary(plainText);
      console.log("Generated summary:", summary);

      // Create full blog post object with renamed markdown key
      const { markdown, ...rest } = currentArticle;
      const blogPost = {
        ...rest,
        content: htmlContent, // Renamed from markdown to content
        summary,
        lastModified: new Date().toISOString(),
      };
      console.log("Blog post:", blogPost);

      // Create and download file
      const blob = new Blob([JSON.stringify(blogPost, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      // Append and click download link
      const a = document.createElement("a");
      a.href = url;
      a.download = `${blogPost.title.toLowerCase().replace(/\s+/g, "-")}.json`;

      // Append to DOM
      document.body.appendChild(a);

      // Trigger download
      a.click();

      // Cleanup
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100); // Delay URL revocation slightly
    } catch (error) {
      console.error("Error exporting article:", error);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      hashPassword(password) === hashPassword(import.meta.env.VITE_APP_PASSWORD)
    ) {
      setIsAuthenticated(true);
      localStorage.setItem("auth", "true");
    } else {
      setPassword("");
    }
  };

  // Check for existing auth
  useEffect(() => {
    if (localStorage.getItem("auth") === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  // Add back URL-based routing
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/article\/(.+)$/);
    if (match) {
      const articleId = match[1];
      const article = articles.find((a) => a.id === articleId);
      if (article) {
        setCurrentArticle(article);
        setTitle(article.title);
        if (editor) {
          editor.commands.setContent(article.markdown);
        }
      } else {
        window.history.pushState({}, "", "/");
      }
    }
  }, [articles, editor]);

  // Add handler for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/article\/(.+)$/);
      if (match) {
        const articleId = match[1];
        const article = articles.find((a) => a.id === articleId);
        if (article) {
          setCurrentArticle(article);
          setTitle(article.title);
          if (editor) {
            editor.commands.setContent(article.markdown);
          }
        }
      } else {
        setCurrentArticle(null);
        setTitle("");
        if (editor) {
          editor.commands.setContent("");
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [articles, editor]);

  if (!isAuthenticated) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center ${
          isDarkMode
            ? "bg-gradient-to-br from-slate-950 to-slate-800"
            : "bg-white"
        }`}
      >
        <h1 className="text-2xl font-bold font-serif mb-4">Welcome, Admin!</h1>
        <p className="text-lg mb-4">This page is protected.</p>
        <form onSubmit={handlePasswordSubmit} className="w-full max-w-xs">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full px-4 py-2 rounded-lg mb-4 ${
              isDarkMode
                ? "bg-slate-800 text-white border-slate-700"
                : "bg-white text-slate-900 border-slate-200"
            } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="Enter password"
            autoFocus
          />
          <button
            type="submit"
            className={`w-full px-4 py-2 rounded-lg ${
              isDarkMode
                ? "bg-slate-700 text-white hover:bg-slate-600"
                : "bg-slate-200 text-slate-900 hover:bg-slate-300"
            } transition-colors`}
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      className={`flex h-screen  ${
        isDarkMode
          ? "bg-gradient-to-br from-slate-950 to-slate-800"
          : "bg-white"
      }`}
    >
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className={`lg:hidden fixed top-4 left-4 z-20 px-2 py-1 rounded-full 
          ${
            isDarkMode
              ? "bg-slate-800 text-white"
              : "bg-slate-100 text-slate-900"
          } 
          hover:opacity-80 transition-colors`}
      >
        {isMobileMenuOpen ? "✕" : "☰"}
      </button>

      {/* Desktop Sidebar Toggle */}
      <button
        onClick={() => setIsSidebarVisible(!isSidebarVisible)}
        className={`hidden lg:block fixed top-4 left-4 z-20 px-2 py-1 rounded-full 
          ${
            isDarkMode
              ? "bg-slate-800 text-white"
              : "bg-slate-100 text-slate-900"
          } 
          hover:opacity-80 transition-colors`}
      >
        {isSidebarVisible ? "✕" : "☰"}
      </button>

      {/* Sidebar - Only render on desktop when visible or when mobile menu is open */}
      {((window.matchMedia("(min-width: 1024px)").matches &&
        isSidebarVisible) ||
        isMobileMenuOpen) && (
        <div
          style={{
            width: isMobileMenuOpen ? "100%" : sidebarWidth,
          }}
          className={`
            fixed lg:relative
            h-full
            transition-transform duration-300 ease-in-out
            ${
              isMobileMenuOpen
                ? "translate-x-0"
                : "-translate-x-full lg:translate-x-0"
            }
            flex-shrink-0 relative
            ${
              isDarkMode
                ? "bg-gradient-to-br from-slate-950 to-slate-800 border-slate-800"
                : "bg-white border-slate-200"
            } border-r
            z-10
          `}
        >
          <div className="p-4 pt-20">
            <div className="flex justify-between items-center ">
              <h2
                className={`text-xl p-3 font-bold font-serif ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                My Articles
              </h2>
              <button
                onClick={createNewArticle}
                className={`px-4 text-xl font-medium py-2 rounded-lg ${
                  isDarkMode
                    ? " text-white hover:bg-slate-600"
                    : " text-slate-900 hover:bg-slate-300"
                } transition-colors`}
              >
                +
              </button>
            </div>
            <div className="space-y-1">
              {articles.map((article, index) => (
                <div key={article.id}>
                  <div
                    onClick={() => handleArticleSelect(article)}
                    className={`p-3 transition-colors cursor-pointer relative group ${
                      isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
                    } ${
                      currentArticle?.id === article.id
                        ? isDarkMode
                          ? "bg-slate-800"
                          : "bg-slate-100"
                        : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3
                          className={`font-serif font-bold ${
                            isDarkMode ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {article.title}
                        </h3>
                        <p
                          className={`text-sm font-medium ${
                            isDarkMode ? "text-white/70" : "text-slate-500"
                          }`}
                        >
                          {article.date}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteClick(article, e)}
                        className={`p-2 text-xl rounded-lg opacity-0 group-hover:opacity-100 hover:text-red-500  transition-all ${
                          isDarkMode ? "text-white" : "text-slate-600"
                        }`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  {index < articles.length - 1 && (
                    <div
                      className={`mx-3 border-t ${
                        isDarkMode ? "border-slate-700" : "border-slate-200"
                      }`}
                    />
                  )}
                </div>
              ))}

              {/* Trash section */}
              {trash.length > 0 && (
                <>
                  <div
                    className={`pt-10 font-serif  mb-2 px-3 font-bold ${
                      isDarkMode ? "text-white/70" : "text-slate-500"
                    }`}
                  >
                    Trash
                  </div>
                  {trash.map((article, index) => (
                    <div key={article.id}>
                      <div
                        className={`p-3 transition-colors cursor-pointer relative group ${
                          isDarkMode
                            ? "hover:bg-slate-800"
                            : "hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3
                              className={`font-serif font-bold ${
                                isDarkMode ? "text-white/50" : "text-slate-500"
                              }`}
                            >
                              {article.title}
                            </h3>
                            <p
                              className={`text-sm font-medium ${
                                isDarkMode ? "text-white/30" : "text-slate-400"
                              }`}
                            >
                              {article.date}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleRestore(article)}
                              className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-green-500 hover:text-white transition-all ${
                                isDarkMode ? "text-white" : "text-slate-600"
                              }`}
                            >
                              ↩
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(article)}
                              className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all ${
                                isDarkMode ? "text-white" : "text-slate-600"
                              }`}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </div>
                      {index < trash.length - 1 && (
                        <div
                          className={`mx-3 border-t ${
                            isDarkMode ? "border-slate-700" : "border-slate-200"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Resize Handle - only show and work on desktop */}
          {window.innerWidth >= 1024 && (
            <div
              onMouseDown={startResizing}
              className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize
                hover:bg-slate-500/50 transition-colors
                ${isResizing ? "bg-slate-500/50" : ""}`}
            />
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Dark Mode Toggle, Export Button, and Lock */}
        <div className="fixed lg:absolute top-4 right-4 flex gap-2 z-20">
          {currentArticle && (
            <button
              onClick={handleExport}
              className={`px-4 py-2 rounded-full ${
                isDarkMode
                  ? "bg-slate-800 text-white hover:bg-slate-700"
                  : "bg-slate-100 text-slate-900 hover:bg-slate-200"
              } transition-colors`}
            >
              Export
            </button>
          )}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-full
              ${
                isDarkMode
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-900"
              } 
              hover:opacity-80 transition-colors`}
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("auth");
              setIsAuthenticated(false);
            }}
            className={`p-2 rounded-full
              ${
                isDarkMode
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-900"
              } 
              hover:opacity-80 transition-colors`}
          >
            🔒
          </button>
        </div>

        {/* Editor Container */}
        <div className="h-full flex flex-col">
          {currentArticle ? (
            <>
              {/* Title Input */}
              <div className="pt-14 lg:pt-0 px-4 flex justify-between items-center">
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="New Article"
                  className={`w-full pt-20 font-serif text-xl lg:text-2xl font-bold outline-none bg-transparent
                    ${
                      isDarkMode
                        ? "text-white border-slate-700 placeholder:text-slate-500"
                        : "text-slate-900 border-slate-200 placeholder:text-slate-400"
                    } focus:border-slate-500`}
                />
              </div>

              {/* Editor Area */}
              <div
                className={`flex-1 overflow-auto relative 
                ${
                  isDarkMode
                    ? "prose-invert prose-p:text-white prose-a:text-white prose-a:hover:underline prose-headings:text-white prose-a:hover:text-white prose-strong:text-white"
                    : "prose-slate"
                }
                prose max-w-none`}
              >
                {editor && (
                  <TiptapBubbleMenu
                    editor={editor}
                    tippyOptions={{ duration: 100 }}
                    className={`flex overflow-hidden rounded-lg shadow-lg ${
                      isDarkMode ? "bg-slate-800" : "bg-white"
                    }`}
                  >
                    <div className="flex divide-x divide-gray-200">
                      <div className="flex">
                        <button
                          onClick={() =>
                            editor.chain().focus().toggleBold().run()
                          }
                          className={`p-2 ${
                            editor.isActive("bold")
                              ? isDarkMode
                                ? "bg-slate-700 text-white"
                                : "bg-slate-100 text-slate-900"
                              : isDarkMode
                              ? "text-white hover:bg-slate-700"
                              : "text-slate-900 hover:bg-slate-100"
                          }`}
                        >
                          <strong>B</strong>
                        </button>
                        <button
                          onClick={() =>
                            editor.chain().focus().toggleItalic().run()
                          }
                          className={`p-2 ${
                            editor.isActive("italic")
                              ? isDarkMode
                                ? "bg-slate-700 text-white"
                                : "bg-slate-100 text-slate-900"
                              : isDarkMode
                              ? "text-white hover:bg-slate-700"
                              : "text-slate-900 hover:bg-slate-100"
                          }`}
                        >
                          <em>I</em>
                        </button>
                        <button
                          onClick={() =>
                            editor.chain().focus().toggleUnderline().run()
                          }
                          className={`p-2 ${
                            editor.isActive("underline")
                              ? isDarkMode
                                ? "bg-slate-700 text-white"
                                : "bg-slate-100 text-slate-900"
                              : isDarkMode
                              ? "text-white hover:bg-slate-700"
                              : "text-slate-900 hover:bg-slate-100"
                          }`}
                        >
                          <u>U</u>
                        </button>
                      </div>
                      <div className="flex">
                        <button
                          onClick={() => {
                            const previousUrl =
                              editor.getAttributes("link").href;
                            const url = window.prompt("URL", previousUrl);

                            if (url === null) {
                              return; // Cancelled
                            }

                            if (url === "") {
                              editor.chain().focus().unsetLink().run();
                              return;
                            }

                            editor.chain().focus().setLink({ href: url }).run();
                          }}
                          className={`p-2 ${
                            editor.isActive("link")
                              ? isDarkMode
                                ? "bg-slate-700 text-white"
                                : "bg-slate-100 text-slate-900"
                              : isDarkMode
                              ? "text-white hover:bg-slate-700"
                              : "text-slate-900 hover:bg-slate-100"
                          }`}
                        >
                          🔗
                        </button>
                      </div>
                    </div>
                  </TiptapBubbleMenu>
                )}
                <EditorContent editor={editor} />
                <div
                  className={`fixed right-4 bottom-4 px-4 py-2 rounded-lg ${
                    isDarkMode
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-900"
                  } character-count ${
                    editor?.storage.characterCount.characters() === LIMIT
                      ? "character-count--warning"
                      : ""
                  }`}
                >
                  <svg height="20" width="20" viewBox="0 0 20 20">
                    <circle r="10" cx="10" cy="10" fill="#e9ecef" />
                    <circle
                      r="5"
                      cx="10"
                      cy="10"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="10"
                      strokeDasharray={`calc(${percentage} * 31.4 / 100) 31.4`}
                      transform="rotate(-90) translate(-20)"
                    />
                    <circle r="6" cx="10" cy="10" fill="white" />
                  </svg>
                  {editor?.storage.characterCount.characters()} / {LIMIT}{" "}
                  characters
                  <br />
                  {editor?.storage.characterCount.words()} words
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p
                className={`text-center ${
                  isDarkMode ? "text-white" : "text-slate-600"
                }`}
              >
                No article selected. Create one using{" "}
                <kbd
                  className={`px-2 py-1 rounded ${
                    isDarkMode ? "bg-slate-700" : "bg-slate-200"
                  }`}
                >
                  ⌘
                </kbd>
                +
                <kbd
                  className={`px-2 py-1 rounded ${
                    isDarkMode ? "bg-slate-700" : "bg-slate-200"
                  }`}
                >
                  ⌃
                </kbd>
                +
                <kbd
                  className={`px-2 py-1 rounded ${
                    isDarkMode ? "bg-slate-700" : "bg-slate-200"
                  }`}
                >
                  P
                </kbd>{" "}
                or clicking the plus in the sidebar
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 lg:hidden z-[5]"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {articleToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className={`p-6 rounded-lg shadow-lg ${
              isDarkMode ? "bg-slate-800" : "bg-white"
            }`}
          >
            <h3
              className={`text-lg font-bold mb-4 ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Delete Article
            </h3>
            <p
              className={`mb-6 ${
                isDarkMode ? "text-white/70" : "text-slate-600"
              }`}
            >
              Are you sure you want to delete "{articleToDelete.title}"? This
              action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setArticleToDelete(null)}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode
                    ? "bg-slate-700 text-white hover:bg-slate-600"
                    : "bg-slate-200 text-slate-900 hover:bg-slate-300"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
