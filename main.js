faceMesh.onResults((results) => {
  const now = Date.now();

  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    // 顔が見えている
    if (!faceDetected) {
      faceDetected = true;
      faceLostTime = 0;
    }
    debug.innerText = "🙂 顔検出中";
  } else {
    // 顔が見えなくなった
    debug.innerText = "😑 顔が見えない";

    if (faceDetected && faceLostTime === 0) {
      faceLostTime = now;
    }

    // 顔が戻った瞬間に判定
    if (faceLostTime > 0 && now - faceLostTime > 300) {
      const duration = now - faceLostTime;
      faceDetected = false;
      faceLostTime = 0;

      // 長いまばたき → 前のページ
      if (duration > 1800) {
        if (pageNum > 1) {
          pageNum--;
          renderPage();
          debug.innerText = "⬅ 前のページ";
        }
      }
      // 短いまばたき → 次のページ
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




