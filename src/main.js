import { PoseEstimator } from "./mediapipe/pose.js";
import { makeOnResults } from "./app/poseProcessor.js";
import { SquatCounter } from "./exercises/squat.js";
import { PushUpCounter } from "./exercises/pushup.js";
import { PlankTimer } from "./exercises/plank.js";
import { JumpingJackCounter } from "./exercises/jumpingJack.js";
import { toggleFileInput, updateStats } from "./app/ui.js";

// ===== DOM elements =====
const videoEl = document.getElementById("input_video");
const canvasEl = document.getElementById("output_canvas");
const containerEl = document.getElementById("videoContainer");
const modeSelect = document.getElementById("modeSelect");
const exerciseSelect = document.getElementById("exerciseSelect");
const fileInput = document.getElementById("fileInput");
const cameraSelect = document.getElementById("cameraSelect");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");

// ===== Estimator =====
const estimator = new PoseEstimator();
let counter = null;
let onResults = null;

// ===== RAF loop control for UPLOAD mode =====
let rafId = null;
let loopToken = 0; // tăng để vô hiệu hoá loop cũ khi restart

// ====================================================
// Update video/canvas aspect ratio
// ====================================================
function updateAspectRatio() {
  if (!videoEl.videoWidth || !videoEl.videoHeight) return;
  const ratio = videoEl.videoWidth / videoEl.videoHeight;
  containerEl.style.aspectRatio = ratio;
  canvasEl.width = videoEl.videoWidth;
  canvasEl.height = videoEl.videoHeight;
  // console.log("Video ratio:", ratio.toFixed(2));
}

// ====================================================
// Bind sizing listeners
// ====================================================
function bindVideoSizing() {
  const onMeta = () => updateAspectRatio();
  const onResize = () => updateAspectRatio();
  videoEl.removeEventListener("loadedmetadata", onMeta);
  videoEl.removeEventListener("resize", onResize);
  videoEl.addEventListener("loadedmetadata", onMeta);
  videoEl.addEventListener("resize", onResize);
}
bindVideoSizing();

// ====================================================
// List cameras
// ====================================================
async function populateCameraList() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter((d) => d.kind === "videoinput");
    cameraSelect.innerHTML = "";

    cams.forEach((cam, i) => {
      const opt = document.createElement("option");
      opt.value = cam.deviceId;
      opt.textContent = cam.label || `Camera ${i + 1}`;
      cameraSelect.appendChild(opt);
    });

    if (cams.length > 0) estimator.setDeviceId(cams[0].deviceId);
  } catch (err) {
    console.error("Cannot enumerate cameras:", err);
  }
}

cameraSelect.addEventListener("change", (e) => {
  estimator.setDeviceId(e.target.value);
});

navigator.mediaDevices.getUserMedia({ video: true })
  .then((stream) => {
    stream.getTracks().forEach((t) => t.stop());
    populateCameraList();
  })
  .catch((err) => console.warn("No webcam access:", err));

// ====================================================
// Create counter by name
// ====================================================
function createCounter(name) {
  switch (name) {
    case "squat": return new SquatCounter();
    case "pushup": return new PushUpCounter();
    case "plank": return new PlankTimer();
    case "jumpingjack": return new JumpingJackCounter();
    default: return new SquatCounter();
  }
}

// ====================================================
// Stop RAF loop (UPLOAD mode)
// ====================================================
function stopUploadLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  loopToken++; // vô hiệu hoá vòng lặp cũ
}

