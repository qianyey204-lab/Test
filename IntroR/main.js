//------------------------------------------------------------------------------------------------------------------
//    初期設定
//------------------------------------------------------------------------------------------------------------------
// ★ ページ読み込み後、最初のユーザー操作で Audio を解放する
window.addEventListener("click", () => {
  if (!window._audioUnlocked) {
    window.audio = new Audio();
    window.audio.preload = "auto";   // ← これが絶対に必要
    window.audio.muted = true;

    window.audio.play().then(() => {
      window.audio.pause();
      window.audio.muted = false;
      window._audioUnlocked = true;
      console.log("Audio unlocked");
    }).catch(e => console.log("unlock failed:", e));
  }
}, { once: true });

// 曲リスト
import { songListBGM } from "../songlist_BGM.js";
import { songListSAS } from "../songlist_SAS.js";

// Firebase SDK 読み込み
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getDatabase, ref, onValue, push } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

import { set } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

// Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyBiMbPLYjpzKyeb5JH8djxTRTEMhSDXjdk",
  authDomain: "intro-21.firebaseapp.com",
  databaseURL: "https://intro-21-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "intro-21",
  storageBucket: "intro-21.firebasestorage.app",
  messagingSenderId: "147380245042",
  appId: "1:147380245042:web:95784f969f8a3150bfe22b"
};

// Firebase 初期化
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// UI 要素
const artist = document.getElementById("artist");
const title = document.getElementById("title");
const btnReset = document.getElementById("btnReset");
const btnAnswer = document.getElementById("btnAnswer");
const myId = document.getElementById("myId");

// 変数
let cachedFolder = null;
let cachedSongNo = null;
let isCachedReady = false;

//------------------------------------------------------------------------------------------------------------------
//    リセットボタン処理
//------------------------------------------------------------------------------------------------------------------
// リセットボタン
btnReset.addEventListener("click", () => {
    window.audio.pause();

    // ボタン表示を「OK」に変更
    btnReset.textContent = "OK";

    // 1秒後に「RESET」に戻す
    setTimeout(() => {
        btnReset.textContent = "RESET";
    }, 1000);
});

//------------------------------------------------------------------------------------------------------------------
//    回答ボタン処理
//------------------------------------------------------------------------------------------------------------------
// 回答ボタン → SC3（回答者ID）送信
btnAnswer.addEventListener("click", () => {
  const id = myId.value;
  push(ref(db, "answers/list"), id);
  btnAnswer.disabled = true;
});

