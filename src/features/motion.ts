const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function flyToCart(source: HTMLElement | null | undefined): void {
  if (!source) return;
  const target = document.querySelector<HTMLElement>(".cx-cartbtn");
  if (!target) return;
  if (prefersReducedMotion()) {
    bumpCart();
    return;
  }

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();

  const ghost = source.cloneNode(true) as HTMLElement;
  ghost.setAttribute("aria-hidden", "true");
  ghost.classList.add("cx-flyimg");
  ghost.style.position = "fixed";
  ghost.style.left = `${from.left}px`;
  ghost.style.top = `${from.top}px`;
  ghost.style.width = `${from.width}px`;
  ghost.style.height = `${from.height}px`;
  ghost.style.margin = "0";
  ghost.style.pointerEvents = "none";
  document.body.appendChild(ghost);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);

  const anim = ghost.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      {
        transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 90}px) scale(0.55)`,
        opacity: 0.95,
        offset: 0.55,
      },
      { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0.25 },
    ],
    { duration: 560, easing: "cubic-bezier(0.5, 0, 0.6, 0.4)" }
  );

  anim.onfinish = () => {
    ghost.remove();
    bumpCart();
  };
}

export function bumpCart(): void {
  const target = document.querySelector<HTMLElement>(".cx-cartbtn");
  if (!target) return;
  const badge = target.querySelector<HTMLElement>(".cx-cartbtn__badge");
  target.classList.remove("is-bumped");
  badge?.classList.remove("is-bumped");
  void target.offsetWidth;
  if (!prefersReducedMotion()) {
    target.classList.add("is-bumped");
    badge?.classList.add("is-bumped");
  }
}
