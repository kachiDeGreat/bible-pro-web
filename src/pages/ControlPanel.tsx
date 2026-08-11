import { useState, useEffect, useRef, useMemo } from "react";
import {
  Settings,
  MonitorPlay,
  BookOpen,
  Wand2,
  Type,
  Search,
  Upload,
  Database,
  FileText,
  Play,
  X,
  Loader,
} from "lucide-react";
import "../styles/panel.css";
import { bibleService, BibleVersion, Verse } from "../services/bibleService";
import { useLive } from "../store/LiveContext";
import { getSongs, saveMedia, addSong, deleteSong } from "../services/dbService";

export default function ControlPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [savedSongs, setSavedSongs] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<"bible" | "songs" | "setlist">(
    "bible",
  );
  const [lyrics, setLyrics] = useState("");

  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [programWidth, setProgramWidth] = useState(550);
  const isResizingSidebar = useRef(false);
  const isResizingProgram = useRef(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Bible State
  const [bibles, setBibles] = useState<BibleVersion[]>([]);
  const [selectedBibleId, setSelectedBibleId] = useState<string>("");
  const [selectedBookNum, setSelectedBookNum] = useState<number | "">("");
  const [selectedChapterNum, setSelectedChapterNum] = useState<number | "">("");
  const [fastSearchQuery, setFastSearchQuery] = useState("");

  const [activeProjectedRef, setActiveProjectedRef] = useState<{
    book: number;
    chap: number;
    verse: number;
  } | null>(null);

  const [songSearchArtist, setSongSearchArtist] = useState("");
  const [songSearchTitle, setSongSearchTitle] = useState("");
  const [isSearchingSong, setIsSearchingSong] = useState(false);

  const [songViewMode, setSongViewMode] = useState<"edit" | "play">("edit");
  const [activeSongChunkIndex, setActiveSongChunkIndex] = useState<
    number | null
  >(null);

  const { liveState, projectLive, clearLive } = useLive();

  const [renderKey, setRenderKey] = useState(0);

  const [obsUrl, setObsUrl] = useState<string>(
    `${window.location.protocol}//${window.location.host}/output`
  );

  useEffect(() => {
    fetch('/api/local-ip')
      .then(res => res.json())
      .then(data => {
        if (data.ip) {
          const port = window.location.port || "5173";
          setObsUrl(`http://${data.ip}:${port}/output`);
        }
      })
      .catch(err => console.error("Could not fetch local IP for OBS URL", err));
  }, []);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      if (data.url) {
        projectLive({ backgroundUrl: data.url });
      }
    } catch (err) {
      console.error("Failed to save media", err);
      alert(
        "Failed to save media to local server. Make sure you restarted the dev server.",
      );
    }
  };

  const handleCopyOBSUrl = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(obsUrl);
      } else {
        // Fallback for non-HTTPS local IPs
        const textArea = document.createElement("textarea");
        textArea.value = obsUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      import("react-hot-toast").then((module) =>
        module.toast.success("OBS URL copied to clipboard!"),
      );
    } catch (err) {
      console.error(err);
      import("react-hot-toast").then((module) =>
        module.toast.error("Failed to copy URL"),
      );
    }
  };

  const loadSongs = async () => {
    try {
      const songs = await getSongs();
      setSavedSongs(songs);
    } catch (err) {
      console.error("Failed to load songs from DB", err);
    }
  };

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      await loadBibles();
      await loadSongs();
      setIsLoading(false);
    };
    initData();
  }, []);

  useEffect(() => {
    setRenderKey((prev) => prev + 1);
  }, [liveState.text]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar.current) {
        setSidebarWidth(
          Math.max(200, Math.min(e.clientX, window.innerWidth / 2)),
        );
      }
      if (isResizingProgram.current) {
        setProgramWidth(
          Math.max(
            300,
            Math.min(window.innerWidth - e.clientX, window.innerWidth / 1.5),
          ),
        );
      }
    };
    const handleMouseUp = () => {
      isResizingSidebar.current = false;
      isResizingProgram.current = false;
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const loadBibles = async () => {
    try {
      const loadedBibles = await bibleService.getAllBibles();
      setBibles(loadedBibles);
      if (loadedBibles.length > 0 && !selectedBibleId) {
        setSelectedBibleId(loadedBibles[0].id);
      }
    } catch (e) {
      console.error("Failed to load bibles", e);
    }
  };

  const handleBibleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        const id = "bible_" + Date.now();
        const name = file.name.replace(".xml", "");
        await bibleService.parseZefaniaXML(text, id, name);
        alert(`Successfully imported ${name}!`);
        loadBibles();
      } catch (err) {
        alert("Failed to parse Zefania XML. Make sure it is valid.");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const handleLyricsFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      setLyrics(text);
      setActiveTab("songs");
      setSongViewMode("edit");
      
      const songName = file.name.replace(".txt", "");
      try {
        await addSong(songName, "Unknown", text);
        loadSongs();
        import("react-hot-toast").then(module => module.toast.success(`Imported and saved ${songName}`));
      } catch(err) {
        console.error("Failed to save imported song to local DB", err);
      }
    };
    reader.readAsText(file);
  };

  const handleOnlineSongSearch = async () => {
    if (!songSearchTitle) return;
    setIsSearchingSong(true);

    try {
      const res = await fetch(
        `https://api.lyrics.ovh/v1/${songSearchArtist || "unknown"}/${songSearchTitle}`,
      );
      const data = await res.json();

      if (data.lyrics) {
        setLyrics(data.lyrics);
        setSongViewMode("edit");
        try {
          await addSong(songSearchTitle, songSearchArtist || "Unknown", data.lyrics);
          loadSongs();
          import("react-hot-toast").then(module => module.toast.success(`Found and saved ${songSearchTitle}`));
        } catch(err) {
          console.error("Failed to save searched song to local DB", err);
        }
      } else {
        alert("Lyrics not found. Please try another song or artist.");
      }
    } catch (err) {
      alert("Error fetching lyrics. The API might be down.");
    } finally {
      setIsSearchingSong(false);
    }
  };

  const songChunks = useMemo(() => {
    if (!lyrics) return [];
    const lines = lyrics
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const chunks: string[] = [];
    for (let i = 0; i < lines.length; i += liveState.linesMode) {
      chunks.push(lines.slice(i, i + liveState.linesMode).join("\n"));
    }
    return chunks;
  }, [lyrics, liveState.linesMode]);

  const handleProjectSongChunk = (chunkText: string, index: number) => {
    setActiveSongChunkIndex(index);
    setActiveProjectedRef(null);
    projectLive({
      type: "song",
      title: songSearchTitle ? songSearchTitle : "Lyrics",
      text: chunkText,
    });
  };

  const activeBible = bibles.find((b) => b.id === selectedBibleId);
  const activeBook = activeBible?.books.find(
    (b) => b.number === Number(selectedBookNum),
  );
  const activeChapter = activeBook?.chapters.find(
    (c) => c.number === Number(selectedChapterNum),
  );

  const handleFastSearch = (query: string) => {
    setFastSearchQuery(query);
    if (!activeBible || query.length < 3) return;

    const parts = query.toLowerCase().trim().split(/\s+|:/);
    if (parts.length >= 2) {
      let bookQuery = parts[0];
      let chapterStr = parts[1];
      let verseStr = parts[2];

      if (!isNaN(Number(parts[0])) && parts.length >= 3) {
        bookQuery = `${parts[0]} ${parts[1]}`;
        chapterStr = parts[2];
        verseStr = parts[3];
      }

      const matchedBook = activeBible.books.find(
        (b) =>
          b.name.toLowerCase().startsWith(bookQuery) ||
          b.name.toLowerCase().includes(bookQuery),
      );

      if (matchedBook) {
        if (selectedBookNum !== matchedBook.number) {
          setSelectedBookNum(matchedBook.number);
        }

        const chapNum = parseInt(chapterStr);
        if (!isNaN(chapNum)) {
          if (selectedChapterNum !== chapNum) {
            setSelectedChapterNum(chapNum);
          }

          const verseNum = parseInt(verseStr);
          if (!isNaN(verseNum)) {
            const matchedChapter = matchedBook.chapters.find(
              (c) => c.number === chapNum,
            );
            const matchedVerse = matchedChapter?.verses.find(
              (v) => v.number === verseNum,
            );
            if (matchedVerse) {
              setActiveProjectedRef({
                book: matchedBook.number,
                chap: chapNum,
                verse: verseNum,
              });
              projectLive({
                type: "bible",
                title: `${matchedBook.name} ${chapNum}:${verseNum} (${activeBible.name})`,
                text: matchedVerse.text,
              });
            }
          }
        }
      }
    }
  };

  const handleProjectVerse = (verse: Verse) => {
    setActiveProjectedRef({
      book: Number(selectedBookNum),
      chap: Number(selectedChapterNum),
      verse: verse.number,
    });
    projectLive({
      type: "bible",
      title: `${activeBook?.name} ${activeChapter?.number}:${verse.number} (${activeBible?.name})`,
      text: verse.text,
    });
  };

  const handleClear = () => {
    setActiveProjectedRef(null);
    setActiveSongChunkIndex(null);
    clearLive();
  };

  const handleVersionChange = (newBibleId: string) => {
    setSelectedBibleId(newBibleId);
    if (liveState.type === "bible" && activeProjectedRef) {
      const newBible = bibles.find((b) => b.id === newBibleId);
      if (newBible) {
        const newBook = newBible.books.find(
          (b) => b.number === activeProjectedRef.book,
        );
        const newChap = newBook?.chapters.find(
          (c) => c.number === activeProjectedRef.chap,
        );
        const newVerse = newChap?.verses.find(
          (v) => v.number === activeProjectedRef.verse,
        );

        if (newBook && newChap && newVerse) {
          projectLive({
            title: `${newBook.name} ${newChap.number}:${newVerse.number} (${newBible.name})`,
            text: newVerse.text,
          });
        }
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        if (activeTab === "bible" && activeChapter && activeProjectedRef) {
          const currentIndex = activeChapter.verses.findIndex(
            (v) => v.number === activeProjectedRef.verse,
          );
          if (
            currentIndex !== -1 &&
            currentIndex < activeChapter.verses.length - 1
          ) {
            handleProjectVerse(activeChapter.verses[currentIndex + 1]);
          }
        } else if (
          activeTab === "songs" &&
          songChunks.length > 0 &&
          activeSongChunkIndex !== null
        ) {
          if (activeSongChunkIndex < songChunks.length - 1) {
            handleProjectSongChunk(
              songChunks[activeSongChunkIndex + 1],
              activeSongChunkIndex + 1,
            );
          }
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        if (activeTab === "bible" && activeChapter && activeProjectedRef) {
          const currentIndex = activeChapter.verses.findIndex(
            (v) => v.number === activeProjectedRef.verse,
          );
          if (currentIndex > 0) {
            handleProjectVerse(activeChapter.verses[currentIndex - 1]);
          }
        } else if (
          activeTab === "songs" &&
          songChunks.length > 0 &&
          activeSongChunkIndex !== null
        ) {
          if (activeSongChunkIndex > 0) {
            handleProjectSongChunk(
              songChunks[activeSongChunkIndex - 1],
              activeSongChunkIndex - 1,
            );
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeTab,
    activeChapter,
    activeProjectedRef,
    songChunks,
    activeSongChunkIndex,
    handleProjectVerse,
    handleProjectSongChunk,
  ]);

  return (
    <div className="panel-layout">
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div
          className="modal-overlay"
          style={{ justifyContent: "flex-start", paddingLeft: "2rem" }}
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            className="modal-content"
            style={{
              maxHeight: "95vh",
              overflowY: "auto",
              background: "rgba(10, 15, 25, 0.98)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
              border: "1px solid rgba(255,255,255,0.15)",
              width: "640px",
              padding: "0",
              borderRadius: "12px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-title"
              style={{
                padding: "16px 24px",
                margin: 0,
                borderBottom: "1px solid var(--border-subtle)",
                background: "rgba(0,0,0,0.3)",
              }}
            >
              Typography & Style Settings
              <button
                className="icon-btn"
                onClick={() => setIsSettingsOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                }}
              >
                <div className="control-group">
                  <span className="control-label" style={{ fontWeight: 600 }}>
                    Font Family
                  </span>
                  <select
                    className="input"
                    value={liveState.fontFamily}
                    onChange={(e) =>
                      projectLive({ fontFamily: e.target.value })
                    }
                  >
                    <option value="Inter">Inter (Sans Serif)</option>
                    <option value="Outfit">Outfit (Modern)</option>
                    <option value="'Times New Roman', serif">
                      Times New Roman (Serif)
                    </option>
                    <option value="Arial, sans-serif">Arial</option>
                  </select>
                </div>

                <div className="control-group">
                  <span className="control-label" style={{ fontWeight: 600 }}>
                    Transition Animation
                  </span>
                  <select
                    className="input"
                    value={liveState.animation}
                    onChange={(e) =>
                      projectLive({ animation: e.target.value as any })
                    }
                  >
                    <option value="none">None (Instant)</option>
                    <option value="fade">Fade In</option>
                    <option value="slide">Slide Up</option>
                    <option value="zoom">Zoom In</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                }}
              >
                <div className="control-group">
                  <span className="control-label" style={{ fontWeight: 600 }}>
                    Song Text Transform
                  </span>
                  <select
                    className="input"
                    value={liveState.textTransform}
                    onChange={(e) =>
                      projectLive({ textTransform: e.target.value as any })
                    }
                  >
                    <option value="none">Normal (As Typed)</option>
                    <option value="uppercase">ALL CAPS</option>
                    <option value="capitalize">Capitalize Each Word</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                }}
              >
                <div className="control-group">
                  <span className="control-label" style={{ fontWeight: 600 }}>
                    Reference Font Color
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="color"
                      value={liveState.refColor}
                      onChange={(e) =>
                        projectLive({ refColor: e.target.value })
                      }
                      style={{
                        width: "40px",
                        height: "40px",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "6px",
                        cursor: "pointer",
                        background: "transparent",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {liveState.refColor.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="control-group">
                  <span className="control-label" style={{ fontWeight: 600 }}>
                    Main Text Font Color
                  </span>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="color"
                      value={liveState.textColor}
                      onChange={(e) =>
                        projectLive({ textColor: e.target.value })
                      }
                      style={{
                        width: "40px",
                        height: "40px",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "6px",
                        cursor: "pointer",
                        background: "transparent",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {liveState.textColor.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px solid var(--border-subtle)",
                  margin: "10px 0",
                }}
              ></div>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "var(--primary)",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                }}
              >
                Sizes & Dimensions
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                }}
              >
                <div className="control-group">
                  <span className="control-label">
                    Bible Reference Font Size (cqi)
                  </span>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    max="10"
                    step="0.1"
                    value={liveState.refFontSize}
                    onChange={(e) =>
                      projectLive({ refFontSize: Number(e.target.value) })
                    }
                  />
                </div>

                <div className="control-group">
                  <span className="control-label">
                    Bible Verse Font Size (cqi)
                  </span>
                  <input
                    type="number"
                    className="input"
                    min="2"
                    max="15"
                    step="0.5"
                    value={liveState.bibleFontSize}
                    onChange={(e) =>
                      projectLive({ bibleFontSize: Number(e.target.value) })
                    }
                  />
                </div>

                <div className="control-group">
                  <span className="control-label">
                    Song Lyrics Font Size (cqi)
                  </span>
                  <input
                    type="number"
                    className="input"
                    min="2"
                    max="15"
                    step="0.5"
                    value={liveState.songFontSize}
                    onChange={(e) =>
                      projectLive({ songFontSize: Number(e.target.value) })
                    }
                  />
                </div>

                <div className="control-group">
                  <span className="control-label">
                    Side Padding (FS & LT) (%)
                  </span>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    max="40"
                    step="1"
                    value={liveState.paddingLR}
                    onChange={(e) =>
                      projectLive({ paddingLR: Number(e.target.value) })
                    }
                  />
                </div>

                <div className="control-group" style={{ gridColumn: "1 / -1" }}>
                  <span className="control-label">Lower Third Width (%)</span>
                  <input
                    type="number"
                    className="input"
                    min="30"
                    max="100"
                    step="1"
                    value={liveState.lowerThirdWidth}
                    onChange={(e) =>
                      projectLive({ lowerThirdWidth: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px solid var(--border-subtle)",
                  margin: "10px 0",
                }}
              ></div>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "var(--primary)",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                }}
              >
                Reference Position (Bible)
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                }}
              >
                <div className="control-group">
                  <span className="control-label">Vertical Position</span>
                  <div
                    className="segmented-picker"
                    style={{ display: "flex", width: "100%" }}
                  >
                    <button
                      className={`seg-btn ${liveState.refPosition === "top" ? "active" : ""}`}
                      onClick={() => projectLive({ refPosition: "top" })}
                    >
                      Top (Above Verse)
                    </button>
                    <button
                      className={`seg-btn ${liveState.refPosition === "bottom" ? "active" : ""}`}
                      onClick={() => projectLive({ refPosition: "bottom" })}
                    >
                      Bottom (Below Verse)
                    </button>
                  </div>
                </div>

                <div className="control-group">
                  <span className="control-label">Horizontal Alignment</span>
                  <div
                    className="segmented-picker"
                    style={{ display: "flex", width: "100%" }}
                  >
                    <button
                      className={`seg-btn ${liveState.refAlign === "left" ? "active" : ""}`}
                      onClick={() => projectLive({ refAlign: "left" })}
                    >
                      Left
                    </button>
                    <button
                      className={`seg-btn ${liveState.refAlign === "center" ? "active" : ""}`}
                      onClick={() => projectLive({ refAlign: "center" })}
                    >
                      Center
                    </button>
                    <button
                      className={`seg-btn ${liveState.refAlign === "right" ? "active" : ""}`}
                      onClick={() => projectLive({ refAlign: "right" })}
                    >
                      Right
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Topbar */}
      <header className="panel-topbar">
        <div className="panel-logo">
          <BookOpen size={20} color="var(--primary)" />
          Bible Song<span>PRO</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div className="status-indicator">
            <div className="status-dot online"></div>
            <span>Connected (Local IP)</span>
          </div>
          <button
            className="icon-btn"
            title="Settings"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main Body Splitter */}
      <div className="panel-body">
        {/* Left Sidebar */}
        <aside className="panel-sidebar" style={{ width: sidebarWidth }}>
          <div className="sidebar-tabs">
            <div
              className={`sidebar-tab ${activeTab === "bible" ? "active" : ""}`}
              onClick={() => setActiveTab("bible")}
            >
              Bible
            </div>
            <div
              className={`sidebar-tab ${activeTab === "songs" ? "active" : ""}`}
              onClick={() => setActiveTab("songs")}
            >
              Songs
            </div>
            <div
              className={`sidebar-tab ${activeTab === "setlist" ? "active" : ""}`}
              onClick={() => setActiveTab("setlist")}
            >
              Setlist
            </div>
          </div>

          <div className="sidebar-content">
            {activeTab === "bible" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  height: "100%",
                }}
              >
                <label
                  className="btn btn-primary"
                  style={{
                    padding: "8px",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <Upload size={16} /> &nbsp; Import Zefania XML
                  <input
                    type="file"
                    accept=".xml"
                    hidden
                    onChange={handleBibleUpload}
                  />
                </label>

                <div>
                  <h4
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Database size={12} /> Local Bible Database
                  </h4>
                  {bibles.length === 0 ? (
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-muted)",
                        fontStyle: "italic",
                      }}
                    >
                      No bibles imported yet.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      {bibles.map((b) => (
                        <div
                          key={b.id}
                          style={{
                            padding: "8px 12px",
                            background: "rgba(0,0,0,0.2)",
                            borderRadius: "6px",
                            border: "1px solid var(--border-subtle)",
                            fontSize: "0.85rem",
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {b.name}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {selectedBibleId === b.id && (
                              <span
                                style={{
                                  color: "var(--secondary)",
                                  fontSize: "0.7rem",
                                  flexShrink: 0,
                                }}
                              >
                                ACTIVE
                              </span>
                            )}
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm(`Delete Bible version: ${b.name}?`)) {
                                  try {
                                    await bibleService.deleteBible(b.id);
                                    if (selectedBibleId === b.id) setSelectedBibleId("");
                                    loadBibles();
                                    import("react-hot-toast").then(module => module.toast.success(`Deleted ${b.name}`));
                                  } catch (err) {
                                    console.error("Failed to delete bible", err);
                                  }
                                }
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                              title="Delete Bible"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "songs" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <label
                  className="btn btn-secondary"
                  style={{
                    padding: "8px",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <FileText size={16} /> &nbsp; Import Lyrics (.txt)
                  <input
                    type="file"
                    accept=".txt"
                    hidden
                    onChange={handleLyricsFileUpload}
                  />
                </label>

                <hr
                  style={{
                    border: 0,
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                />

                <div>
                  <h4
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Search size={12} /> Search Online
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="text"
                      className="input"
                      placeholder="Artist (Optional)"
                      value={songSearchArtist}
                      onChange={(e) => setSongSearchArtist(e.target.value)}
                    />
                    <input
                      type="text"
                      className="input"
                      placeholder="Song Title"
                      value={songSearchTitle}
                      onChange={(e) => setSongSearchTitle(e.target.value)}
                    />
                    <button
                      className="btn btn-primary"
                      style={{
                        width: "100%",
                        fontSize: "0.85rem",
                        marginTop: "4px",
                      }}
                      onClick={handleOnlineSongSearch}
                      disabled={!songSearchTitle || isSearchingSong}
                    >
                      <Wand2 size={16} /> &nbsp;
                      {isSearchingSong ? "Searching..." : "Get Lyrics Online"}
                    </button>
                  </div>
                </div>

                <hr
                  style={{
                    border: 0,
                    borderBottom: "1px solid var(--border-subtle)",
                    margin: "8px 0",
                  }}
                />

                <div>
                  <h4
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Database size={12} /> Saved Songs
                  </h4>
                  {savedSongs.length === 0 ? (
                    <p
                      style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
                    >
                      No songs saved yet. Add them in the Dashboard.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        maxHeight: "250px",
                        overflowY: "auto",
                        paddingRight: "4px",
                      }}
                    >
                      {savedSongs.map((s, idx) => (
                        <div
                          key={s.id || idx}
                          style={{
                            padding: "8px",
                            background: "rgba(255,255,255,0.05)",
                            borderRadius: "6px",
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            border: "1px solid transparent",
                            transition: "all 0.2s",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start"
                          }}
                          onClick={() => {
                            setLyrics(s.lyrics);
                            setSongViewMode("play");
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.borderColor =
                              "var(--primary)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.borderColor = "transparent")
                          }
                        >
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                            {s.artist && (
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--text-muted)",
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                }}
                              >
                                {s.artist}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete song: ${s.title}?`)) {
                                try {
                                  await deleteSong(s.id);
                                  loadSongs();
                                  import("react-hot-toast").then(module => module.toast.success(`Deleted ${s.title}`));
                                } catch (err) {
                                  console.error("Failed to delete song", err);
                                }
                              }
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              marginLeft: '8px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            title="Delete Song"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Resizer 1 */}
        <div
          className="resizer-x"
          onMouseDown={(e) => {
            e.preventDefault();
            isResizingSidebar.current = true;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
        ></div>

        {/* Middle Workspace */}
        <main className="panel-workspace">
          <div className="workspace-toolbar">
            <button className="icon-btn" title="Text Mode">
              <Type size={18} />
            </button>
            <div
              style={{
                width: "1px",
                height: "24px",
                background: "var(--border-subtle)",
                margin: "0 4px",
              }}
            ></div>
            <button className="icon-btn active" title="AI Helper">
              <Wand2 size={18} />
            </button>
            <div style={{ flex: 1 }}></div>

            {activeTab === "songs" && (
              <div
                style={{
                  display: "flex",
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: "6px",
                  padding: "4px",
                  marginRight: "1rem",
                }}
              >
                <button
                  className={`btn ${songViewMode === "edit" ? "btn-primary" : "btn-secondary"}`}
                  style={{
                    padding: "4px 12px",
                    fontSize: "0.8rem",
                    border: "none",
                    background:
                      songViewMode === "edit"
                        ? "var(--primary)"
                        : "transparent",
                  }}
                  onClick={() => setSongViewMode("edit")}
                >
                  Editor
                </button>
                <button
                  className={`btn ${songViewMode === "play" ? "btn-primary" : "btn-secondary"}`}
                  style={{
                    padding: "4px 12px",
                    fontSize: "0.8rem",
                    border: "none",
                    background:
                      songViewMode === "play"
                        ? "var(--primary)"
                        : "transparent",
                  }}
                  onClick={() => setSongViewMode("play")}
                >
                  <Play size={14} style={{ marginRight: "4px" }} /> Play
                </button>
              </div>
            )}

            {activeTab === "bible" && (
              <select
                className="input"
                style={{
                  width: "auto",
                  padding: "4px 8px",
                  fontSize: "0.85rem",
                  maxWidth: "180px",
                }}
                value={selectedBibleId}
                onChange={(e) => handleVersionChange(e.target.value)}
              >
                <option value="">Select Version...</option>
                {bibles.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="workspace-editor">
            {activeTab === "bible" ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  gap: "12px",
                }}
              >
                <div className="fast-search-container">
                  <Search
                    size={20}
                    color="var(--primary)"
                    style={{ marginRight: "12px" }}
                  />
                  <input
                    type="text"
                    className="fast-search-input"
                    placeholder="Fast Search (e.g. 'gen 1 2' or 'john 3 16')"
                    value={fastSearchQuery}
                    onChange={(e) => handleFastSearch(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <select
                    className="input"
                    style={{ flex: 2, padding: "8px" }}
                    value={selectedBookNum}
                    onChange={(e) => {
                      setSelectedBookNum(
                        e.target.value ? Number(e.target.value) : "",
                      );
                      setSelectedChapterNum("");
                    }}
                  >
                    <option value="">Select Book...</option>
                    {activeBible?.books.map((book) => (
                      <option key={book.number} value={book.number}>
                        {book.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="input"
                    style={{ flex: 1, padding: "8px" }}
                    value={selectedChapterNum}
                    onChange={(e) =>
                      setSelectedChapterNum(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                  >
                    <option value="">Chapter...</option>
                    {activeBook?.chapters.map((chap) => (
                      <option key={chap.number} value={chap.number}>
                        {chap.number}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="verses-list">
                  {!activeChapter ? (
                    <div
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: "var(--text-muted)",
                      }}
                    >
                      Select a book and chapter or type in the fast search box
                      above.
                    </div>
                  ) : (
                    activeChapter.verses.map((verse) => {
                      const isLive =
                        liveState.type === "bible" &&
                        activeProjectedRef?.verse === verse.number &&
                        activeProjectedRef?.chap === activeChapter.number &&
                        activeProjectedRef?.book === activeBook?.number;
                      return (
                        <div
                          key={verse.number}
                          onClick={() => handleProjectVerse(verse)}
                          style={{
                            padding: "12px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            backgroundColor: isLive
                              ? "var(--primary-light)"
                              : "transparent",
                            border: "1px solid transparent",
                            borderColor: isLive
                              ? "var(--primary)"
                              : "transparent",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = isLive
                              ? "var(--primary-light)"
                              : "rgba(255,255,255,0.05)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = isLive
                              ? "var(--primary-light)"
                              : "transparent")
                          }
                        >
                          <span
                            style={{
                              color: "var(--primary)",
                              fontWeight: "bold",
                              marginRight: "12px",
                              fontSize: "0.9rem",
                            }}
                          >
                            {verse.number}
                          </span>
                          <span style={{ fontSize: "1rem", lineHeight: "1.5" }}>
                            {verse.text}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {songViewMode === "edit" ? (
                  <textarea
                    className="lyric-textarea"
                    placeholder="Type or paste lyrics here. You can also import a .txt file from the sidebar!"
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                  />
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(200px, 1fr))",
                      gap: "12px",
                      overflowY: "auto",
                      alignContent: "start",
                      padding: "4px",
                    }}
                  >
                    {songChunks.length === 0 ? (
                      <div
                        style={{
                          padding: "2rem",
                          color: "var(--text-muted)",
                          gridColumn: "1 / -1",
                          textAlign: "center",
                        }}
                      >
                        No lyrics found. Switch to the Editor to paste some
                        lyrics!
                      </div>
                    ) : (
                      songChunks.map((chunk, index) => {
                        const isLive =
                          liveState.type === "song" &&
                          activeSongChunkIndex === index;
                        return (
                          <div
                            key={index}
                            onClick={() => handleProjectSongChunk(chunk, index)}
                            style={{
                              containerType: "inline-size",
                              background: isLive
                                ? "var(--primary-light)"
                                : "rgba(0,0,0,0.3)",
                              border: `2px solid ${isLive ? "var(--primary)" : "var(--border-subtle)"}`,
                              borderRadius: "8px",
                              padding: "12px",
                              cursor: "pointer",
                              color: isLive ? "#fff" : "var(--text-primary)",
                              boxShadow: isLive
                                ? "0 0 12px rgba(79, 70, 229, 0.4)"
                                : "none",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              if (!isLive)
                                e.currentTarget.style.borderColor =
                                  "var(--primary-hover)";
                            }}
                            onMouseLeave={(e) => {
                              if (!isLive)
                                e.currentTarget.style.borderColor =
                                  "var(--border-subtle)";
                            }}
                          >
                            <div
                              style={{
                                fontSize: "clamp(11px, 6.5cqi, 16px)",
                                lineHeight: "1.4",
                                whiteSpace: "pre",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {chunk}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Settings & Live Controls */}
          <div className="live-controls-bar">
            <div className="nav-row">
              <button
                className="btn btn-secondary"
                style={{ background: "#444", padding: "0 6px" }}
                onClick={handleClear}
              >
                Clear
              </button>
              <button
                className="btn btn-primary"
                style={{
                  whiteSpace: "nowrap",
                  padding: "0 14px",
                  minWidth: "126px",
                  background: "#dc2626",
                  borderColor: "#dc2626",
                }}
                onClick={() => {}}
              >
                Project Live
              </button>
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <input
                  type="text"
                  placeholder="Search..."
                  style={{
                    width: "100%",
                    background: "var(--panel-content-bg)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    padding: "8px 64px 8px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </div>
            </div>

            <div className="main-panel-stacks">
              <div className="control-stack">
                <span className="control-stack-label">Lines</span>
                <div
                  className="segmented-picker"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "2px",
                    width: "100%",
                  }}
                >
                  <button
                    className={`seg-btn ${liveState.linesMode === 1 ? "active" : ""}`}
                    onClick={() => {
                      projectLive({ linesMode: 1 });
                      setActiveSongChunkIndex(null);
                    }}
                  >
                    1
                  </button>
                  <button
                    className={`seg-btn ${liveState.linesMode === 2 ? "active" : ""}`}
                    onClick={() => {
                      projectLive({ linesMode: 2 });
                      setActiveSongChunkIndex(null);
                    }}
                  >
                    2
                  </button>
                  <button
                    className={`seg-btn ${liveState.linesMode === 3 ? "active" : ""}`}
                    onClick={() => {
                      projectLive({ linesMode: 3 });
                      setActiveSongChunkIndex(null);
                    }}
                  >
                    3
                  </button>
                  <button
                    className={`seg-btn ${liveState.linesMode === 4 ? "active" : ""}`}
                    onClick={() => {
                      projectLive({ linesMode: 4 });
                      setActiveSongChunkIndex(null);
                    }}
                  >
                    4
                  </button>
                  <button className="seg-btn" onClick={() => {}}>
                    5
                  </button>
                  <button className="seg-btn" onClick={() => {}}>
                    6
                  </button>
                </div>
              </div>

              <div className="control-stack">
                <span className="control-stack-label">Mode</span>
                <div
                  className="segmented-picker"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    width: "100%",
                  }}
                >
                  <button
                    className={`seg-btn ${liveState.layout === "FS" ? "active" : ""}`}
                    onClick={() => projectLive({ layout: "FS" })}
                  >
                    FS
                  </button>
                  <button
                    className={`seg-btn ${liveState.layout === "LT" ? "active" : ""}`}
                    onClick={() => projectLive({ layout: "LT" })}
                  >
                    LT
                  </button>
                </div>
              </div>

              <div className="control-stack">
                <span className="control-stack-label">Position Y</span>
                <div
                  className="segmented-picker"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    width: "100%",
                  }}
                >
                  <button
                    className={`seg-btn ${liveState.verticalAlign === "top" ? "active" : ""}`}
                    onClick={() => projectLive({ verticalAlign: "top" })}
                  >
                    Top
                  </button>
                  <button
                    className={`seg-btn ${liveState.verticalAlign === "middle" ? "active" : ""}`}
                    onClick={() => projectLive({ verticalAlign: "middle" })}
                  >
                    Mid
                  </button>
                  <button
                    className={`seg-btn ${liveState.verticalAlign === "bottom" ? "active" : ""}`}
                    onClick={() => projectLive({ verticalAlign: "bottom" })}
                  >
                    Bot
                  </button>
                </div>
              </div>

              <div className="control-stack">
                <span className="control-stack-label">Position X</span>
                <div
                  className="segmented-picker"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "2px",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <button
                    className={`seg-btn ${liveState.horizontalAlign === "left" ? "active" : ""}`}
                    onClick={() => projectLive({ horizontalAlign: "left" })}
                  >
                    L
                  </button>
                  <button
                    className={`seg-btn ${liveState.horizontalAlign === "center" ? "active" : ""}`}
                    onClick={() => projectLive({ horizontalAlign: "center" })}
                  >
                    C
                  </button>
                  <button
                    className={`seg-btn ${liveState.horizontalAlign === "right" ? "active" : ""}`}
                    onClick={() => projectLive({ horizontalAlign: "right" })}
                  >
                    R
                  </button>
                </div>
              </div>

              <div className="control-stack" style={{ gap: "0.5rem" }}>
                <span className="control-stack-label">Background</span>
                <div
                  className="segmented-picker"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "2px",
                    width: "100%",
                  }}
                >
                  <button
                    className={`seg-btn ${liveState.backgroundMode === "solid" ? "active" : ""}`}
                    onClick={() => projectLive({ backgroundMode: "solid" })}
                  >
                    Solid
                  </button>
                  <button
                    className={`seg-btn ${liveState.backgroundMode === "image" ? "active" : ""}`}
                    onClick={() => projectLive({ backgroundMode: "image" })}
                  >
                    Image
                  </button>
                  <button
                    className={`seg-btn ${liveState.backgroundMode === "video" ? "active" : ""}`}
                    onClick={() => projectLive({ backgroundMode: "video" })}
                  >
                    Video
                  </button>
                </div>

                {liveState.backgroundMode === "solid" ? (
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: "36px",
                        height: "30px",
                        flexShrink: 0,
                      }}
                    >
                      <input
                        type="color"
                        value={liveState.backgroundColor}
                        onChange={(e) =>
                          projectLive({ backgroundColor: e.target.value })
                        }
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          borderRadius: "6px",
                          border: "1px solid var(--border-subtle)",
                          padding: 0,
                          cursor: "pointer",
                          background: "transparent",
                        }}
                      />
                    </div>
                    <button
                      className={`seg-btn ${liveState.transparentBackground ? "active" : ""}`}
                      style={{ flex: 1, height: "30px", fontSize: "11px" }}
                      onClick={() =>
                        projectLive({
                          transparentBackground:
                            !liveState.transparentBackground,
                        })
                      }
                    >
                      {liveState.transparentBackground
                        ? "TRANSPARENT: ON"
                        : "TRANSPARENT: OFF"}
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "center",
                    }}
                  >
                    <label
                      className="btn btn-secondary"
                      style={{
                        flex: 1,
                        height: "30px",
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        margin: 0,
                      }}
                    >
                      Upload{" "}
                      {liveState.backgroundMode === "image" ? "Image" : "Video"}
                      <input
                        type="file"
                        accept={
                          liveState.backgroundMode === "image"
                            ? "image/*"
                            : "video/*"
                        }
                        style={{ display: "none" }}
                        onChange={handleMediaUpload}
                      />
                    </label>
                    {liveState.backgroundUrl?.startsWith("local:") && (
                      <span style={{ fontSize: "10px", color: "#10b981" }}>
                        Media Active ✓
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="control-stack">
                <span className="control-stack-label">Text Shadow</span>
                <div
                  className="segmented-picker"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gap: "2px",
                    width: "100%",
                  }}
                >
                  <button
                    className={`seg-btn ${liveState.shadow === "none" ? "active" : ""}`}
                    onClick={() => projectLive({ shadow: "none" })}
                  >
                    None
                  </button>
                  <button
                    className={`seg-btn ${liveState.shadow === "light" ? "active" : ""}`}
                    onClick={() => projectLive({ shadow: "light" })}
                  >
                    Light
                  </button>
                  <button
                    className={`seg-btn ${liveState.shadow === "heavy" ? "active" : ""}`}
                    onClick={() => projectLive({ shadow: "heavy" })}
                  >
                    Heavy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Resizer 2 */}
        <div
          className="resizer-x"
          onMouseDown={(e) => {
            e.preventDefault();
            isResizingProgram.current = true;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
        ></div>

        {/* Right Program Display */}
        <aside className="panel-program" style={{ width: programWidth }}>
          <div className="program-header">
            <span>Program Output</span>
            <button
              className="icon-btn"
              style={{ width: "28px", height: "28px" }}
              title="Copy OBS URL"
              onClick={handleCopyOBSUrl}
            >
              <MonitorPlay size={14} />
            </button>
          </div>

          <div className="program-stage">
            <div
              className="program-preview-box"
              style={{
                position: "relative",
                overflow: "hidden",
                backgroundColor:
                  liveState.backgroundMode === "solid" &&
                  !liveState.transparentBackground
                    ? liveState.backgroundColor
                    : "#050505",
                backgroundImage:
                  liveState.backgroundMode === "solid" &&
                  !liveState.transparentBackground
                    ? "none"
                    : "linear-gradient(45deg, rgba(255,255,255,0.03) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.03) 75%, rgba(255,255,255,0.03)), linear-gradient(45deg, rgba(255,255,255,0.03) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.03) 75%, rgba(255,255,255,0.03))",
                backgroundSize: "20px 20px",
                backgroundPosition: "0 0, 10px 10px",
              }}
            >
              {liveState.backgroundMode === "image" &&
                liveState.backgroundUrl && (
                  <img
                    src={liveState.backgroundUrl}
                    alt="bg"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      zIndex: 0,
                    }}
                  />
                )}
              {liveState.backgroundMode === "video" &&
                liveState.backgroundUrl && (
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      zIndex: 0,
                    }}
                  >
                    <source src={liveState.backgroundUrl} />
                  </video>
                )}

              {liveState.type === "clear" ? (
                <span
                  className="preview-placeholder"
                  style={{ position: "relative", zIndex: 1 }}
                >
                  Live Preview
                </span>
              ) : (
                <div
                  key={renderKey}
                  className={`projected-content layout-${liveState.layout} valign-${liveState.verticalAlign} halign-${liveState.horizontalAlign}`}
                  style={{
                    position: "relative",
                    zIndex: 1,
                    fontFamily: liveState.fontFamily,
                    paddingLeft: `${liveState.paddingLR}%`,
                    paddingRight: `${liveState.paddingLR}%`,
                    background: "transparent",
                  }}
                >
                  <div
                    className={`projected-box bg-${liveState.transparentBackground ? "transparent" : "normal"} anim-${liveState.animation} shadow-${liveState.shadow}`}
                    style={{
                      width:
                        liveState.layout === "LT"
                          ? `${liveState.lowerThirdWidth}%`
                          : "100%",
                      padding:
                        liveState.layout === "FS"
                          ? liveState.transparentBackground
                            ? "4cqi"
                            : "6cqi"
                          : "3cqi 4cqi",
                      background:
                        liveState.layout === "LT"
                          ? liveState.transparentBackground
                            ? "transparent"
                            : liveState.backgroundColor
                          : "transparent",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent:
                        liveState.layout === "FS"
                          ? liveState.verticalAlign === "top"
                            ? "flex-start"
                            : liveState.verticalAlign === "bottom"
                              ? "flex-end"
                              : "center"
                          : "center",
                      gap: "1cqi",
                    }}
                  >
                    {liveState.title &&
                      liveState.type === "bible" &&
                      liveState.refPosition === "top" && (
                        <div
                          className="projected-title"
                          style={{
                            width: "100%",
                            textAlign: liveState.refAlign,
                            color: liveState.refColor,
                            fontSize: `${liveState.refFontSize * (liveState.layout === "LT" ? 0.6 : 1)}cqi`,
                            margin: 0,
                            marginBottom: "0.5cqi",
                          }}
                        >
                          {liveState.title}
                        </div>
                      )}

                    <div
                      className="projected-text"
                      style={{
                        fontSize: `${(liveState.type === "bible" ? liveState.bibleFontSize : liveState.songFontSize) * (liveState.layout === "LT" ? 0.6 : 1)}cqi`,
                        textTransform:
                          liveState.type === "song"
                            ? liveState.textTransform
                            : "none",
                        color: liveState.textColor,
                        width: "100%",
                        textAlign: liveState.horizontalAlign as any,
                      }}
                    >
                      {liveState.text}
                    </div>

                    {liveState.title &&
                      liveState.type === "bible" &&
                      liveState.refPosition === "bottom" && (
                        <div
                          className="projected-title"
                          style={{
                            width: "100%",
                            textAlign: liveState.refAlign,
                            color: liveState.refColor,
                            fontSize: `${liveState.refFontSize * (liveState.layout === "LT" ? 0.6 : 1)}cqi`,
                            margin: 0,
                            marginTop: "0.5cqi",
                          }}
                        >
                          {liveState.title}
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              padding: "1rem",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Output URL (OBS Browser Source)
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                readOnly
                className="input"
                value={obsUrl}
                style={{ fontSize: "0.75rem", padding: "6px 8px" }}
              />
              <button
                className="btn btn-secondary"
                style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                onClick={handleCopyOBSUrl}
              >
                Copy
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
