import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { POSE_CONNECTIONS } from "@mediapipe/pose";
import { drawInfoPanel, updateStats } from "./ui.js";

export function makeOnResults({ canvas, counter }) {
  const ctx = canvas.getContext("2d");

  return function onResults(results) {
    // === Cập nhật kích thước canvas khớp video input ===
    canvas.width = results.image.width;
    canvas.height = results.image.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.poseLandmarks) {
      // === Vẽ skeleton ===
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: "#00FF00",
        lineWidth: 3,
      });
      drawLandmarks(ctx, results.poseLandmarks, {
        color: "#FF0000",
        radius: 2,
      });

      // === Cập nhật logic đếm ===
      const [count, stage, metrics] = counter.update(results.poseLandmarks);
      const isPlank = counter.name.toLowerCase().includes("plank");

      // === Vẽ overlay UI lên canvas ===
      drawInfoPanel(
        ctx,
        counter.name,
        isPlank ? Math.floor(count) : count,
        stage,
        metrics // chứa totalTime
      );

      // === Cập nhật bảng thống kê HTML ===
      const displayTime = isPlank
        ? count // plank: count là thời gian
        : metrics?.totalTime ?? 0;

      updateStats({
        count: isPlank ? Math.floor(count) : count,
        stage,
        time: displayTime,
      });
    } else {
      // === Không thấy pose ===
      drawInfoPanel(ctx, counter.name, 0, "no_pose");
      updateStats({ count: 0, stage: "no_pose", time: 0 });
    }
  };
}
