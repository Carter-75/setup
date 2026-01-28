"use client";

import { useEffect, useRef, useState } from "react";

import Confetti from "react-confetti";
import anime from "animejs";
import * as Matter from "matter-js";
import { useWindowSize } from "react-use";

import styles from "./page.module.css";

const APP_NAME = "__PROJECT_NAME__";

const getGlobal = <T,>(key: string, fallback: T) => {
  if (typeof window === "undefined") {
    return fallback;
  }
  const candidate = (window as Record<string, T | undefined>)[key];
  return candidate ?? fallback;
};

export default function Home() {
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) {
      return;
    }
    const animeGlobal = getGlobal("anime", anime);
    const animation = animeGlobal({
      targets: element,
      scale: [1, 1.02],
      direction: "alternate",
      easing: "easeInOutSine",
      duration: 1400,
      loop: true,
    });

    return () => {
      if (animation?.pause) {
        animation.pause();
      }
    };
  }, []);

  useEffect(() => {
    const container = sceneRef.current;
    if (!container) {
      return;
    }

    const MatterGlobal = getGlobal("Matter", Matter);
    const engine = MatterGlobal.Engine.create();
    const render = MatterGlobal.Render.create({
      element: container,
      engine,
      options: {
        width: container.clientWidth,
        height: 220,
        background: "transparent",
        wireframes: false,
      },
    });

    const ground = MatterGlobal.Bodies.rectangle(
      render.options.width / 2,
      210,
      render.options.width,
      20,
      {
        isStatic: true,
        render: { fillStyle: "#d1d5db" },
      }
    );

    const ball = MatterGlobal.Bodies.circle(80, 30, 20, {
      restitution: 0.85,
      render: { fillStyle: "#ffb347" },
    });

    MatterGlobal.World.add(engine.world, [ground, ball]);
    MatterGlobal.Engine.run(engine);
    MatterGlobal.Render.run(render);

    const handleResize = () => {
      const width = container.clientWidth;
      render.canvas.width = width;
      render.options.width = width;
      MatterGlobal.Body.setPosition(ground, { x: width / 2, y: 210 });
      MatterGlobal.Body.setPosition(ball, {
        x: Math.min(ball.position.x, Math.max(40, width - 40)),
        y: ball.position.y,
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      MatterGlobal.Render.stop(render);
      MatterGlobal.Engine.clear(engine);
      if (render.canvas.parentNode) {
        render.canvas.parentNode.removeChild(render.canvas);
      }
    };
  }, []);

  const scriptStatus =
    typeof window !== "undefined" && (window as any).anime && (window as any).Matter
      ? "CDN scripts active"
      : "Using package fallback";

  return (
    <main className={`${styles.main} section`}>
      <Confetti width={width} height={height} recycle={showConfetti} numberOfPieces={showConfetti ? 140 : 0} />
      <div className={`container ${styles.container}`}>
        <div className={`box ${styles.card}`} ref={cardRef}>
          <p className="has-text-grey is-uppercase is-size-7">Template</p>
          <h1 className="title is-3">{APP_NAME}</h1>
          <p className="subtitle is-6">
            This starter uses Bulma, animejs, matter-js, react-confetti, and react-use.
          </p>
          <div className={styles.actions}>
            <button
              className="button is-primary"
              type="button"
              onClick={() => setShowConfetti((value) => !value)}
            >
              {showConfetti ? "Stop confetti" : "Celebrate"}
            </button>
          </div>
          <div ref={sceneRef} className={styles.scene} aria-hidden="true" />
          <p className="has-text-grey is-size-7">{scriptStatus}</p>
        </div>
      </div>
    </main>
  );
}
