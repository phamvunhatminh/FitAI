import { calculateAngle, CounterBase } from "../app/angle_utils.js";

/**
 * Jumping Jack Counter (elbow–shoulder–hip và ankle–hip–shoulder version)
 * Tay: trái = 14–12–24; phải = 13–11–23
 * Chân: phải = 28–24–12; trái = 27–23–11
 * - Chỉ giữ totalTime (tổng thời gian tập)
 */
export class JumpingJackCounter extends CounterBase {
  constructor() {
    super("Jumping Jack");
    this.startTime = null;  // thời điểm bắt đầu bài tập
    this.totalTime = 0;     // tổng thời gian (giây)
  }

  update(landmarks) {
    if (!landmarks || landmarks.length === 0)
      return [this.counter, "no_pose", 0];

    // Cập nhật thời gian tổng
    if (!this.startTime) this.startTime = performance.now();
    this.totalTime = (performance.now() - this.startTime) / 1000;

    // Lấy các điểm chính
    const l_shoulder = landmarks[11], r_shoulder = landmarks[12];
    const l_elbow = landmarks[13], r_elbow = landmarks[14];
    const l_hip = landmarks[23], r_hip = landmarks[24];
    const l_ankle = landmarks[27], r_ankle = landmarks[28];

    // Kiểm tra độ tin cậy pose
    if ([l_shoulder, r_shoulder, l_elbow, r_elbow, l_hip, r_hip, l_ankle, r_ankle]
        .some(pt => pt.visibility < 0.5))
      return [this.counter, "no_pose", 0];

    // Góc tay: 14–12–24 (trái), 13–11–23 (phải)
    const lArm = calculateAngle(
      [l_elbow.x, l_elbow.y],
      [l_shoulder.x, l_shoulder.y],
      [r_hip.x, r_hip.y]
    );
    const rArm = calculateAngle(
      [r_elbow.x, r_elbow.y],
      [r_shoulder.x, r_shoulder.y],
      [l_hip.x, l_hip.y]
    );
    const armAngle = (lArm + rArm) / 2;

    // Góc chân: 28–24–12 (phải), 27–23–11 (trái)
    const rLeg = calculateAngle(
      [r_ankle.x, r_ankle.y],
      [r_hip.x, r_hip.y],
      [r_shoulder.x, r_shoulder.y]
    );
    const lLeg = calculateAngle(
      [l_ankle.x, l_ankle.y],
      [l_hip.x, l_hip.y],
      [l_shoulder.x, l_shoulder.y]
    );
    const legAngle = (lLeg + rLeg) / 2;

    // Logic đếm
    if (armAngle > 90 && legAngle < 170) {
      this.stage = "up";
    } else if (armAngle < 60 && legAngle > 170 && this.stage === "up") {
      this.stage = "down";
      this.counter += 1;
    }

    // Trả về dữ liệu cho overlay
    const metrics = {
      arm: Math.round(armAngle),
      leg: Math.round(legAngle),
      totalTime: parseFloat(this.totalTime.toFixed(2))
    };

    return [this.counter, this.stage, metrics];
  }
}
