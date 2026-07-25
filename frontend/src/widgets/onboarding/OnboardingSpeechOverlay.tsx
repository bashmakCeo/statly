import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import lottie from "lottie-web";

import defaultDuckAnimation from "../../shared/assets/images/utka_privet.json";

type OnboardingSpeechOverlayProps = {
  accentText?: string;
  animationData?: object;
  ariaLabel: string;
  buttonLabel?: string;
  children?: ReactNode;
  onComplete: () => void;
  text: string;
  title: string;
  titleId: string;
};

export function OnboardingSpeechOverlay({
  accentText,
  animationData = defaultDuckAnimation,
  ariaLabel,
  buttonLabel = "Продолжить",
  children,
  onComplete,
  text,
  title,
  titleId,
}: OnboardingSpeechOverlayProps) {
  const duckAnimationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollY = window.scrollY;
    const { style } = document.body;

    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.left = "0";
    style.right = "0";
    style.width = "100%";
    style.overflow = "hidden";

    return () => {
      style.position = "";
      style.top = "";
      style.left = "";
      style.right = "";
      style.width = "";
      style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    if (duckAnimationRef.current === null) {
      return;
    }

    const animation = lottie.loadAnimation({
      animationData,
      autoplay: true,
      container: duckAnimationRef.current,
      loop: true,
      renderer: "svg",
    });

    return () => {
      animation.destroy();
    };
  }, [animationData]);

  return createPortal(
    <div className="onboarding-overlay" role="presentation">
      <div aria-hidden="true" className="onboarding-overlay__backdrop" />

      <section
        aria-label={ariaLabel}
        aria-labelledby={titleId}
        className="onboarding-overlay__panel"
        role="dialog"
      >
        <div className="onboarding-overlay__mascot" aria-hidden="true">
          <div className="onboarding-overlay__duck" ref={duckAnimationRef} />
        </div>

        <div className="onboarding-overlay__bubble">
          <h2 id={titleId} className="onboarding-overlay__title">
            {title}
          </h2>

          <p className="onboarding-overlay__text">{text}</p>

          {accentText !== undefined ? (
            <p className="onboarding-overlay__text onboarding-overlay__text--accent">{accentText}</p>
          ) : null}

          {children}

          <button className="onboarding-overlay__button" type="button" onClick={onComplete}>
            {buttonLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
