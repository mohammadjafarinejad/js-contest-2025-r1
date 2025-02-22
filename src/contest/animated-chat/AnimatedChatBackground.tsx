import React, { FC, useEffect, useRef } from "../../lib/teact/teact";
import buildClassName from "../../util/buildClassName";
import ChatBackgroundGradientRenderer from "./gradientRender";
import ChatBackgroundPatternRenderer from "./patternRender";
import './AnimatedChatBackground.scss';
import { EventEmitter } from "events";
import { ThemeKey } from "../../types";
import DefaultPattern from './assets/patterns/pattern.svg';
import useLastCallback from "../../hooks/useLastCallback";

class BackgroundAnimator {
  private _gradientRenderer?: ChatBackgroundGradientRenderer;
  private _patternRenderer?: ChatBackgroundPatternRenderer;
  private _gradientCanvas?: HTMLCanvasElement;
  private _patternCanvas?: HTMLCanvasElement;
  backgroundTempId: number = 0;

  get gradientCanvas() {
    return this._gradientCanvas;
  }

  get patternCanvas() {
    return this._patternCanvas;
  }

  get patternRenderer() {
    return this._patternRenderer;
  }

  start(options: {
    url: string;
    colors: string
    isPattern: boolean;
    mask: boolean;
    rect: DOMRect;
  }) {
    if (this._gradientRenderer && this._gradientCanvas) {
      this._gradientCanvas.dataset.colors = options.colors;
      this._gradientRenderer.init(this.gradientCanvas!);
    } else {
      const { canvas, gradientRenderer } = ChatBackgroundGradientRenderer.create(options.colors);
      this._gradientRenderer = gradientRenderer;
      this._gradientCanvas = canvas;
      this._gradientCanvas.classList.add(
        'chat-background-item-canvas',
        'chat-background-item-color-canvas',
        'chat-background-item-scalable'
      );
    }

    const opt = {
      url: options.url,
      width: options.rect.width,
      height: options.rect.height,
      mask: options.mask
    }
    if (this._patternRenderer && this._patternCanvas) {
      this._patternRenderer.init(opt);
      this._patternRenderer.fillCanvas(this._patternCanvas);
      this._patternRenderer.resize(opt.width, opt.height);
    }
    else {
      this._patternRenderer = ChatBackgroundPatternRenderer.getInstance(opt);
      this._patternCanvas = this._patternRenderer.createCanvas();
      this._patternCanvas.classList.add('chat-background-item-canvas', 'chat-background-item-pattern-canvas');
    }
  }

  moveGradientSmoothly() {
    this._gradientRenderer?.toNextPosition(this._fastSmoothScroll());
  }

  public destroy() {
    this._cleanupBackground();
  }

  private _cleanupBackground() {
    ++this.backgroundTempId;
    // if (this._patternRenderer && this._patternCanvas) {
    // this._patternRenderer.cleanup(this._patternCanvas);
    // this._patternCanvas.remove();
    // this._patternRenderer = this._patternCanvas = undefined;
    // }
    this._gradientRenderer?.cleanup();
  }

  private _fastSmoothScroll() {
    const MIN_JS_DURATION = 250;
    const MAX_JS_DURATION = 600;
    const LONG_TRANSITION_MAX_DISTANCE = 1500;
    const path = 500;
    const forceDuration = undefined;
    const absPath = Math.abs(path);
    const duration = forceDuration ?? (
      MIN_JS_DURATION + (absPath / LONG_TRANSITION_MAX_DISTANCE) * (MAX_JS_DURATION - MIN_JS_DURATION)
    );
    const startAt = Date.now();
    const getProgress = () => duration ? Math.min((Date.now() - startAt) / duration, 1) : 1;
    return getProgress;
  }
}

const backgroundEventEmitter = new EventEmitter();

export function moveChatBackgroundSmoothly() {
  backgroundEventEmitter.emit("moveGradientSmoothly");
}

interface OwnProps {
  theme: ThemeKey;
  customBackground?: string;
  backgroundColor?: string;
  patternColor?: string;
}

export const AnimatedChatBackground: FC<OwnProps> = ({ theme, customBackground, backgroundColor, patternColor }) => {
  const animRef = useRef(new BackgroundAnimator());
  const containerRef = useRef<HTMLDivElement>(null);
  const isPattern = customBackground === undefined && backgroundColor === undefined;
  const isDarkPattern = theme === "dark";

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([{ contentRect }]) => {
      animRef.current.patternRenderer?.resize(contentRect.width, contentRect.height);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef]);

  useEffect(() => {
    const anim = animRef.current;
    backgroundEventEmitter.on("moveGradientSmoothly", anim.moveGradientSmoothly.bind(anim));

    return () => {
      anim.destroy();
      backgroundEventEmitter.off("moveGradientSmoothly", anim.moveGradientSmoothly.bind(anim));
    };
  }, []);

  const startAnimation = useLastCallback(() => {
    if (!containerRef.current) return;
    const anim = animRef.current;
    const colors = isDarkPattern ? "#fec496,#dd6cb9,#962fbf,#4f5bd5" : "#dbddbb,#6ba587,#d5d88d,#88b884";
    anim.destroy();
    anim.start({
      colors,
      isPattern: true,
      mask: isDarkPattern,
      rect: containerRef.current.getBoundingClientRect(),
      url: DefaultPattern,
    });
    if (isDarkPattern) {
      anim.gradientCanvas!.style.setProperty("--opacity-max", "0.3");
      anim.patternCanvas!.style.removeProperty("--opacity-max");
    } else {
      anim.gradientCanvas!.style.removeProperty("--opacity-max");
      anim.patternCanvas!.style.setProperty("--opacity-max", "0.5");
    }
    containerRef.current.appendChild(anim.gradientCanvas!);
    containerRef.current.appendChild(anim.patternCanvas!);
  });

  useEffect(() => {
    const anim = animRef.current;
    startAnimation();
    return () => {
      anim.destroy();
    };
  }, [isDarkPattern]);

  return (
    <div className={buildClassName("chat-background", isPattern && 'is-visible', !isPattern && 'hide')}>
      <div
        ref={containerRef}
        className={buildClassName(
          "chat-background-item",
          isPattern && "is-pattern",
          isDarkPattern && "is-dark",
          !isPattern && "is-image chat-background-item-scalable"
        )}
      />
    </div>
  );
}
