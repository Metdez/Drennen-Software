"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";

const FRAME_COUNT = 181;

const frameUrl = (i: number) =>
  `/frames/frame-${String(i + 1).padStart(4, "0")}.webp`;

export default function ScrollVideo() {
  const outerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const rafPendingRef = useRef(false);
  const currentFrameRef = useRef(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const reduceMotionRef = useRef(false);

  const [loaded, setLoaded] = useState(0);
  const [allLoaded, setAllLoaded] = useState(false);

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 260,
    damping: 34,
    mass: 0.6,
    restDelta: 0.0005,
  });

  const frameIndex = useTransform(smoothProgress, [0, 1], [0, FRAME_COUNT - 1]);
  const captionOpacity = useTransform(scrollYProgress, [0.75, 1], [1, 0]);

  // Draw a given frame (float) to the canvas, crossfading between adjacent frames.
  const drawFrame = (rawIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const images = imagesRef.current;
    if (!images.length) return;

    const clamped = Math.max(0, Math.min(rawIndex, FRAME_COUNT - 1));
    const floor = Math.floor(clamped);
    const ceil = Math.min(floor + 1, FRAME_COUNT - 1);
    const frac = clamped - floor;

    const imgA = images[floor];
    const imgB = images[ceil];
    if (!imgA || !imgA.complete || imgA.naturalWidth === 0) return;

    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    if (cssWidth === 0 || cssHeight === 0) return;

    // object-fit: cover crop math
    const imgAspect = imgA.naturalWidth / imgA.naturalHeight;
    const canvasAspect = cssWidth / cssHeight;
    let sx = 0;
    let sy = 0;
    let sw = imgA.naturalWidth;
    let sh = imgA.naturalHeight;
    if (imgAspect > canvasAspect) {
      sw = imgA.naturalHeight * canvasAspect;
      sx = (imgA.naturalWidth - sw) / 2;
    } else {
      sh = imgA.naturalWidth / canvasAspect;
      sy = (imgA.naturalHeight - sh) / 2;
    }

    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.globalAlpha = 1;
    ctx.drawImage(imgA, sx, sy, sw, sh, 0, 0, cssWidth, cssHeight);

    // Crossfade into the next frame based on fractional position
    if (imgB && imgB !== imgA && imgB.complete && imgB.naturalWidth !== 0 && frac > 0.001) {
      ctx.globalAlpha = frac;
      ctx.drawImage(imgB, sx, sy, sw, sh, 0, 0, cssWidth, cssHeight);
      ctx.globalAlpha = 1;
    }

    currentFrameRef.current = clamped;
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    }
    drawFrame(currentFrameRef.current);
  };

  // Load frames on mount
  useEffect(() => {
    const prefers = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reduceMotionRef.current = prefers;
    setReduceMotion(prefers);

    const images: HTMLImageElement[] = [];
    let cancelled = false;
    let loadedCount = 0;

    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src = frameUrl(i);
      img.onload = () => {
        if (cancelled) return;
        loadedCount += 1;
        setLoaded(loadedCount);
        if (loadedCount === FRAME_COUNT) {
          setAllLoaded(true);
          // Draw first frame once images are ready
          drawFrame(0);
        }
      };
      img.onerror = () => {
        if (cancelled) return;
        loadedCount += 1;
        setLoaded(loadedCount);
        if (loadedCount === FRAME_COUNT) {
          setAllLoaded(true);
          drawFrame(0);
        }
      };
      images.push(img);
    }
    imagesRef.current = images;

    // Initial canvas sizing
    resizeCanvas();

    const ro = new ResizeObserver(() => {
      resizeCanvas();
    });
    if (canvasRef.current) ro.observe(canvasRef.current);

    return () => {
      cancelled = true;
      ro.disconnect();
      rafPendingRef.current = false;
      // Release memory
      for (const img of images) {
        img.onload = null;
        img.onerror = null;
        img.src = "";
      }
      imagesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bind scroll progress to frame drawing
  useMotionValueEvent(frameIndex, "change", (latest) => {
    if (reduceMotionRef.current) return;
    if (!allLoaded) return;
    if (rafPendingRef.current) return;
    rafPendingRef.current = true;
    requestAnimationFrame(() => {
      rafPendingRef.current = false;
      drawFrame(latest);
    });
  });

  const progress = loaded / FRAME_COUNT;

  return (
    <div
      ref={outerRef}
      className="scroll-video-outer"
      data-reduced={reduceMotion ? "true" : undefined}
    >
      <div className="scroll-video-sticky">
        <canvas ref={canvasRef} className="scroll-video-canvas" />
        {!allLoaded && (
          <div className="scroll-video-loader">
            <div
              className="scroll-video-loader-bar"
              style={{ transform: `scaleX(${progress})` }}
            />
          </div>
        )}
        <motion.div
          className="scroll-video-caption"
          style={{ opacity: captionOpacity }}
        >
          <strong>Kenneth Workspace</strong>
          Bleached oak — satin brass
        </motion.div>
      </div>
    </div>
  );
}
