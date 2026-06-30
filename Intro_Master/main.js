//------------------------------------------------------------------------------------------------------------------
//    初期設定
//------------------------------------------------------------------------------------------------------------------
// 曲リスト
import { songListBGM } from "../songlist_BGM.js";
import { songListSAS } from "../songlist_SAS.js";

// Firebase SDK 読み込み
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

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

//------------------------------------------------------------------------------------------------------------------
//    通信コマンド送信
//------------------------------------------------------------------------------------------------------------------
// SC0（コマンドリセット）
window.sendSC0 = function (folder, songNo) {
  const cmd = `SC0`;
  set(ref(db, "commands/current"), cmd);

  window.audio.pause();
};

// SC1（Ready）
window.sendSC1 = function () {
  set(ref(db, "commands/current"), "SC1");
  set(ref(db, "answers/list"), []);  // 回答者リストをリセット
  document.getElementById("ans1").textContent = "-";
  document.getElementById("ans2").textContent = "-";
  document.getElementById("ans3").textContent = "-";
  document.getElementById("ans4").textContent = "-";
  document.getElementById("ans5").textContent = "-";

  // ボタンを強制的に有効化
  document.getElementById("select-btn").disabled = false;
  document.getElementById("play-btn").disabled = false;
  document.getElementById("answer-btn").disabled = false;
  document.getElementById("volume-btn").disabled = false;
  
  // audio が未定義なら作成
  if (!window.audio) {
    window.audio = new Audio();
  }

  window.audio.pause();
};

// SC2（PLAY）
window.sendSC2 = function (folder, speed, songNo) {
  const cmd = `SC2,${folder},${speed},${songNo}`;
  set(ref(db, "commands/current"), cmd);
};

// SC4（回答）
window.sendSC4 = function (folder, speed, songNo) {
  const cmd = `SC4,${folder},${speed},${songNo}`;
  set(ref(db, "commands/current"), cmd);
};

// SC5（選曲・プリロード指示）
window.sendSC5 = function (folder, songNo) {
  const cmd = `SC5,${folder},${songNo}`;
  set(ref(db, "commands/current"), cmd);
};

// SC7（音量調整）
window.sendSC7 = function (folder, songNo) {
  const cmd = `SC7,${folder},${songNo}`;
  set(ref(db, "commands/current"), cmd);
};

//------------------------------------------------------------------------------------------------------------------
//    変数
//------------------------------------------------------------------------------------------------------------------
// 選曲結果を保持（SC2/SC4 で使う）
let selectedFolder = 1;   // 1=BGM, 2=SAS
let selectedSongNo = 0;   // 1〜100 or 1〜20

// 重複防止用の配列（フォルダ別に管理）
let used = [];  // {folder:1, no:5} のように保存

// 出題者側のプリロード状態
let cachedFolder = null;
let cachedSongNo = null;
let isCachedReady = false;

