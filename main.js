/******** PDF ********/
const pdfContainer = document.getElementById("pdfContainer");
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

document.getElementById("pdfInput").addEventListener("change", async e => {
  pdfContainer.innerHTML = "";
  const file = e.target.files[0];
  if (!file) return;

  const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    pdfContainer.appendChild(canvas);

    await page.render({ canvasContext: ctx, viewport }).promise;
  }
});

/******** Face Scroll ********/
const video = document.createElement("video");
video.style.display = "none";
document.body.appendChild(video);

let baseY = null;
let lastNoseY = null;
let scrollDir = 0;

const faceMesh = new FaceMesh({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
});

faceMesh.setOptions({
  maxNumFaces: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

faceMesh.onResults(results => {
  if (!results.multiFaceLandmarks?.length) return;

  const noseY = results.multiFaceLandmarks[0][1].y;
  lastNoseY = noseY;   // ★ 毎フレーム更新

  if (baseY === null) return;

  const diff = noseY - baseY;

  if (diff > 0.03) scrollDir = 1;
  else if (diff < -0.03) scrollDir = -1;
  else scrollDir = 0;
});

new Camera(video, {
  onFrame: async () => faceMesh.send({ image: video }),
  width: 640,
  height: 480,
}).start();

navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
  video.srcObject = stream;
  video.play();
});

document.getElementById("calibrateBtn").onclick = () => {
  if (lastNoseY === null) return alert("顔が検出されていません");
  baseY = lastNoseY;
  alert("正面を記憶しました");
};

function scrollLoop() {
  if (scrollDir !== 0) {
    window.scrollBy(0, scrollDir * 6);
  }
  requestAnimationFrame(scrollLoop);
}
scrollLoop();

/******** Metronome ********/
let bpm = 80;
let beat = 0;
let timer = null;

const dots = document.getElementById("dots");
const bpmText = document.getElementById("bpmText");

function updateDots() {
  const d = ["○","○","○","○"];
  d[beat] = "●";
  dots.innerText = d.join(" ");
}

function tick() {
  updateDots();
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  osc.frequency.value = beat === 0 ? 1200 : 800;
  osc.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
  beat = (beat + 1) % 4;
}

document.getElementById("startTempo").onclick = () => {
  if (timer) return;
  timer = setInterval(tick, 60000 / bpm);
};

document.getElementById("stopTempo").onclick = () => {
  clearInterval(timer);
  timer = null;
};

document.getElementById("bpmSlider").oninput = e => {
  bpm = Number(e.target.value);
  bpmText.textContent = bpm;
  document.getElementById("bpmValue").textContent = bpm;
  if (timer) {
    clearInterval(timer);
    timer = setInterval(tick, 60000 / bpm);
  }
};
