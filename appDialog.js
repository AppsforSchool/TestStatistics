// ブラウザ標準のconfirm()/alert()の代わりに使う、サイト独自のモーダル。
const AppDialog = (() => {
  let modal, titleEl, messageEl, okButton, cancelButton;
  let resolver = null;

  function ensureInit() {
    if (modal) return;
    modal = document.getElementById("app-dialog-modal");
    titleEl = document.getElementById("app-dialog-title");
    messageEl = document.getElementById("app-dialog-message");
    okButton = document.getElementById("app-dialog-ok-button");
    cancelButton = document.getElementById("app-dialog-cancel-button");

    okButton.addEventListener("click", () => finish(true));
    cancelButton.addEventListener("click", () => finish(false));
    modal.addEventListener("click", event => {
      if (event.target === modal) finish(false);
    });
  }

  function finish(result) {
    modal.classList.add("hidden");
    if (resolver) {
      const resolve = resolver;
      resolver = null;
      resolve(result);
    }
  }

  function show({ title, message, okText, cancelText, showCancel, danger }) {
    ensureInit();
    titleEl.textContent = title || "";
    titleEl.classList.toggle("hidden", !title);
    messageEl.textContent = message || "";
    okButton.textContent = okText || "OK";
    okButton.classList.toggle("app-dialog-danger", !!danger);
    cancelButton.textContent = cancelText || "キャンセル";
    cancelButton.classList.toggle("hidden", !showCancel);
    modal.classList.remove("hidden");
    return new Promise(resolve => {
      resolver = resolve;
    });
  }

  function confirmDialog(message, options) {
    return show({ message, showCancel: true, ...options });
  }

  function alertDialog(message, options) {
    return show({ message, showCancel: false, ...options }).then(() => {});
  }

  return { confirm: confirmDialog, alert: alertDialog };
})();
