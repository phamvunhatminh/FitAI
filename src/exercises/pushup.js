import { calculateAngle, CounterBase } from "../app/angle_utils.js";

/**
 * Push-up Counter (Side View, có đếm thời gian)
 * - Chọn tự động bên trái/phải có visibility cao hơn
 * - EMA smoothing giúp góc ổn định
 * - Hysteresis: phải “xuống đủ sâu” rồi “lên đủ cao” mới +1 rep
 * - Chỉ đếm khi thân người tương đối thẳng
 * - Chỉ giữ tổng thời gian (totalTime)
 */
export class PushUpCounter extends CounterBase {
  constructor() {
    super("Push-up");
    this.stage = "up";
    this._elbowEMA = null;
    this._bodyEMA = null;
    this._hitBottom = false;

    // === Thời gian ===
    this.startTime = null;   // thời điểm bắt đầu bài tập
    this.totalTime = 0;      // tổng thời gian tập (giây)
  }

  // === Helpers ===
  _ema(prev, val, alpha = 0.35) {
    return prev == null ? val : alpha * val + (1 - alpha) * prev;
  }

  _norm180(a) {
    return a > 180 ? 360 - a : a;
  }

  // === Main update ===
  update(landmarks) {
    if (!landmarks?.length) return [this.counter, "no_pose", 0];

    // Chọn bên có visibility cao hơn
    const LEFT = [11, 13, 15, 23, 27];  // shoulder, elbow, wrist, hip, ankle
    const RIGHT = [12, 14, 16, 24, 28];
    const sumVis = ids => ids.reduce((s, i) => s + (landmarks[i]?.visibility || 0), 0);
    const useLeft = sumVis(LEFT) >= sumVis(RIGHT);
    const [shoulder, elbow, wrist, hip, ankle] = (useLeft ? LEFT : RIGHT).map(i => landmarks[i]);

    if (![shoulder, elbow, wrist, hip, ankle].every(pt => pt && pt.visibility > 0.5))
      return [this.counter, "no_pose", 0];

    // Cập nhật tổng thời gian
    if (!this.startTime) this.startTime = performance.now();
    this.totalTime = (performance.now() - this.startTime) / 1000;

    // Tính góc tay & thân (chuẩn hóa và làm mượt)
    const elbowAngle = this._norm180(
      calculateAngle([shoulder.x, shoulder.y], [elbow.x, elbow.y], [wrist.x, wrist.y])
    );
    const bodyAngle = this._norm180(
      calculateAngle([shoulder.x, shoulder.y], [hip.x, hip.y], [ankle.x, ankle.y])
    );

    const e = this._elbowEMA = this._ema(this._elbowEMA, elbowAngle);
    const b = this._bodyEMA  = this._ema(this._bodyEMA,  bodyAngle);

    // Ngưỡng logic
    const UP_ELBOW = 155;     // tay duỗi gần hết
    const DOWN_ELBOW = 95;    // tay gập sâu
    const BODY_OK = 150;      // thân đủ thẳng
    const MIN_GAP = 0.45;     // s giữa 2 rep
    const now = performance.now() / 1000;
    const goodForm = b >= BODY_OK;

    // Logic đếm
    if (e < DOWN_ELBOW && goodForm) {
      this._hitBottom = true;
      this.stage = "down";
    }

    if (this._hitBottom && e > UP_ELBOW && goodForm) {
      if (!this._lastRepTime || now - this._lastRepTime > MIN_GAP) {
        this.counter += 1;
        this._lastRepTime = now;
        this._hitBottom = false;
      }
      this.stage = "up";
    }

    // Xuất kết quả
    const metrics = {
      elbow: Math.round(e),
      body: Math.round(b),
      totalTime: parseFloat(this.totalTime.toFixed(2))
    };

    return [this.counter, this.stage, metrics];
  }
}
