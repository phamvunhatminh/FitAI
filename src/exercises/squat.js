import { calculateAngle, CounterBase } from "../app/angle_utils.js";

/**
 * Squat Counter (Front View, có đếm thời gian)
 * - Dựa trên góc gối trung bình của hai chân: (23–25–27) và (24–26–28)
 * - Hysteresis: phải đứng thẳng rồi mới tính khi squat xuống
 * - Chỉ giữ tổng thời gian (totalTime)
 */
export class SquatCounter extends CounterBase {
  constructor() {
    super("Squat");
    this.startTime = null;  // thời điểm bắt đầu bài tập
    this.totalTime = 0;     // tổng thời gian (s)
  }

  update(landmarks) {
    if (!landmarks || landmarks.length === 0)
      return [this.counter, "no_pose", 0];

    // Cập nhật tổng thời gian
    if (!this.startTime) this.startTime = performance.now();
    this.totalTime = (performance.now() - this.startTime) / 1000;

    // Lấy landmark hai chân
    const l_hip = landmarks[23], l_knee = landmarks[25], l_ankle = landmarks[27];
    const r_hip = landmarks[24], r_knee = landmarks[26], r_ankle = landmarks[28];

    const leftValid = [l_hip, l_knee, l_ankle].every(pt => pt.visibility > 0.5);
    const rightValid = [r_hip, r_knee, r_ankle].every(pt => pt.visibility > 0.5);
    if (!leftValid && !rightValid)
      return [this.counter, "no_pose", 0];

    // Tính góc đầu gối hai bên
    const lAngle = calculateAngle(
      [l_hip.x, l_hip.y],
      [l_knee.x, l_knee.y],
      [l_ankle.x, l_ankle.y]
    );
    const rAngle = calculateAngle(
      [r_hip.x, r_hip.y],
      [r_knee.x, r_knee.y],
      [r_ankle.x, r_ankle.y]
    );
    const avgAngle = (lAngle + rAngle) / 2;

    // Logic đếm (hysteresis)
    if (avgAngle > 150) {
      this.stage = "up";
    } else if (avgAngle < 120 && this.stage === "up") {
      this.stage = "down";
      this.counter += 1;
    }

    // Xuất kết quả
    const metrics = {
      angle: Math.round(avgAngle),
      totalTime: parseFloat(this.totalTime.toFixed(2))
    };

    return [this.counter, this.stage, metrics];
  }
}
