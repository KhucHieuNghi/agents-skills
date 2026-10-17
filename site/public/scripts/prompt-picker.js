for (const picker of document.querySelectorAll("[data-prompt-picker]")) {
  const textarea = picker.querySelector(".prompt-text");
  const status = picker.querySelector("[data-copy-status]");
  const copy = picker.querySelector("[data-copy]");
  if (!textarea || !status || !copy) continue;

  let locale = picker.dataset.pageLocale;
  let host = "codex";
  const pageVi = picker.dataset.pageLocale === "vi";

  function render() {
    const template = picker.querySelector(
      `template[data-prompt-locale="${locale}"][data-prompt-host="${host}"]`,
    );
    if (!template) return;
    textarea.value = template.content.textContent?.trim() ?? "";
    status.textContent = "";
    for (const tab of picker.querySelectorAll("[data-choice]")) {
      const selected =
        tab.dataset.host === host || tab.dataset.locale === locale;
      tab.setAttribute("aria-pressed", String(selected));
    }
  }

  picker.querySelectorAll("[data-choice-group]").forEach((list) => {
    list.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-choice]");
      if (!tab) return;
      if (tab.dataset.host) host = tab.dataset.host;
      if (tab.dataset.locale) locale = tab.dataset.locale;
      render();
    });
    list.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
        return;
      const tabs = [...list.querySelectorAll("[data-choice]")];
      const current = tabs.indexOf(document.activeElement);
      if (current < 0) return;
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
              tabs.length;
      tabs[next].click();
      tabs[next].focus();
    });
  });

  copy.addEventListener("click", async () => {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(textarea.value);
      status.textContent = pageVi ? "Đã sao chép prompt." : "Prompt copied.";
      copy.classList.add("copied");
      window.setTimeout(() => copy.classList.remove("copied"), 1400);
    } catch {
      textarea.focus();
      textarea.select();
      status.textContent = pageVi
        ? "Không thể sao chép tự động. Prompt đã được chọn để bạn sao chép thủ công."
        : "Automatic copy failed. The prompt is selected for manual copying.";
    }
  });
}
