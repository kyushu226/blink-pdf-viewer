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
pdfjsLib.getDocument("sample.pdf").promise.then((pdf) => {
  pdfDoc = pdf;
  renderAllPages();
});

// 全ページを描画する関数
function renderAllPages() {
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    pdfDoc.getPage(i).then((page) => {
      const viewport = page.getViewport({ scale: 1.2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.display = "block";
      canvas.style.margin = "10px auto";
      pdfContainer.appendChild(canvas);
      page.render({
        canvasContext: canvas.getContext("2d"),
        viewport: viewport,
      });
      pageCanvases[i - 1] = canvas;
    });
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
    // 顔の中央の y 座標（鼻先あたり）
    const noseY = landmarks[1].y; // 正規化された0~1

    if (prevY !== null) {
      const delta = noseY - prevY;
      // 顔が下に動いたら下にスクロール
      window.scrollBy({
        top: delta * 1000, // 感度調整
        behavior: "smooth",
      });
    }
    prevY = noseY;

    debug.innerText = `🙂 顔検出中`;
  } else {
    debug.innerText = `😑 顔が見えない`;
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
