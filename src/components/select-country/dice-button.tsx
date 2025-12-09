// src/utils/dice-roll.ts
export const DICE_ANIMATION_DURATION = 700; // ms (tweak to 700-900 for a heavier feel)

let timer: number | null = null;

/**
 * Adds the rolling animation class to the <span class="dice-wrapper"> inside the button.
 * Disables the button until the animation ends.
 *
 * - Sets CSS vars --final-rotateX/Y/Z on the wrapper for keyframe endpoints.
 * - Respects prefers-reduced-motion.
 */
export function animateDiceRoll(button: HTMLButtonElement | null) {
  if (!button) return;

  // prevent double-trigger
  if (button.dataset.rolling === "true") return;

  const wrapper = button.querySelector(".dice-wrapper") as HTMLElement | null;
  if (!wrapper) return;

  button.dataset.rolling = "true";
  button.disabled = true;
  button.setAttribute("aria-busy", "true");

  // clear any existing timer/animation so we restart cleanly
  if (timer) {
    window.clearTimeout(timer);
    timer = null;
  }

  // reduced motion?
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReduced) {
    // small, fast transform for reduced motion users
    wrapper.style.transition = "transform 180ms ease";
    wrapper.style.transform = "rotateZ(12deg)";
    timer = window.setTimeout(() => {
      cleanup(button, wrapper);
    }, 200);
    return;
  }

  // pick a final orientation that looks like a real cube face:
  // snap to multiples of 90deg for X and Y, add a small jitter so it doesn't feel exactly the same every time.
  const faceSnap = true;
  const jitter = (deg: number) => deg + (Math.random() * 10 - 5); // ±5deg jitter

  const randFaceX = Math.floor(Math.random() * 4) * 90; // 0,90,180,270
  const randFaceY = Math.floor(Math.random() * 4) * 90; // 0,90,180,270
  const finalX = faceSnap ? jitter(randFaceX) : Math.floor(Math.random() * 720 + 180);
  const finalY = faceSnap ? jitter(randFaceY) : Math.floor(Math.random() * 720 + 180);
  const finalZ = Math.floor(Math.random() * 360);

  // Set CSS vars so your keyframes can end at these values (must match CSS var names)
  wrapper.style.setProperty("--final-rotateX", `${finalX}deg`);
  wrapper.style.setProperty("--final-rotateY", `${finalY}deg`);
  wrapper.style.setProperty("--final-rotateZ", `${finalZ}deg`);

  // ensure the animation duration CSS var matches the TS constant (optional)
  // if your CSS relies on --roll-duration, sync it here
  wrapper.style.setProperty("--roll-duration", `${DICE_ANIMATION_DURATION}ms`);

  // restart the animation even if class is already present
  wrapper.classList.remove("rolling");
  // force reflow so the animation can be re-triggered
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  void wrapper.offsetWidth;
  wrapper.classList.add("rolling");

  // As a robust fallback we use a timeout to cleanup after the declared duration.
  // Also listen for animationend to early-clean (in case CSS duration differs).
  const onAnimEnd = () => {
    // If you have multiple animations on the element, you can scope by animationName if needed.
    wrapper.removeEventListener("animationend", onAnimEnd);
    // small delay to allow sub-animations (wobble) to finish if they extend slightly
    // but still keep things snappy
    window.setTimeout(() => {
      cleanup(button, wrapper);
    }, 20);
  };

  wrapper.addEventListener("animationend", onAnimEnd, { once: true });

  timer = window.setTimeout(() => {
    // safety: remove listener in case it didn't fire
    wrapper.removeEventListener("animationend", onAnimEnd);
    cleanup(button, wrapper);
  }, DICE_ANIMATION_DURATION + 80);
}

function cleanup(button: HTMLButtonElement, wrapper: HTMLElement) {
  button.disabled = false;
  delete button.dataset.rolling;
  button.removeAttribute("aria-busy");

  // clear inline temporary styles and vars
  wrapper.style.transform = "";
  wrapper.style.transition = "";
  wrapper.style.removeProperty("--final-rotateX");
  wrapper.style.removeProperty("--final-rotateY");
  wrapper.style.removeProperty("--final-rotateZ");
  wrapper.style.removeProperty("--roll-duration");

  // remove rolling class if still present
  wrapper.classList.remove("rolling");

  if (timer) {
    window.clearTimeout(timer);
    timer = null;
  }
}

/** Call this on unmount to avoid stray timers */
export function cleanupDiceRollTimer() {
  if (timer) {
    window.clearTimeout(timer);
    timer = null;
  }
}
