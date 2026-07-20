/* global addEventListener, document, window */

(() => {
  const sidebar = document.querySelector(".docs-sidebar");
  const toggle = document.querySelector("[data-docs-sidebar-toggle]");
  const links = [...document.querySelectorAll(".docs-nav a[href^='#']")];

  toggle?.addEventListener("click", () => {
    const isOpen = sidebar?.classList.toggle("is-open") ?? false;
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  const setActiveLink = () => {
    const current = links.find((link) => {
      const section = document.querySelector(link.getAttribute("href"));
      return (
        section?.getBoundingClientRect().top >= 0 &&
        section.getBoundingClientRect().top < window.innerHeight / 2
      );
    });
    links.forEach((link) => link.removeAttribute("aria-current"));
    current?.setAttribute("aria-current", "true");
  };

  addEventListener("scroll", setActiveLink, { passive: true });
  setActiveLink();

  const renderMermaid = (attempt = 0) => {
    if (window.docsMermaid?.run) {
      window.docsMermaid
        .run({ querySelector: ".mermaid" })
        .catch(() => undefined);
      return;
    }
    if (attempt < 6) window.setTimeout(() => renderMermaid(attempt + 1), 120);
  };

  renderMermaid();
})();
