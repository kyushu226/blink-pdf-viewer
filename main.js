/**********************
 * PDF 全ページ表示
 **********************/
const pdfContainer = document.getElementById("pdfContainer");
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

document.getElementById("pdfInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  pdfContainer.innerHTML = "";

  const url = URL.createObjectURL(file);
  const pdf = await pdfjsLib.getDocument(url).promise;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    pdfContainer.appendChild(canvas);

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise;
  }
});

/**********************
 * 顔認識スクロール
 **********************/
const video = document.createElement("video");
video.style.display = "none";
document.body.appendChild(video);

let baseY = null;
let scrollDir = 0;

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
  if (!results.multiFaceLandmarks?.length || baseY === null) return;

  const noseY = results.multiFaceLandmarks[0][1].y;

  const diff = noseY - baseY;

  if (diff > 0.03) scrollDir = 1;     // 下向き → 下スクロール
  else if (diff < -0.03) scrollDir = -1; // 上向き → 上スクロール
  else scrollDir = 0;
});

const camera = new Camera(video, {
  onFrame: async () => {
    await faceMesh.send({ image: video });
  },
  width: 640,
  height: 480,
});

navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
  video.srcObject = stream;
  video.play();
  camera.start();
});

document.getElementById("calibrateBtn").onclick = () => {
  if (!video.videoWidth) return;
  baseY = null;
  setTimeout(() => {
    baseY = lastNoseY;
    alert("正面を記憶しました");
  }, 500);
};

let lastNoseY = null;

/**********************
 * スクロールループ
 **********************/
function scrollLoop() {
  if (scrollDir !== 0) {
    window.scrollBy(0, scrollDir * 6);
  }
  requestAnimationFrame(scrollLoop);
}
scrollLoop();

/**********************
 * メトロノーム
 **********************/
let bpm = 80;
let beat = 0;
let timer = null;

const dots = document.getElementById("dots");
const bpmText = document.getElementById("bpmText");

function updateDots() {
  const arr = ["○", "○", "○", "○"];
  arr[beat] = "●";
  dots.innerText = arr.join(" ");
}

function tick() {
  beat = (beat + 1) % 4;
  updateDots();

  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  osc.frequency.value = beat === 0 ? 1200 : 800;
  osc.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

document.getElementById("startTempo").onclick = () => {
  if (timer) return;
  timer = setInterval(tick, (60 / bpm) * 1000);
};

document.getElementById("stopTempo").onclick = () => {
  clearInterval(timer);
  timer = null;
};

document.getElementById("bpmSlider").oninput = (e) => {
  bpm = Number(e.target.value);
  bpmText.innerText = bpm;
  document.getElementById("bpmValue").innerText = bpm;

  if (timer) {
    clearInterval(timer);
    timer = setInterval(tick, (60 / bpm) * 1000);
  }
};
