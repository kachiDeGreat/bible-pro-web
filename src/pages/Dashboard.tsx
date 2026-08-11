import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { addSong, getSongs, getBibles, addBible } from "../services/dbService";
import { bibleService } from "../services/bibleService";
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [songsCount, setSongsCount] = useState(0);
  const [biblesCount, setBiblesCount] = useState(0);
  const [showSongModal, setShowSongModal] = useState(false);
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [songLyrics, setSongLyrics] = useState("");
  const [songInputMode, setSongInputMode] = useState<
    "paste" | "online" | "upload"
  >("paste");
  const [isUploading, setIsUploading] = useState(false);
  const [showBibleModal, setShowBibleModal] = useState(false);
  const [selectedBibles, setSelectedBibles] = useState<File[]>([]);
  const [searchResults, setSearchResults] = useState<{title: string, artist: string, lyrics: string}[]>([]);
  const [hoveredSongIdx, setHoveredSongIdx] = useState<number | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const s = await getSongs();
      const b = await getBibles();
      setSongsCount(s.length);
      setBiblesCount(b.length);
    } catch (e) {
      console.error("Error fetching stats:", e);
    }
  };

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    const toastId = toast.loading('Saving song...');
    try {
      await addSong(songTitle, songArtist, songLyrics);
      setShowSongModal(false);
      setSongTitle("");
      setSongArtist("");
      setSongLyrics("");
      fetchStats();
      toast.success('Song added successfully!', { id: toastId });
    } catch (e) {
      toast.error("Failed to add song.", { id: toastId });
    }
    setIsUploading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedBibles(files);
      setShowBibleModal(true);
    }
    // Clear the input so the same files can be selected again if needed
    e.target.value = '';
  };

  const handleUploadBibles = async () => {
    if (selectedBibles.length === 0) return;
    setIsUploading(true);
    const toastId = toast.loading('Uploading Bibles, please wait...');
    try {
      for (const file of selectedBibles) {
        const text = await file.text();
        const id = "bible_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
        const name = file.name.replace(/\.[^/.]+$/, "");
        await bibleService.parseZefaniaXML(text, id, name);
      }
      toast.success(`Successfully uploaded ${selectedBibles.length} Bible(s).`, { id: toastId });
      setShowBibleModal(false);
      setSelectedBibles([]);
      fetchStats();
    } catch (e) {
      toast.error("Failed to parse and upload Bibles.", { id: toastId });
    }
    setIsUploading(false);
  };

  const handleTxtUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    const toastId = toast.loading('Uploading TXT files...');
    try {
      for (const file of files) {
        const text = await file.text();
        const title = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        await addSong(title, "Unknown", text);
      }
      setShowSongModal(false);
      fetchStats();
      toast.success(`Successfully uploaded ${files.length} song(s).`, { id: toastId });
    } catch (e) {
      toast.error("Failed to upload songs.", { id: toastId });
    }
    setIsUploading(false);
    e.target.value = '';
  };

  const handleOnlineSearch = async () => {
    if (!songTitle) return toast.error("Enter a title to search!");
    setIsUploading(true);
    const toastId = toast.loading('Searching online...');
    try {
      // If artist is provided, just search exactly
      if (songArtist) {
        const res = await fetch(`https://api.lyrics.ovh/v1/${songArtist}/${songTitle}`);
        const data = await res.json();
        if (data.lyrics) {
          setSearchResults([{ title: songTitle, artist: songArtist, lyrics: data.lyrics }]);
          toast.success("Found 1 result!", { id: toastId });
        } else {
          toast.error("Lyrics not found.", { id: toastId });
          setSearchResults([]);
        }
      } else {
        // Otherwise use suggest API
        const suggestRes = await fetch(`https://api.lyrics.ovh/suggest/${songTitle}`);
        const suggestData = await suggestRes.json();
        const top5 = suggestData.data?.slice(0, 5) || [];
        
        if (top5.length === 0) {
          toast.error("No songs found.", { id: toastId });
          setSearchResults([]);
          setIsUploading(false);
          return;
        }

        toast.loading("Fetching lyrics for results...", { id: toastId });
        const results = [];
        for (const track of top5) {
          try {
            const lyricRes = await fetch(`https://api.lyrics.ovh/v1/${track.artist.name}/${track.title}`);
            const lyricData = await lyricRes.json();
            if (lyricData.lyrics) {
              results.push({ title: track.title, artist: track.artist.name, lyrics: lyricData.lyrics });
            }
          } catch (e) {} // ignore individual fetch errors
        }

        if (results.length > 0) {
          setSearchResults(results);
          toast.success(`Found ${results.length} result(s)!`, { id: toastId });
        } else {
          toast.error("Could not fetch lyrics for the found songs.", { id: toastId });
          setSearchResults([]);
        }
      }
    } catch (err) {
      toast.error("Error searching lyrics.", { id: toastId });
    }
    setIsUploading(false);
  };

  const addSearchedSong = async (song: {title: string, artist: string, lyrics: string}) => {
    const toastId = toast.loading('Saving song...');
    try {
      await addSong(song.title, song.artist, song.lyrics);
      toast.success('Song added successfully!', { id: toastId });
      setShowSongModal(false);
      setSearchResults([]);
      setSongTitle("");
      setSongArtist("");
      fetchStats();
    } catch (e) {
      toast.error('Failed to save song', { id: toastId });
    }
  };

  return (
    <div className="container" style={{ paddingTop: "2rem" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h2>Dashboard</h2>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link to="/panel" className="btn btn-primary">
            Launch Control Panel
          </Link>
          <Link to="/" className="btn btn-secondary">
            Home
          </Link>
        </div>
      </header>

      <div className="glass-card">
        <h3 style={{ marginBottom: "1rem" }}>Manage Songs & Bibles</h3>
        <p className="text-secondary" style={{ marginBottom: "1.5rem" }}>
          Upload your Zefania XMLs and store songs here.
        </p>

        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          }}
        >
          <div
            style={{
              padding: "1rem",
              background: "rgba(255,255,255,0.05)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <h4>Songs</h4>
            <p className="text-muted" style={{ margin: "0.5rem 0" }}>
              {songsCount} songs in library
            </p>
            <button
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => setShowSongModal(true)}
            >
              Add Song
            </button>
          </div>
          <div
            style={{
              padding: "1rem",
              background: "rgba(255,255,255,0.05)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <h4>Bibles</h4>
            <p className="text-muted" style={{ margin: "0.5rem 0" }}>
              {biblesCount} bibles loaded
            </p>
            <label
              className="btn btn-secondary"
              style={{
                width: "100%",
                display: "inline-block",
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              Upload XML File
              <input
                type="file"
                accept=".xml"
                multiple
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>
      </div>

      {showSongModal && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="glass-card"
            style={{
              width: "90%",
              maxWidth: "500px",
              background: "var(--bg-panel)",
            }}
          >
            <h3 style={{ marginBottom: "1rem" }}>Add New Song</h3>

            <div
              style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}
            >
              <button
                className={`btn ${songInputMode === "paste" ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "0.5rem", flex: 1, fontSize: "0.85rem" }}
                onClick={() => setSongInputMode("paste")}
              >
                Paste / Type
              </button>
              <button
                className={`btn ${songInputMode === "online" ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "0.5rem", flex: 1, fontSize: "0.85rem" }}
                onClick={() => setSongInputMode("online")}
              >
                Search Online
              </button>
              <button
                className={`btn ${songInputMode === "upload" ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "0.5rem", flex: 1, fontSize: "0.85rem" }}
                onClick={() => setSongInputMode("upload")}
              >
                Upload TXTs
              </button>
            </div>

            {songInputMode === "upload" ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  alignItems: "center",
                  padding: "2rem",
                  border: "2px dashed var(--border-subtle)",
                  borderRadius: "8px",
                }}
              >
                <p className="text-secondary">
                  Select one or multiple .txt files
                </p>
                <label
                  className="btn btn-primary"
                  style={{ cursor: "pointer" }}
                >
                  Choose TXT Files
                  <input
                    type="file"
                    accept=".txt"
                    multiple
                    style={{ display: "none" }}
                    onChange={handleTxtUpload}
                    disabled={isUploading}
                  />
                </label>
                {isUploading && <p className="text-muted">Uploading...</p>}
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: "1rem" }}
                  onClick={() => setShowSongModal(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleAddSong}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <input
                  type="text"
                  className="input"
                  placeholder="Song Title"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  required
                />
                <input
                  type="text"
                  className="input"
                  placeholder="Artist (Optional)"
                  value={songArtist}
                  onChange={(e) => setSongArtist(e.target.value)}
                />

                {songInputMode === "paste" && (
                  <textarea
                    className="input"
                    placeholder="Paste lyrics here..."
                    style={{ height: "200px", resize: "vertical" }}
                    value={songLyrics}
                    onChange={(e) => setSongLyrics(e.target.value)}
                    required
                  />
                )}

                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowSongModal(false); setSearchResults([]); }}>Cancel</button>
                  {songInputMode === "online" ? (
                    <button type="button" className="btn btn-primary" onClick={handleOnlineSearch} disabled={isUploading}>{isUploading ? "Searching..." : "Search"}</button>
                  ) : (
                    <button type="submit" className="btn btn-primary" disabled={isUploading}>{isUploading ? "Saving..." : "Save Song"}</button>
                  )}
                </div>
              </form>
            )}

            {searchResults.length > 0 && songInputMode === 'online' && (
              <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                <h4 style={{ marginBottom: '1rem' }}>Search Results</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {searchResults.map((song, idx) => (
                    <div 
                      key={idx}
                      onMouseEnter={() => setHoveredSongIdx(idx)}
                      onMouseLeave={() => setHoveredSongIdx(null)}
                      style={{
                        position: 'relative',
                        padding: '1rem',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: '1px solid transparent',
                        transition: 'all 0.2s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      className="hover-bg-lighter"
                      onClick={() => addSearchedSong(song)}
                    >
                      <div>
                        <strong>{song.title}</strong>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{song.artist}</p>
                      </div>
                      <span className="text-primary" style={{ fontSize: '0.85rem' }}>Click to Add +</span>

                      {hoveredSongIdx === idx && (
                        <div style={{
                          position: 'absolute',
                          bottom: '100%',
                          left: '0',
                          right: '0',
                          background: 'var(--bg-panel)',
                          border: '1px solid var(--border-subtle)',
                          padding: '1rem',
                          borderRadius: '8px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                          zIndex: 100,
                          marginBottom: '10px',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          fontSize: '0.85rem',
                          whiteSpace: 'pre-wrap'
                        }}>
                          <strong>Lyrics Preview:</strong><br/><br/>
                          {song.lyrics}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {showBibleModal && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="glass-card"
            style={{
              width: "90%",
              maxWidth: "500px",
              background: "var(--bg-panel)",
            }}
          >
            <h3 style={{ marginBottom: "1rem" }}>Upload Bibles</h3>
            <p className="text-secondary" style={{ marginBottom: "1rem" }}>
              You have selected {selectedBibles.length} XML file(s):
            </p>
            <ul
              style={{
                maxHeight: "150px",
                overflowY: "auto",
                marginBottom: "1.5rem",
                background: "rgba(0,0,0,0.2)",
                padding: "1rem",
                borderRadius: "8px",
                listStyleType: "none",
              }}
            >
              {selectedBibles.map((file, i) => (
                <li key={i} style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                  📄 {file.name}
                </li>
              ))}
            </ul>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowBibleModal(false);
                  setSelectedBibles([]);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleUploadBibles}
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