//------------------------------------------------------------------------------------------------------------------
//    通信コマンド受信
//------------------------------------------------------------------------------------------------------------------
// コマンド受信（SC1 / SC2 / SC4 / SC7）
onValue(ref(db, "commands/current"), (snapshot) => {
  const cmd = snapshot.val();
  if (!cmd) return;

  const parts = cmd.split(",");

  // SC1（Ready）
  if (parts[0] === "SC1") {
    artist.textContent = "--- 準備OK? はじめるよ ---";
    title.textContent = "";
    btnAnswer.disabled = false;
    
      // audio が未定義なら作成
    if (!window.audio) {
      window.audio = new Audio();
    }

    window.audio.pause();
  }

  // SC2（イントロ再生）
  if (parts[0] === "SC2") {
    const folder = Number(parts[1]);
    const speed  = Number(parts[2]);
    const songNo = Number(parts[3]);

    // メモリ内の曲と一致している場合のみ再生
    if (!(isCachedReady && cachedFolder === folder && cachedSongNo === songNo)) {
      // 一致していない場合は、ダウンロード開始のみ（演奏しないで終了）
      let song;
      if (folder === 1) song = songListBGM[songNo - 1];
      if (folder === 2) song = songListSAS[songNo - 1];
      if (!song || !song.url) return;

      cachedFolder = folder;
      cachedSongNo = songNo;
      isCachedReady = false;

      window.audio.pause();
      window.audio.src = song.url;
      window.audio.currentTime = 0;
      window.audio.addEventListener(
        "canplaythrough",
        () => {
          isCachedReady = true;
        },
        { once: true }
      );
      window.audio.load();
      return;
    }

    // 一致しているので即再生
    artist.textContent = "";
    title.textContent  = "";

    window.audio.pause();
    window.audio.currentTime = 0;

    // 再生時間を speed で切り替え
    let durationMs = 3000; // デフォルト3秒
    if (speed === 1) durationMs = 3500; // 3秒
    if (speed === 2) durationMs = 2500; // 2秒
    if (speed === 3) durationMs = 1500; // 1秒

    // 既存の onplaying をクリア（多重登録防止）
    window.audio.onplaying = null;

    // 実際に音が鳴り始めた瞬間にタイマー開始
    window.audio.onplaying = () => {
      setTimeout(() => {
        window.audio.pause();
      }, durationMs);
    };

    window.audio.play().catch(err => console.error("再生エラー:", err));

    return;
  }

  // SC4（正解発表）
  if (parts[0] === "SC4") {
    const folder = Number(parts[1]);
    const speed = Number(parts[2]);
    const songNo = Number(parts[3]);

    // メモリ内の曲と一致している場合のみ30秒再生
    if (!(isCachedReady && cachedFolder === folder && cachedSongNo === songNo)) {
      // 一致していない場合はダウンロードせず、演奏もしないで終了
      return;
    }

    let song;
    if (folder === 1) song = songListBGM[songNo - 1];
    if (folder === 2) song = songListSAS[songNo - 1];
    if (!song) return;

    artist.textContent = song.artist;
    title.textContent  = song.title;

    window.audio.pause();
    window.audio.currentTime = 0;
    window.audio.src = song.url; // ← 必須

    // 実際に音が鳴り始めた瞬間にタイマー開始
    window.audio.onplaying = () => {
      setTimeout(() => {
        window.audio.pause();
      }, 10000);
    };

    window.audio.play().catch(err => console.error("再生エラー:", err));

    return;
  }

  // SC5（選曲・プリロード指示）
  if (parts[0] === "SC5") {
    const folder = Number(parts[1]);
    const songNo = Number(parts[2]);

    let song;
    if (folder === 1) song = songListBGM[songNo - 1];
    if (folder === 2) song = songListSAS[songNo - 1];
    if (!song || !song.url) return;

    cachedFolder = folder;
    cachedSongNo = songNo;
    isCachedReady = false;

    // 先に無音再生
    window.audio.pause();
    window.audio.muted = false;

    // 音源ダウンロード
    window.audio.src = song.url;
    window.audio.preload = "auto";
    window.audio.currentTime = 0;

    window.audio.addEventListener("loadeddata", () => {
      isCachedReady = true;
    }, { once: true });

    window.audio.load();

    return;
  }

  // SC7（音量調整）
  if (parts[0] === "SC7") {
    const folder = Number(parts[1]);
    const songNo = Number(parts[2]);

    let song;
    if (folder === 1) song = songListBGM[songNo - 1];
    if (folder === 2) song = songListSAS[songNo - 1];
    if (!song) return;

    cachedFolder = folder;
    cachedSongNo = songNo;
    isCachedReady = false;

    // 先に無音再生
    window.audio.pause();
    window.audio.muted = false;

    // 音源ダウンロード
    window.audio.src = song.url;
    window.audio.preload = "auto";
    window.audio.currentTime = 0;

    window.audio.addEventListener("loadeddata", () => {
      isCachedReady = true;
    }, { once: true });

    window.audio.load();

    // 一致しているので即再生
    artist.textContent = "--- 音量調整してネ！ ---";
    title.textContent  = "";

    window.audio.pause();

    window.audio.play().catch(err => console.error("再生エラー:", err));

    return;
  }
});