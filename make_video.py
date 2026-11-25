#!/usr/bin/env python3
"""用 Chromium CDP 逐帧截图，再用 OpenCV 编码成 3:4 竖版 MP4（参赛演示视频）。"""
import base64
import json
import os
import shutil
import subprocess
import time
import urllib.request

import cv2
import websocket

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 9223
FRAMES = 144          # 14.4 秒 @ 10fps，满足“短于 15 秒”
FPS = 10
SIZE = (1080, 1440)
TMP = "/tmp/opencode/miui-video-frames"
PROFILE = "/tmp/opencode/miui-video-chrome"
FONT_CONF = "/tmp/opencode/fonts/fonts.conf"
CHROME = "chromium-browser"
OUT = os.path.join(ROOT, "demo.mp4")


def launch_chrome():
    shutil.rmtree(PROFILE, ignore_errors=True)
    shutil.rmtree(TMP, ignore_errors=True)
    os.makedirs(TMP, exist_ok=True)
    env = os.environ.copy()
    env["FONTCONFIG_FILE"] = FONT_CONF
    cmd = [
        CHROME, "--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
        "--disable-dev-shm-usage", "--window-size=1080,1440",
        "--remote-debugging-port=%d" % PORT,
        "--user-data-dir=" + PROFILE,
        "--force-device-scale-factor=1",
        "about:blank",
    ]
    return subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=env)


def get_page_ws():
    for _ in range(100):
        try:
            data = json.load(urllib.request.urlopen("http://127.0.0.1:%d/json/list" % PORT, timeout=1))
            for t in data:
                if t.get("type") == "page" and t.get("webSocketDebuggerUrl"):
                    return t["webSocketDebuggerUrl"]
        except Exception:
            pass
        time.sleep(0.15)
    raise RuntimeError("无法连接 Chromium CDP")


class CDP:
    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, suppress_origin=True, timeout=30)
        self.n = 0

    def call(self, method, params=None):
        self.n += 1
        mid = self.n
        self.ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == mid:
                if "error" in msg:
                    raise RuntimeError(msg["error"])
                return msg.get("result", {})

    def evaluate(self, expr, awaitPromise=False):
        r = self.call("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": awaitPromise})
        return r.get("result", {}).get("value")

    def close(self):
        self.ws.close()


def main():
    proc = launch_chrome()
    try:
        cdp = CDP(get_page_ws())
        cdp.call("Page.enable")
        cdp.call("Emulation.setDeviceMetricsOverride", {
            "width": 1080, "height": 1440, "deviceScaleFactor": 1, "mobile": False
        })
        cdp.call("Page.navigate", {"url": "file://" + os.path.join(ROOT, "video.html")})
        for _ in range(100):
            if cdp.evaluate("document.readyState === 'complete' && typeof window.setFrame === 'function'"):
                break
            time.sleep(0.1)
        cdp.evaluate("document.fonts.ready.then(function(){return true})", awaitPromise=True)
        time.sleep(0.3)

        for i in range(FRAMES):
            cdp.evaluate("window.setFrame(%d)" % i)
            r = cdp.call("Page.captureScreenshot", {
                "format": "png", "fromSurface": True, "captureBeyondViewport": False
            })
            with open(os.path.join(TMP, "f%04d.png" % i), "wb") as f:
                f.write(base64.b64decode(r["data"]))
        cdp.close()
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except Exception:
            proc.kill()

    writer = cv2.VideoWriter(OUT, cv2.VideoWriter_fourcc(*"mp4v"), FPS, SIZE)
    if not writer.isOpened():
        raise RuntimeError("OpenCV MP4 编码器不可用")
    for i in range(FRAMES):
        path = os.path.join(TMP, "f%04d.png" % i)
        img = cv2.imread(path, cv2.IMREAD_UNCHANGED)
        if img is None:
            raise RuntimeError("frame missing: " + path)
        if i == 0:
            print("frame shape:", img.shape)
        if img.ndim == 2:
            img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
        elif img.shape[2] == 4:
            img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
        if (img.shape[1], img.shape[0]) != SIZE:
            img = cv2.resize(img, SIZE)
        writer.write(img)
    writer.release()
    shutil.rmtree(TMP, ignore_errors=True)
    print("video:", OUT)
    print("bytes:", os.path.getsize(OUT))
    print("duration: %.1fs" % (FRAMES / FPS))


if __name__ == "__main__":
    main()
