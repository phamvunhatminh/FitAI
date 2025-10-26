// ==============================
// Overlay Info Panel on Canvas
// ==============================
export function drawInfoPanel(ctx, exerciseName, counterValue, stage, metrics = {}) {
  const panelWidth = 200;
  const panelHeight = 140; // giảm chiều cao vì bỏ "Last rep"
  const padding = 15;

  // === Nền cam gradient + bo góc ===
  const gradient = ctx.createLinearGradient(0, 0, panelWidth, 0);
  gradient.addColorStop(0, "#ff6600");
  gradient.addColorStop(1, "#ff8800");

  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = gradient;
  roundRect(ctx, 0, 0, panelWidth, panelHeight, 10);
  ctx.fill();
  ctx.globalAlpha = 1;

    // === Tên bài tập (dòng 1) ===
  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px system-ui";
  ctx.textBaseline = "top";
  ctx.fillText(exerciseName.toUpperCase(), padding, padding);

  // === Stage (dòng 2) ===
  ctx.font = "600 18px system-ui";
  ctx.fillText(`Stage: ${stage || "-"}`, padding, padding + 28);

  // === Dòng 3: Thời gian ===
  const isPlank = exerciseName.toLowerCase().includes("plank");
  ctx.font = "bold 20px system-ui";
  const total = isPlank
    ? Math.floor(counterValue)
    : metrics?.totalTime ?? 0;
  ctx.fillText(`Time: ${total.toFixed(2)}s`, padding, padding + 56);

  // === Dòng 4: Count (cho bài tập reps) ===
  if (!isPlank) {
    ctx.font = "bold 30px system-ui";
    ctx.fillText(`Count: ${counterValue ?? 0}`, padding, padding + 90);
  }

  ctx.restore();
}

/** Vẽ khung bo góc (helper function) */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/** Cập nhật bảng thống kê bên ngoài (HTML) */
export function updateStats({ count = 0, stage = "-", time = 0 }) {
  document.getElementById("statCount").textContent = count;
  document.getElementById("statStage").textContent = stage ?? "-";
  document.getElementById("statTime").textContent = Number(time).toFixed(2);
}

/** Ẩn/hiện input video khi đổi mode */
export function toggleFileInput(mode) {
  const fi = document.getElementById("fileInput");
  fi.style.display = mode === "upload" ? "inline-block" : "none";
}
