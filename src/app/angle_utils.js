// src/app/angle_utils.js

/**
 * Tính góc tại điểm b giữa 3 điểm a, b, c
 * Mỗi điểm là mảng [x, y]
 */
export function calculateAngle(a, b, c) {
  const radians =
    Math.atan2(c[1] - b[1], c[0] - b[0]) -
    Math.atan2(a[1] - b[1], a[0] - b[0]);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
}

/**
 * Lớp cơ sở cho các bộ đếm động tác (Squat, Push-up, v.v.)
 */
export class CounterBase {
  constructor(name) {
    this.name = name;
    this.counter = 0;
    this.stage = null; // "up", "down", ...
  }

  /**
   * Cập nhật logic đếm — lớp con cần override
   * @param {Array} landmarks - danh sách các điểm landmark Mediapipe Pose
   */
  update(landmarks) {
    throw new Error("Phải override hàm update() trong lớp con");
  }
}
