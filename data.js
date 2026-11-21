// Connection to the ministry's database (Firebase). Shared by the website and the Ministry Desk.
// These values identify the project; they are not secret. Access is controlled by the database rules.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, getDocs,
  collection, query, where, limit, serverTimestamp, deleteField
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore-lite.js";

export const app = initializeApp({
  apiKey: "AIzaSyAQOFMHUx7u6GFGOprdYnx4XMJLYZu00cM",
  authDomain: "restored-hope-ministry.firebaseapp.com",
  projectId: "restored-hope-ministry",
  storageBucket: "restored-hope-ministry.firebasestorage.app",
  messagingSenderId: "673052295948",
  appId: "1:673052295948:web:21c6f9aabe020d8c197f29"
});
export const db = getFirestore(app);
export const ADMIN_EMAIL = "prayer.restoredhope@yahoo.com";
export const TAGS = ["Addiction", "Depression", "Suicide", "Grief", "Shame", "Anxiety", "Other"];

// Pulls the video id out of any normal YouTube link. Returns "" if it isn't one.
export function ytId(url) {
  try {
    const u = new URL(String(url).trim());
    const host = u.hostname.replace(/^(www\.|m\.)/, "");
    let id = "";
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      if (u.pathname === "/watch") id = u.searchParams.get("v") || "";
      else if (["live", "shorts", "embed"].includes(parts[0])) id = parts[1] || "";
    }
    return /^[\w-]{6,20}$/.test(id) ? id : "";
  } catch (e) { return ""; }
}
export const ytEmbed = (id, autoplay) => `https://www.youtube-nocookie.com/embed/${id}?rel=0${autoplay ? "&autoplay=1" : ""}`;
export const ytThumb = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

const home = () => doc(db, "site", "home");
const stories = () => collection(db, "stories");
const rows = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));
const newest = key => (a, b) => (b[key]?.seconds || 0) - (a[key]?.seconds || 0);

// ── What visitors can do ──
export async function getHome() { const s = await getDoc(home()); return s.exists() ? s.data() : {}; }
export async function getStories() {
  return rows(await getDocs(query(stories(), where("status", "==", "approved"), limit(60)))).sort(newest("approvedAt"));
}
export function submitStory({ name, title, tag, note, videoUrl }) {
  return addDoc(stories(), { name, title, tag, note, videoUrl, consent: true, status: "pending", createdAt: serverTimestamp() });
}

// ── What only the ministry can do (the database refuses anyone else) ──
export const setWord = word => setDoc(home(), { word: word ? { ...word, at: serverTimestamp() } : deleteField() }, { merge: true });
export const COLOR_SCHEMES = ["oxblood", "plum", "forest", "gold", "random"];
export function setTheme(theme) {
  if (!COLOR_SCHEMES.includes(theme)) throw new Error("Unknown color scheme");
  return setDoc(home(), { theme }, { merge: true });
}
export const setLive = live => setDoc(home(), { live: { ...live, at: serverTimestamp() } }, { merge: true });
export async function getPending() {
  return rows(await getDocs(query(stories(), where("status", "==", "pending"), limit(60)))).sort(newest("createdAt"));
}
export const approveStory = id => updateDoc(doc(db, "stories", id), { status: "approved", approvedAt: serverTimestamp() });
export const removeStory = id => deleteDoc(doc(db, "stories", id));
export function addStory({ name, title, tag, note, videoUrl }) {
  return addDoc(stories(), { name, title, tag, note, videoUrl, consent: true, status: "approved", createdAt: serverTimestamp(), approvedAt: serverTimestamp() });
}

const wall = () => collection(db, "prayerWall");
export async function getWallPosts(status = "approved") {
  if (status !== "approved" && status !== "pending") throw new Error("Unknown review status");
  return rows(await getDocs(query(wall(), where("status", "==", status), limit(60)))).sort(newest(status === "approved" ? "approvedAt" : "createdAt"));
}
export function submitWallPost({ kind, name, text }) {
  return addDoc(wall(), { kind, name, text, consent: true, status: "pending", createdAt: serverTimestamp() });
}
export const approveWallPost = id => updateDoc(doc(wall(), id), { status: "approved", approvedAt: serverTimestamp() });
export const removeWallPost = id => deleteDoc(doc(wall(), id));
