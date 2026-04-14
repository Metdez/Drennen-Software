"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";

const FRAME_COUNT = 121;

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

  const frameIndex = useTransform(scrollYProgress, [0, 1], [0, FRAME_COUNT - 1]);
  const captionOpacity = useTransform(scrollYProgress, [0.75, 1], [1, 0]);

  // Draw a given frame to the canvas.
  const drawFrame = (index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = imagesRef.current[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    if (cssWidth === 0 || cssHeight === 0) return;

    // object-fit: cover — compute source crop
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const canvasAspect = cssWidth / cssHeight;
    let sx = 0;
    let sy = 0;
    let sWidth = img.naturalWidth;
    let sHeight = img.naturalHeight;
    if (imgAspect > canvasAspect) {
      // image is wider — crop sides
      sWidth = img.naturalHeight * canvasAspect;
      sx = (img.naturalWidth - sWidth) / 2;
    } else {
      // image is taller — crop top/bottom
      sHeight = img.naturalWidth / canvasAspect;
      sy = (img.naturalHeight - sHeight) / 2;
    }

    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, cssWidth, cssHeight);
    currentFrameRef.current = index;
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
      drawFrame(Math.min(Math.round(latest), FRAME_COUNT - 1));
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