//------------------------------------------------------------------------------------------------------------------
//    選曲ボタン処理
//------------------------------------------------------------------------------------------------------------------
window.selectSong = function () {
  // ボタンを無効化
  document.getElementById("select-btn").disabled = true;
  document.getElementById("play-btn").disabled = true;
  document.getElementById("answer-btn").disabled = true;
  document.getElementById("volume-btn").disabled = true;

  // フォルダ選択（UI の ComboBox などで選ぶ想定）
  const folder = Number(document.getElementById("folder").value);
  selectedFolder = folder;
  const mode = Number(document.getElementById("disp-ans").value);

  // 曲リストを決定
  const list = (folder === 1) ? songListBGM : songListSAS;

  // 未使用曲だけを抽出
  const unused = list.filter(song =>
    !used.some(u => u.folder === folder && u.no === Number(song.no))
  );

  // 未使用曲がゼロなら終了（エラー防止）
  if (unused.length === 0) {
    alert("このフォルダの曲はすべて使用済みです！");
    return;
  }

  // ランダム選曲
  const r = Math.floor(Math.random() * unused.length);
  const song = unused[r];

  // 選曲番号を保持（SC2/SC4 で使う）
  selectedSongNo = song.no;

  // 使用済みに追加
  used.push({ folder, no: song.no });

  // UI に反映
  if (mode === 2) {
    document.getElementById("artist").textContent = song.artist;
    document.getElementById("title").textContent = song.title;
  }

  // 選曲数カウンタを増やす
  const cnt = Number(document.getElementById("count").textContent);
  document.getElementById("count").textContent = cnt + 1;

  // 回答者側にもプリロード指示（SC5）
  window.sendSC5(folder, song.no);

  // プリロード（出題者側）
  const audio = new Audio();
  window.audio = audio;

  isCachedReady = false;
  cachedFolder = folder;
  cachedSongNo = song.no;

  window.audio.src = song.url;
  window.audio.currentTime = 0;

  // 読み込み完了で「選曲完了」
  const onReady = () => {
    if (isCachedReady) return; // 二重発火防止
    isCachedReady = true;

    document.getElementById("select-btn").disabled = false;
    document.getElementById("play-btn").disabled = false;
    document.getElementById("answer-btn").disabled = false;
    document.getElementById("volume-btn").disabled = false;

    window.audio.removeEventListener("canplaythrough", onReady);
    window.audio.removeEventListener("canplay", onReady);
    window.audio.removeEventListener("loadeddata", onReady);
  };

  const onError = () => {
    alert("音声の読み込みに失敗しました。ネットワークを確認してください。");
    document.getElementById("select-btn").disabled = false;
    document.getElementById("play-btn").disabled = false;
    document.getElementById("answer-btn").disabled = false;
    document.getElementById("volume-btn").disabled = false;

    window.audio.removeEventListener("error", onError);
  };

  window.audio.addEventListener("canplaythrough", onReady);
  window.audio.addEventListener("canplay", onReady);
  window.audio.addEventListener("loadeddata", onReady);
  window.audio.addEventListener("error", onError);

  window.audio.load();
};

//------------------------------------------------------------------------------------------------------------------
//    PLAYボタン処理（プリロード済みを即再生）
//------------------------------------------------------------------------------------------------------------------
window.sendPlay = function () {
  const speed = Number(document.getElementById("speed").value);

  // SC2 を送信
  window.sendSC2(selectedFolder, speed, selectedSongNo);

  // 出題者側だけ再生（受信はしない）
  let song;
  if (selectedFolder === 1) song = songListBGM[selectedSongNo - 1];
  if (selectedFolder === 2) song = songListSAS[selectedSongNo - 1];

  // audio が未定義なら作成
  if (!window.audio) {
    window.audio = new Audio();
  }

  window.audio.pause();
  window.audio.src = song.url;
  window.audio.currentTime = 0;

  // speed に応じて停止
  let durationMs = 3000;
  if (speed === 1) durationMs = 3500;
  if (speed === 2) durationMs = 2500;
  if (speed === 3) durationMs = 1500;

  // 既存の onplaying をクリア（多重登録防止）
  window.audio.onplaying = null;

  // 実際に音が鳴り始めた瞬間にタイマー開始
  window.audio.onplaying = () => {
    setTimeout(() => {
      window.audio.pause();
    }, durationMs);
  };

  // === window.audio.play().catch(err => console.error("再生エラー:", err));
  window.audio.play().catch(err => console.error("再生エラー:", err));
};

