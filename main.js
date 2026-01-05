// ===============================
// PDF.js 初期設定
// ===============================
const pdfContainer = document.createElement("div");
pdfContainer.style.width = "100%";
pdfContainer.style.maxWidth = "100vw";
pdfContainer.style.background = "#111";
pdfContainer.style.display = "flex";
pdfContainer.style.flexDirection = "column";
pdfContainer.style.alignItems = "center";
document.body.appendChild(pdfContainer);

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let pdfDoc = null;
let pageCanvases = [];

pdfjsLib.getDocument("sample.pdf").promise.then(async (pdf) => {
  pdfDoc = pdf;
  await renderAllPages();
});

async function renderAllPages() {
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.display = "block";
    canvas.style.margin = "10px 0";
    canvas.style.maxWidth = "95vw";
    pdfContainer.appendChild(canvas);
    pageCanvases[i - 1] = canvas;
    await page.render({
      canvasContext: canvas.getContext("2d"),
      viewport: viewport,
    }).promise;
  }
}

// ===============================
// カメラ & 顔検出
// ===============================
const video = document.createElement("video");
video.style.display = "none";
document.body.appendChild(video);

// デバッグ表示
const debug = document.createElement("div");
debug.style.position = "fixed";
debug.style.top = "10px";
debug.style.left = "10px";
debug.style.background = "rgba(0,0,0,0.7)";
debug.style.color = "lime";
debug.style.padding = "8px";
debug.style.fontSize = "16px";
debug.style.zIndex = "9999";
debug.innerText = "起動中...";
document.body.appendChild(debug);

// ===============================
// 顔の上下でスクロール（中央基準）
let scrollSpeed = 0;
const SCROLL_MAX_SPEED = 10;
const DELTA_THRESHOLD = 0.02;
let baselineY = null;

const faceMesh = new FaceMesh({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});

faceMesh.setOptions({
  maxNumFaces: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

function scrollLoop() {
  if (scrollSpeed !== 0) {
    window.scrollBy({ top: scrollSpeed, behavior: "auto" });
  }
  requestAnimationFrame(scrollLoop);
}
scrollLoop();

faceMesh.onResults((results) => {
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];
    const noseY = landmarks[1].y;
    const leftEyeY = (landmarks[33].y + landmarks[133].y) / 2;
    const rightEyeY = (landmarks[362].y + landmarks[263].y) / 2;
    const faceY = (noseY + leftEyeY + rightEyeY) / 3;

    if (baselineY === null) {
      baselineY = faceY;
      debug.innerText = "📌 基準位置設定";
      return;
    }

    const delta = faceY - baselineY;

    if (delta > DELTA_THRESHOLD) {
      scrollSpeed = SCROLL_MAX_SPEED;
      debug.innerText = `⬇ 下向き：スクロール下 (Δ=${delta.toFixed(3)})`;
    } else if (delta < -DELTA_THRESHOLD) {
      scrollSpeed = -SCROLL_MAX_SPEED;
      debug.innerText = `⬆ 上向き：スクロール上 (Δ=${delta.toFixed(3)})`;
    } else {
      scrollSpeed = 0;
      debug.innerText = `➡ 中央：スクロール停止 (Δ=${delta.toFixed(3)})`;
    }
  } else {
    scrollSpeed = 0;
    debug.innerText = "😑 顔が見えない";
  }
});

const camera = new Camera(video, {
  onFrame: async () => {
    await faceMesh.send({ image: video });
  },
  width: 640,
  height: 480,
});

navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
    video.play();
    camera.start();
    debug.innerText = "📷 カメラ起動";
  })
  .catch(() => {
    debug.innerText = "❌ カメラ起動失敗";
  });

// ===============================
// 右下テンポ表示
// ===============================
const tempoDisplay = document.createElement("div");
tempoDisplay.id = "tempoDisplay";
tempoDisplay.style.position = "fixed";
tempoDisplay.style.bottom = "20px";
tempoDisplay.style.right = "20px";
tempoDisplay.style.width = "120px";
tempoDisplay.style.height = "20px";
tempoDisplay.style.display = "flex";
tempoDisplay.style.alignItems = "center";
tempoDisplay.style.justifyContent = "flex-start";
tempoDisplay.style.background = "rgba(0,0,0,0.5)";
tempoDisplay.style.padding = "2px 5px";
tempoDisplay.style.borderRadius = "8px";
tempoDisplay.style.zIndex = "9999";
document.body.appendChild(tempoDisplay);

const dot = document.createElement("div");
dot.style.width = "10px";
dot.style.height = "10px";
dot.style.borderRadius = "50%";
dot.style.background = "lime";
dot.style.transform = "scale(0.5)";
dot.style.transition = "transform 0.1s";
tempoDisplay.appendChild(dot);

// BPMスライダー
const bpmSlider = document.createElement("input");
bpmSlider.type = "range";
bpmSlider.min = "50";
bpmSlider.max = "160";
bpmSlider.value = "120";
bpmSlider.style.marginLeft = "10px";
tempoDisplay.appendChild(bpmSlider);

let bpm = parseInt(bpmSlider.value);
bpmSlider.addEventListener("input", (e) => {
  bpm = parseInt(e.target.value);
});

// テンポアニメーション
let dotPos = 0;
let direction = 1;

function tempoLoop() {
  const beatTime = 60 / bpm; // 1拍の秒数
  // 左→右移動
  dotPos += direction * 1; // 1%ずつ
  if (dotPos >= 100) { dotPos = 100; direction = -1; }
  if (dotPos <= 0) { dotPos = 0; direction = 1; }

  dot.style.transform = `translateX(${dotPos}%) scale(${0.5 + 0.5 * Math.sin((dotPos/100)*Math.PI)})`;
  requestAnimationFrame(tempoLoop);
}
tempoLoop();