// ====================================================
// Pump frames in UPLOAD mode via RAF
//  - Tự động chọn API phù hợp tuỳ PoseEstimator bên bạn
// ====================================================
async function pumpFrames(token) {
  if (token !== loopToken) return; // bị restart
  if (videoEl.paused || videoEl.ended) return;

  try {
    // Ưu tiên các kiểu API thường gặp
    if (typeof estimator.process === "function") {
      await estimator.process(videoEl);
    } else if (typeof estimator.send === "function") {
      await estimator.send({ image: videoEl });
    } else if (estimator.pose?.send) {
      await estimator.pose.send({ image: videoEl });
    } else if (typeof estimator.startVideoFile === "function") {
      // fallback: nếu wrapper của bạn đòi startVideoFile mỗi frame (ít gặp)
      await estimator.startVideoFile(videoEl);
    } else {
      console.warn("No suitable estimator API found for frame pumping.");
    }
  } catch (err) {
    console.error("pumpFrames error:", err);
  }

  rafId = requestAnimationFrame(() => pumpFrames(token));
}

// ====================================================
// Reset pipeline
// ====================================================
function resetPipeline() {
  // dừng mọi thứ cũ
  stopUploadLoop();
  estimator.stop();
  try { videoEl.pause(); } catch {}

  // chỉ reset src khi đang ở webcam, tránh mất file input
  if (modeSelect.value === "webcam") {
    videoEl.srcObject = null;
    videoEl.removeAttribute("src");
    videoEl.load();
  }

  // tạo counter & onResults mới
  counter = createCounter(exerciseSelect.value);
  onResults = makeOnResults({ canvas: canvasEl, counter });
  estimator.onResults(onResults);

  // reset UI
  updateStats({ count: 0, stage: "-", time: 0 });
}

// ====================================================
// Mode change: toggle upload input
// ====================================================
modeSelect.addEventListener("change", () => {
  toggleFileInput(modeSelect.value);
  resetPipeline();
});
toggleFileInput(modeSelect.value);

// ====================================================
// Change exercise: reset pipeline
// ====================================================
exerciseSelect.addEventListener("change", () => {
  resetPipeline();
  console.log(`Switched to exercise: ${exerciseSelect.value}`);
});

// ====================================================
// START
// ====================================================
startBtn.addEventListener("click", async () => {
  // Dừng pipeline cũ
  stopUploadLoop();
  estimator.stop();
  try { videoEl.pause(); } catch {}

  // Reset counter + callback mới
  resetPipeline();

  // Cập nhật lại tỷ lệ video
  bindVideoSizing();

  // Bắt đầu webcam hoặc video file
  if (modeSelect.value === "webcam") {
    try {
      await estimator.startWebcam(videoEl);
      await videoEl.play();
      console.log(`Webcam started for ${exerciseSelect.value}`);
    } catch (err) {
      console.error("Webcam start error:", err);
      alert("Không mở được webcam. Kiểm tra quyền truy cập camera hoặc HTTPS.");
    }
  } else {
    const file = fileInput.files?.[0];
    if (!file) {
      alert("Please choose a video file first!");
      return;
    }

    try {
      const url = URL.createObjectURL(file);
      videoEl.src = url;

      // Đợi metadata load xong để có videoWidth/Height
      await new Promise((r) => (videoEl.onloadedmetadata = r));
      updateAspectRatio();

      // Reset về đầu và play
      videoEl.currentTime = 0;
      await videoEl.play();

      // (tuỳ wrapper) nếu có setup riêng cho file, gọi trước khi loop
      if (typeof estimator.startVideoFile === "function") {
        await estimator.startVideoFile(videoEl);
      }

      // Bắt đầu bơm frame bằng RAF
      const token = ++loopToken;
      pumpFrames(token);

      // Debug thêm: khi video kết thúc thì dừng loop
      videoEl.onended = () => {
        stopUploadLoop();
        console.log("Video ended.");
      };

      console.log(`Video tracking started for ${exerciseSelect.value}`);
    } catch (err) {
      console.error("Video file error:", err);
      alert("Không thể phát video được. Kiểm tra định dạng hoặc codec.");
    }
  }
});

// ====================================================
// STOP
// ====================================================
stopBtn.addEventListener("click", () => {
  stopUploadLoop();       // dừng RAF loop (upload mode)
  estimator.stop();       // dừng Mediapipe
  try { videoEl.pause(); } catch {}
  console.log(" Stopped");
});
