import { Pose } from "@mediapipe/pose";

export class PoseEstimator {
  constructor({ detectionConf = 0.5, trackingConf = 0.5 } = {}) {
    this.pose = new Pose({
      locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`,
    });

    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: detectionConf,
      minTrackingConfidence: trackingConf,
    });

    this.deviceId = null;
    this.stream = null;
    this._rafId = null;
  }

  setDeviceId(id) {
    this.deviceId = id;
  }

  onResults(cb) {
    this.pose.onResults(cb);
  }

  /** Start webcam mode (realtime loop) */
  async startWebcam(videoEl) {
    this.stop();

    const constraints = {
      audio: false,
      video: {
        width: 640,
        height: 480,
        deviceId: this.deviceId ? { exact: this.deviceId } : undefined,
      },
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.error("Không thể truy cập camera:", err);
      throw err;
    }

    videoEl.srcObject = this.stream;
    await new Promise((r) => (videoEl.onloadedmetadata = r));
    await videoEl.play();

    const loop = async () => {
      await this.pose.send({ image: videoEl });
      this._rafId = requestAnimationFrame(loop);
    };
    loop();

    console.log("Webcam started & pose tracking loop running");
  }

  /** Start uploaded video file mode */
  async startVideoFile(videoEl) {
    this.stop();

    if (!videoEl.src) {
      console.warn("No video file loaded.");
      return;
    }

    if (videoEl.readyState < 1) {
      await new Promise((resolve) => {
        videoEl.onloadedmetadata = resolve;
      });
    }

    const loop = async () => {
      if (videoEl.paused || videoEl.ended) return;
      await this.pose.send({ image: videoEl });
      this._rafId = requestAnimationFrame(loop);
    };

    videoEl.addEventListener("play", () => {
      cancelAnimationFrame(this._rafId);
      loop();
    });

    videoEl.addEventListener("pause", () => cancelAnimationFrame(this._rafId));
    videoEl.addEventListener("ended", () => cancelAnimationFrame(this._rafId));

    await videoEl.play();
    console.log("Video playback started & tracking loop active");
  }

  stop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }
}