//------------------------------------------------------------------------------------------------------------------
//    回答ボタン処理（30秒再生もプリロード利用）
//------------------------------------------------------------------------------------------------------------------
window.sendAnswer = function () {
  const speed = Number(document.getElementById("speed").value);
  window.sendSC4(selectedFolder, speed, selectedSongNo);
  const mode = Number(document.getElementById("disp-ans").value);

  // 出題者側だけ再生（受信はしない）
  let song;
  if (selectedFolder === 1) song = songListBGM[selectedSongNo - 1];
  if (selectedFolder === 2) song = songListSAS[selectedSongNo - 1];

  if (!song || !song.url) {
    console.error("song URL が不正:", song);
    return;
  }

  // audio が未定義なら作成
  if (!window.audio) {
    window.audio = new Audio();
  }

  // UI に反映
  if (mode === 1) {
    document.getElementById("artist").textContent = song.artist;
    document.getElementById("title").textContent = song.title;
  }

  // 再生
  // プリロード済みならそのまま使用、違えばフォールバック
  if (!(isCachedReady && cachedFolder === selectedFolder && cachedSongNo === selectedSongNo)) {
    window.audio.pause();
    window.audio.src = song.url;
    window.audio.currentTime = 0;
  }

  // 実際に音が鳴り始めた瞬間にタイマー開始
  window.audio.onplaying = () => {
    setTimeout(() => {
      window.audio.pause();
    }, 10000);
  };

  // === window.audio.play().catch(err => console.error("再生エラー:", err));
  window.audio.play().catch(err => console.error("再生エラー:", err));
};

//------------------------------------------------------------------------------------------------------------------
//    音調ボタン処理
//------------------------------------------------------------------------------------------------------------------
window.sendVolume = function () {
  // SC7 を送信
  window.sendSC7(selectedFolder, selectedSongNo);

  // 出題者側だけ再生（受信はしない）
  let song;
  if (selectedFolder === 1) song = songListBGM[selectedSongNo - 1];
  if (selectedFolder === 2) song = songListSAS[selectedSongNo - 1];

  // audio が未定義なら作成
  if (!window.audio) {
    window.audio = new Audio();
  }

  window.audio.pause();
  window.audio.src = song.url;
  window.audio.currentTime = 0;

  // === window.audio.play().catch(err => console.error("再生エラー:", err));
  window.audio.play().catch(err => console.error("再生エラー:", err));
};

//------------------------------------------------------------------------------------------------------------------
//    フォルダ変更
//------------------------------------------------------------------------------------------------------------------
// フォルダ変更時の処理
document.getElementById("folder").addEventListener("change", () => {
  // 選曲数を 0 に戻す
  document.getElementById("count").textContent = 0;

  // used をリセット（フォルダ別管理ならそのフォルダだけ消す）
  used = [];

  document.getElementById("artist").textContent = "-";
  document.getElementById("title").textContent = "-";

  cachedFolder = null;
  cachedSongNo = null;
  isCachedReady = false;
});

//------------------------------------------------------------------------------------------------------------------
//    通信コマンド受信
//------------------------------------------------------------------------------------------------------------------
// SC3（回答者ID）受信
onValue(ref(db, "answers/list"), (snapshot) => {
const list = snapshot.val();
if (!list) return;
  const ids = Object.values(list); // push() のため配列化

  // 5件まで表示
  document.getElementById("ans1").textContent = ids[0] ?? "-";
  document.getElementById("ans2").textContent = ids[1] ?? "-";
  document.getElementById("ans3").textContent = ids[2] ?? "-";
  document.getElementById("ans4").textContent = ids[3] ?? "-";
  document.getElementById("ans5").textContent = ids[4] ?? "-";
});

//------------------------------------------------------------------------------------------------------------------
//    フォルダ切替処理
//------------------------------------------------------------------------------------------------------------------
document.getElementById("folder").addEventListener("change", () => {
  const folder = Number(document.getElementById("folder").value);

  // 選曲数を 0 に戻す
  document.getElementById("count").textContent = 0;

  // そのフォルダの使用済みだけリセット
  used[folder] = [];

  // UI 初期化
  document.getElementById("artist").textContent = "-";
  document.getElementById("title").textContent = "-";

  cachedFolder = null;
  cachedSongNo = null;
  isCachedReady = false;
});

// ページ読み込み時に回答欄をクリア
window.addEventListener("load", () => {
  set(ref(db, "commands/current"), "SC0");
  document.getElementById("ans1").textContent = "-";
  document.getElementById("ans2").textContent = "-";
  document.getElementById("ans3").textContent = "-";
  document.getElementById("ans4").textContent = "-";
  document.getElementById("ans5").textContent = "-";
});