//------------------------------------------------------------------------------------------------------------------
//    初期設定
//------------------------------------------------------------------------------------------------------------------
// 曲リスト
import { songListBGM } from "../songlist_BGM.js";
import { songListSAS } from "../songlist_SAS.js";

// Firebase SDK 読み込み
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getDatabase, ref, onValue, push } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

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
const btnAnswer = document.getElementById("btnAnswer");
const myId = document.getElementById("myId");

// 音声プレイヤー
let audio = new Audio();

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
// コマンド受信（SC1 / SC2 / SC4）
onValue(ref(db, "commands/current"), (snapshot) => {
  const cmd = snapshot.val();
  if (!cmd) return;

  const parts = cmd.split(",");

  // SC1（Ready）
  if (parts[0] === "SC1") {
    artist.textContent = "Ready";
    title.textContent = "";
    btnAnswer.disabled = false;
    audio.pause();
  }

  // SC2（イントロ再生）
  if (parts[0] === "SC2") {
    const folder = Number(parts[1]);
    const speed  = Number(parts[2]);
    const songNo = Number(parts[3]);

    let song;
    if (folder === 1) song = songListBGM[songNo - 1];
    if (folder === 2) song = songListSAS[songNo - 1];

    if (!song) return;

    artist.textContent = "";
    title.textContent  = "";

    audio.pause();
    audio = new Audio(song.url);

    // 再生速度は固定（必要なら）
    audio.playbackRate = 1.0;

    audio.currentTime = 0;
    audio.play();

    // 再生時間を speed で切り替え
    let durationMs = 3000; // デフォルト3秒

    if (speed === 1) durationMs = 3000; // 3秒
    if (speed === 2) durationMs = 2000; // 2秒
    if (speed === 3) durationMs = 1000; // 1秒

    setTimeout(() => audio.pause(), durationMs);
  }

  // SC4（正解発表）
  if (parts[0] === "SC4") {
    const folder = Number(parts[1]);
    const speed = Number(parts[2]);
    const songNo = Number(parts[3]);

    let song;
    if (folder === 1) song = songListBGM[songNo - 1];
    if (folder === 2) song = songListSAS[songNo - 1];

    if (!song) return;

    artist.textContent = song.artist;
    title.textContent = song.title;

    // audio が未定義なら作成
    if (!window.audio) {
      window.audio = new Audio();
    }
    
    window.audio.pause();
    window.audio = new Audio(song.url);
    window.audio.play();

    // 30秒後に停止
    setTimeout(() => {window.audio.pause();}, 30000);
  }
});