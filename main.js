const video = document.createElement("video");
video.style.display = "none";
document.body.appendChild(video);

const iframe = document.getElementById("pdf");

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

const faceMesh = new FaceMesh({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});

faceMesh.setOptions({
  maxNumFaces: 1,
  minDetectionConfidence: 0.3,
  minTrackingConfidence: 0.3,
});

faceMesh.onResults((results) => {
  const now = Date.now();

  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    debug.innerText = "🙂 顔検出中";
    faceDetected = true;
  } else {
    debug.innerText = "😑 顔が見えない";
    if (faceDetected && now - lastTrigger > 1200) {
      lastTrigger = now;
      faceDetected = false;

      iframe.contentWindow.scrollBy({
        top: window.innerHeight * 0.9,
        behavior: "smooth",
      });
    }
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
