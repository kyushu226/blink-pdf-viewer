/***********************
 * PDF.js 設定
 ***********************/
const url = "sample.pdf";
const canvas = document.getElementById("pdfCanvas");
const ctx = canvas.getContext("2d");

let pdfDoc = null;
let pageNum = 1;
let scale = 1.4;

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

pdfjsLib.getDocument(url).promise.then((pdf) => {
  pdfDoc = pdf;
  renderPage(pageNum);
});

function renderPage(num) {
  pdfDoc.getPage(num).then((page) => {
    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    page.render({
      canvasContext: ctx,
      viewport: viewport,
    });
  });
}

/***********************
 * カメラ & 顔認識
 ***********************/
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
debug.innerText = "📷 カメラ起動中";
document.body.appendChild(debug);

// 正面キャリブレーション
let calibrated = false;
let neutralY = 0;

// スクロール制御
let scrollMode = "stop"; // up / down / stop
let scrollSpeed = 0;

// BPM制御
const bpmSlider = document.getElementById("bpmSlider");
const bpmLabel = document.getElementById("bpmLabel");
const tempo = document.getElementById("tempo");

let bpm = 120;
bpmSlider.oninput = () => {
  bpm = Number(bpmSlider.value);
  bpmLabel.innerText = `BPM: ${bpm}`;
};

let tempoIndex = 0;
setInterval(() => {
  tempoIndex = (tempoIndex + 1) % 5;
  tempo.innerText = "・・・・".split("").map((c, i) => i === tempoIndex ? "●" : "・").join("");
}, () => (60000 / bpm) / 4);

// FaceMesh
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
  if (!results.multiFaceLandmarks) return;

  const landmarks = results.multiFaceLandmarks[0];

  // 鼻先（安定）
  const noseY = landmarks[1].y;

  // キャリブレーション
  if (!calibrated) {
    neutralY = noseY;
    calibrated = true;
    debug.innerText = "✅ 正面を記憶しました";
    return;
  }

  const diff = noseY - neutralY;

  // 閾値
  const threshold = 0.03;

  if (diff > threshold) {
    scrollMode = "down";
    scrollSpeed = Math.min(diff * 3000, 30);
    debug.innerText = "⬇️ 下向き：スクロール中";
  } else if (diff < -threshold) {
    scrollMode = "up";
    scrollSpeed = Math.min(-diff * 3000, 30);
    debug.innerText = "⬆️ 上向き：スクロール中";
  } else {
    scrollMode = "stop";
    debug.innerText = "⏸ 正面：停止";
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
  })
  .catch(() => {
    debug.innerText = "❌ カメラ起動失敗";
  });

/***********************
 * スクロールループ
 ***********************/
function scrollLoop() {
  if (scrollMode === "down") {
    window.scrollBy(0, scrollSpeed);
  } else if (scrollMode === "up") {
    window.scrollBy(0, -scrollSpeed);
  }
  requestAnimationFrame(scrollLoop);
}

scrollLoop();
