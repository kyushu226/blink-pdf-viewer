// ===============================
// PDF.js 初期設定
// ===============================
const pdfContainer = document.createElement("div");
pdfContainer.style.width = "100vw";
pdfContainer.style.background = "#111";
document.body.appendChild(pdfContainer);

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let pdfDoc = null;
let pageCanvases = [];

// PDF読み込み
pdfjsLib.getDocument("sample.pdf").promise.then(async (pdf) => {
  pdfDoc = pdf;
  await renderAllPages();
});

// 全ページ描画（順序を保証）
async function renderAllPages() {
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.display = "block";
    canvas.style.margin = "10px auto";
    pdfContainer.appendChild(canvas);
    pageCanvases[i - 1] = canvas;
    await page.render({
      canvasContext: canvas.getContext("2d"),
      viewport: viewport,
    }).promise;
  }
}

// ===============================
// カメラ & 顔検出（MediaPipe）
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

// 顔の上下位置を追跡
let prevY = null;
const SCROLL_SENSITIVITY = 2500; // ← ここを大きくして大胆スクロール
const SCROLL_THRESHOLD = 0.005; // 小さな動きでも反応させる

const faceMesh = new FaceMesh({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});

faceMesh.setOptions({
  maxNumFaces: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

faceMesh.onResults((results) => {
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];

    // 顔の上下位置（鼻と両目の平均 y）
    const noseY = landmarks[1].y;
    const leftEyeY = (landmarks[33].y + landmarks[133].y) / 2;
    const rightEyeY = (landmarks[362].y + landmarks[263].y) / 2;
    const faceY = (noseY + leftEyeY + rightEyeY) / 3;

    if (prevY !== null) {
      const delta = faceY - prevY;
      if (Math.abs(delta) > SCROLL_THRESHOLD) {
        // 顔の上下変化に応じて大胆スクロール
        window.scrollBy({
          top: delta * SCROLL_SENSITIVITY,
          behavior: "smooth",
        });
      }
    }
    prevY = faceY;
    debug.innerText = "🙂 顔検出中";
  } else {
    debug.innerText = "😑 顔が見えない";
  }
});

// カメラ起動
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
