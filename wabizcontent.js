!(function () {
  function e(e, t) {
    if (null === document.getElementById(e)) {
      var n = document.createElement("link");
      (n.rel = "stylesheet"),
        (n.type = "text/css"),
        (n.href = t),
        (n.id = e),
        (
          document.head ||
          document.body ||
          document.documentElement
        ).appendChild(n);
    }
  }
  chrome.runtime.onMessage.addListener(function (e, t, n) {
    switch (e.type) {
      case "pws::prepare-dom-manipulator":
        window.dispatchEvent(
          new CustomEvent("pws::prepare-dom-manipulator", {
            detail: {
              classes: e.classes,
              enhancements: e.enhancements,
              pinnedChats: e.pinnedChats,
            },
          })
        ),
          n();
        break;
      case "pws::send-message":
        d.sendMessage(e.task), n();
        break;
      case "pws::filter-whatsapp-numbers":
        d.filterWhatsappNumbers(e.numbers, e.id), n();
        break;
      case "pws::is-active?":
        n({
          type: "pws::page-is-active",
          active: d.isActive(),
        });
        break;
      case "pws::get-contacts":
        d.getContacts(), n();
        break;
      case "pws::get-all-contacts":
        d.getAllContacts(), n();
        break;
      case "pws::get-me":
        d.getMe(), n();
        break;
      case "pws::get-unread-messages":
        window.dispatchEvent(new CustomEvent("pws::get-unread-messages")), n();
        break;
      default:
        n();
    }
    return !0;
  }),
    window.addEventListener("pws::pinned-chats-change", function (e) {
      c({
        type: "pws::pinned-chats-change",
        pinnedChats: e.detail,
      });
    }),
    window.addEventListener("pws::client-ready", function () {
      c({
        type: "pws::client-ready",
      });
    });
  var t,
    n,
    s,
    a = !1;

  function i(e) {
    if (e && "pws::get-contacts" === e.type) d.getContacts();
  }

  function c(e) {
    chrome.runtime.sendMessage(e, function (e) {
      e && Array.isArray(e) ? e.forEach((e) => i(e)) : i(e);
    });
  }

  function d() {}
  window.addEventListener("pws::status-changed", function (e) {
    (a = !!e.detail.active), console.log("WhatsApp is connected:", a);
  }),
    window.addEventListener("pws::unread-messages-changed", function (e) {
      c({
        type: "pws::unread-messages-changed",
        unreadMessages: e.detail.unreadMessages,
      });
    }),
    ["pws::task-processing", "pws::task-completed", "pws::task-failed"].forEach(
      (e) => {
        window.addEventListener(e, function (t) {
          const n = t.detail.task;
          c({
            type: e,
            task: n,
          });
        });
      }
    ),
    (d.getContacts = function () {
      window.dispatchEvent(new CustomEvent("pws::get-contacts"));
    }),
    (d.getAllContacts = function () {
      window.dispatchEvent(new CustomEvent("pws::get-all-contacts"));
    }),
    (d.getMe = function () {
      window.dispatchEvent(new CustomEvent("pws::get-me"));
    }),
    (d.sendMessage = function (e) {
      window.dispatchEvent(
        new CustomEvent("pws::incoming-task", {
          detail: {
            task: e,
          },
        })
      );
    }),
    (d.filterWhatsappNumbers = function (e, t) {
      return (function (e, t, n = null, s = !0) {
        return new Promise((a, i) => {
          window.addEventListener(t, function e(i) {
            try {
              n && n(i);
            } catch (e) {}
            s && window.removeEventListener(t, e), a(i);
          }),
            window.dispatchEvent(e);
        });
      })(
        new CustomEvent("pws::filter-whatsapp-numbers", {
          detail: {
            numbers: e,
            id: t,
          },
        }),
        "pws::whatsapp-numbers-filtered"
      ).then((e) => {
        c({
          type: "pws::whatsapp-numbers-filtered",
          ...e.detail,
        });
      });
    }),
    (d.isActive = function () {
      return a;
    }),
    window.addEventListener("unload", function () {
      c({
        type: "pws::unload",
      });
    }),
    window.addEventListener("pws::contacts-ready", (e) => {
      console.log("Detail:", e.detail),
        c(
          Object.assign(
            {
              type: "pws::contacts-ready",
            },
            e.detail
          )
        );
    }),
    window.addEventListener("pws::all-contacts-ready", (e) => {
      console.log("Detail:", e.detail),
        c(
          Object.assign(
            {
              type: "pws::all-contacts-ready",
            },
            e.detail
          )
        );
    }),
    window.addEventListener("pws::me-ready", (e) => {
      console.log("Detail:", e.detail),
        c(
          Object.assign(
            {
              type: "pws::me-ready",
            },
            e.detail
          )
        );
    }),
    (t = "pws-id"),
    (n = chrome.runtime.id),
    ((s = document.createElement("meta")).name = t),
    (s.content = n),
    document.getElementsByTagName("head")[0].appendChild(s),
    (function (e) {
      try {
        var t = document.createElement("script");
        (t.type = "text/javascript"),
          (t.src = e),
          (
            document.head ||
            document.body ||
            document.documentElement
          ).appendChild(t);
      } catch (e) {
        console.log(e);
      }
    })(chrome.extension.getURL("js/mainlib.js")),
    e("pws-custom-css", chrome.extension.getURL("css/mainlib.css")),
    e("pws-tippy-css", chrome.extension.getURL("css/tiptop.css"));
})();
