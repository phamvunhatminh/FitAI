import { calculateAngle, CounterBase } from "../app/angle_utils.js";

/**
 * PlankTimer v2 (thresholds cập nhật theo yêu cầu)
 * Upper: 13–11–23 (trái) / 14–12–24 (phải) -> phải 80–100°
 * Lower: 11–23–25 (trái) / 12–24–26 (phải) -> phải 160–180°
 */
export class PlankTimer extends CounterBase {
  constructor() {
    super("Plank");
    this.startTime = null;
    this.totalTime = 0;
  }

  update(landmarks) {
    if (!landmarks || landmarks.length === 0)
      return [this.totalTime, "no_pose", 0];

    // Chọn bên có visibility cao hơn
    const leftIdx = [11, 13, 23, 25]; // shoulder, elbow, hip, knee
    const rightIdx = [12, 14, 24, 26];
    const sumVis = (idxs) => idxs.reduce((s, i) => s + (landmarks[i]?.visibility || 0), 0);
    const useLeft = sumVis(leftIdx) >= sumVis(rightIdx);
    const [sIdx, eIdx, hIdx, kIdx] = useLeft ? leftIdx : rightIdx;

    const shoulder = landmarks[sIdx], elbow = landmarks[eIdx],
          hip = landmarks[hIdx], knee = landmarks[kIdx];

    if (![shoulder, elbow, hip, knee].every(pt => pt && pt.visibility > 0.5))
      return [this.totalTime, "no_pose", 0];

    // Góc trên: (elbow–shoulder–hip) = 13–11–23 / 14–12–24
    const upper = calculateAngle([elbow.x, elbow.y], [shoulder.x, shoulder.y], [hip.x, hip.y]);

    // Góc dưới: (shoulder–hip–knee) = 11–23–25 / 12–24–26
    const lower = calculateAngle([shoulder.x, shoulder.y], [hip.x, hip.y], [knee.x, knee.y]);

    // Đánh giá form theo ngưỡng bạn đưa ra
    const upperOK = (upper >= 75 && upper <= 100);
    const lowerOK = (lower >= 150 && lower <= 180);

    let form = "holding";
    if (!upperOK || !lowerOK) {
      if (lower > 180 || upper > 100) form = "hips_low";
      else if (lower < 150 || upper < 75) form = "hips_high";
      else form = "unstable";
    }

    // === Tính thời gian chỉ khi form đúng ===
    if (upperOK && lowerOK) {
      this.stage = "holding";
      // Nếu mới vào form đúng -> ghi nhận thời điểm bắt đầu đoạn này
      if (!this._segmentStart) this._segmentStart = performance.now();
      // Cập nhật tổng thời gian = tổng trước đó + (thời gian giữ form hiện tại)
      this.totalTime += (performance.now() - this._segmentStart) / 1000;
      // Ghi nhận mốc mới để lần sau tính tiếp
      this._segmentStart = performance.now();
    } else {
      // Nếu ra khỏi form đúng, dừng đếm nhưng không reset
      this.stage = form;
      this._segmentStart = null; // dừng tạm, giữ nguyên totalTime
    }


    return [
      parseFloat(this.totalTime.toFixed(2)),
      this.stage,
      { upper: Math.round(upper), lower: Math.round(lower) }
    ];
  }
}
