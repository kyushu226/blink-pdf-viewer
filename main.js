// ===============================
// PDF.js 初期設定
// ===============================
const canvas = document.getElementById("pdfCanvas");
const ctx = canvas.getContext("2d");

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let pdfDoc = null;
let pageNum = 1;

// PDF読み込み
pdfjsLib.getDocument("sample.pdf").promise.then((pdf) => {
  pdfDoc = pdf;
  renderPage();
});

// PDFを描画する関数
function renderPage() {
  pdfDoc.getPage(pageNum).then((page) => {
    const viewport = page.getViewport({ scale: 1.5 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    page.render({
      canvasContext: ctx,
      viewport: viewport,
    });

    debug.innerText = `📄 ページ ${pageNum} / ${pdfDoc.numPages}`;
  });
}

// ===============================
// カメラ & 顔検出（MediaPipe）
// ===============================

// video要素（非表示）
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

let faceDetected = false;
let lastTrigger = 0;
let faceLostTime = 0;

// FaceMesh 初期化
const faceMesh = new FaceMesh({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});

faceMesh.setOptions({
  maxNumFaces: 1,
  minDetectionConfidence: 0.3,
  minTrackingConfidence: 0.3,
});

// 顔検出結果
faceMesh.onResults((results) => {
  const now = Date.now();

  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    if (!faceDetected) {
      faceDetected = true;
      faceLostTime = 0;
    }
    debug.innerText = "🙂 顔検出中";
  } else {
    debug.innerText = "😑 顔が見えない";

    if (faceDetected && faceLostTime === 0) {
      faceLostTime = now;
    }

    if (faceLostTime > 0 && now - faceLostTime > 300) {
      const duration = now - faceLostTime;
      faceDetected = false;
      faceLostTime = 0;

      // 長いまばたき → 前ページ
      if (duration > 1800) {
        if (pageNum > 1) {
          pageNum--;
          renderPage();
          debug.innerText = "⬅ 前のページ";
        }
      }
      // 短いまばたき → 次ページ
      else if (duration > 300) {
        if (pageNum < pdfDoc.numPages) {
          pageNum++;
          renderPage();
          debug.innerText = "➡ 次のページ";
        }
      }
    }
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
