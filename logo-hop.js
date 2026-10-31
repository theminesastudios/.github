// Hovering the Minesa logo sets its letters bouncing one after another, M to A: each crouches,
// springs up with a twist and lands with a squash, like jelly being tickled. Leaving never cuts
// a hop short: each letter finishes the one it is in and settles. Coming back while they are
// still going carries on from where they are rather than starting over.
(function () {
  const link = document.querySelector("header a");
  if (!link || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // M, I, N, E, S, A.
  const letters = ["element-6", "element-2", "element-1", "element-4", "element-3", "element-5"]
    .map((id) => link.querySelector(`#${id}`))
    .filter(Boolean);

  // Added on top of each letter's idle float, so neither one jumps when the other starts or ends.
  const HOP = [
    { offset: 0, transform: "none" },
    { offset: 0.12, transform: "scale(1.12, 0.84)" },
    { offset: 0.3, transform: "translateY(-18%) scale(0.9, 1.12) rotate(-8deg)" },
    { offset: 0.46, transform: "translateY(0) scale(1.14, 0.86) rotate(3deg)" },
    { offset: 0.58, transform: "scale(0.96, 1.05)" },
    { offset: 0.7, transform: "none" },
    { offset: 1, transform: "none" },
  ];
  const hops = new Map();

  link.addEventListener("mouseenter", () => {
    letters.forEach((letter, i) => {
      const hop = hops.get(letter);
      if (hop && hop.playState === "running") {
        hop.effect.updateTiming({ iterations: Infinity });
        return;
      }
      hops.set(
        letter,
        letter.animate(HOP, {
          duration: 900,
          delay: i * 80,
          iterations: Infinity,
          easing: "cubic-bezier(0.3, 0, 0.3, 1)",
          composite: "add",
        }),
      );
    });
  });

  link.addEventListener("mouseleave", () => {
    hops.forEach((hop) => {
      const { currentIteration } = hop.effect.getComputedTiming();
      // Still waiting for its turn: nothing has moved yet, so just don't start.
      if (currentIteration === null) hop.cancel();
      else hop.effect.updateTiming({ iterations: currentIteration + 1 });
    });
  });
})();
