/********************
 * PDF 全ページ表示
 ********************/
const url = "sample.pdf";
const canvas = document.getElementById("pdfCanvas");
const ctx = canvas.getContext("2d");

pdfjsLib.getDocument(url).promise.then(async (pdf) => {
  let totalHeight = 0;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    pages.push({ page, viewport });
    totalHeight += viewport.height;
  }

  canvas.width = pages[0].viewport.width;
  canvas.height = totalHeight;

  let y = 0;
  for (const p of pages) {
    await p.page.render({
      canvasContext: ctx,
      viewport: p.viewport,
      transform: [1, 0, 0, 1, 0, y]
    }).promise;
    y += p.viewport.height;
  }
});

/********************
 * BPM & メトロノーム
 ********************/
let bpm = 120;
let running = false;
let beatIndex = 0;
let lastBeatTime = 0;

const tempoEl = document.getElementById("tempo");
const bpmLabel = document.getElementById("bpmLabel");
const bpmSlider = document.getElementById("bpmSlider");
const bpmToggle = document.getElementById("bpmToggle");

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function clickSound() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = 1000;
  gain.gain.value = 0.2;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

bpmSlider.oninput = () => {
  bpm = Number(bpmSlider.value);
  bpmLabel.innerText = `BPM: ${bpm}`;
};

bpmToggle.onclick = () => {
  running = !running;
  bpmToggle.innerText = running ? "■ 停止" : "▶ 再生";
  lastBeatTime = performance.now();
};

function updateTempo(time) {
  if (running) {
    const interval = 60000 / bpm;
    if (time - lastBeatTime >= interval) {
      lastBeatTime += interval;
      beatIndex = (beatIndex + 1) % 5;
      tempoEl.innerText = "・・・・".split("").map((d, i) => i === beatIndex ? "●" : "・").join("");
      clickSound();
    }
  }
  requestAnimationFrame(updateTempo);
}
requestAnimationFrame(updateTempo);

/********************
 * 顔認識 + キャリブレーション
 ********************/
let centerY = null;
let scrollSpeed = 0;

document.getElementById("setCenter").onclick = () => {
  centerY = lastFaceY;
  alert("正面を記憶しました");
};

const video = document.createElement("video");
video.style.display = "none";
document.body.appendChild(video);

let lastFaceY = 0;

const faceMesh = new FaceMesh({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
});

faceMesh.setOptions({ maxNumFaces: 1 });

faceMesh.onResults((res) => {
  if (!res.multiFaceLandmarks) return;

  const y = res.multiFaceLandmarks[0][1].y;
  lastFaceY = y;

  if (centerY === null) return;

  const diff = y - centerY;

  if (diff > 0.03) scrollSpeed = 4;
  else if (diff < -0.03) scrollSpeed = -4;
  else scrollSpeed = 0;
});

const camera = new Camera(video, {
  onFrame: async () => await faceMesh.send({ image: video }),
  width: 640,
  height: 480
});

navigator.mediaDevices.getUserMedia({ video: true }).then((s) => {
  video.srcObject = s;
  video.play();
  camera.start();
});

/********************
 * スクロールループ
 ********************/
function scrollLoop() {
  window.scrollBy(0, scrollSpeed);
  requestAnimationFrame(scrollLoop);
}
scrollLoop();
