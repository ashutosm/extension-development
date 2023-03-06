let activeTab = null;
var cancelTask,
  pauseTask,
  continueTask,
  taskPaused,
  pauseFiltering,
  continueFiltering,
  cancelTimeout,
  taskPromise,
  contacts = [],
  broadcasts = [],
  groups = [],
  me = [],
  chats = [],
  labels = [],
  reports = {
    individual: [],
    groups: [],
  },
  popupProps = null,
  isBusy = !1,
  profile = null,
  unreadMessages = [],
  supportedLanguages = {
    en: "English",
    ru: "Russian",
    ar: "Arabic",
    id: "Indonesian",
    pt: "Portuguese",
    es: "Español",
    cn: "中国人",
    fa: "فارسی",
  },
  fallBackLanguage = "en",
  language = "en",
  templates = [],
  filterContacts = [],
  filterValids = [],
  filterInvalids = [],
  filterPendings = [],
  filterStarttime = null,
  filterPaused = !1,
  filtering = !1,
  cancelFiltering = null,
  filterComponent = null,
  filterPromise = null,
  taskId = null,
  DOMSelectors = {
    sidePane: "#pane-side",
    chatList: "[aria-label='Chat list']",
    recentMessages: "[data-testid]>div:nth-child(2)>div:nth-child(2)>div>span",
    sidePaneContactNames:
      "[data-testid]>div:nth-child(2)>div:nth-child(1)>div span[title]",
    sidePaneContactPhotos: "[data-testid]>div:nth-child(1)",
    mainPanel: "#main",
    mainPanelContactNames: "#main header div[role=button] span[title]",
    mainPanelContactPhotos: "#main header>div[role=button]:nth-child(1)",
    conversationMessagesIn: ".message-in",
    conversationMessagesOut: ".message-out",
    likeButtonId: "like-button",
    voiceRecordButton: 'button[aria-label="Voice message"]',
    likeButtonSvgContainer: "span[data-icon]",
    messageInput: "#main > footer .copyable-text.selectable-text",
    sendButton: "#main > footer button > span[data-icon='send']",
    statusButton: ".rOo0o",
    addChatButtonId: "add-chat-button",
    addChatButtonSvgContainer: "span[data-icon]",
    chatFoldersTabId: "chat-folders",
    searchBoxContainer: "#side ._3gYev",
    searchButton: "div[role=button][title='Search…']",
    userInfoButtonId: "user-info-button",
    userInfoButtonSvgContainer: "span[data-icon]",
    quick_replies_id: "quick-replies",
  },
  enhancements = {
    blurRecentMessages: !1,
    blurContactNames: !1,
    blurContactPhotos: !1,
    blurConversationMessages: !1,
    enableLikeButton: !1,
    enableMessageReactions: !1,
    pinUnreadChats: !1,
    removeDuplicateContacts: !1,
  },
  pinnedChats = [];

function getFromStorage(e, t) {
  return new Promise((n) => {
    chrome.storage.local.get(
      {
        [e]: t,
      },
      function (s) {
        return s[e] ? n(s[e]) : n(t);
      }
    );
  });
}

function UpdateEnhancements(e) {
  sendMessage({
    type: "pws::prepare-dom-manipulator",
    classes: DOMSelectors,
    enhancements: (enhancements = e || enhancements),
    pinnedChats: pinnedChats,
  });
}

function handleResponse(e) {
  if (e && "pws::page-is-active" === e.type)
    e.active && window.dispatchEvent(new CustomEvent("pws::page-is-active"));
}

function sendMessage(e) {
  if (!activeTab) throw new Error("There is no active tab!");
  try {
    chrome.tabs.sendMessage(activeTab.id, e, function (e) {
      e && Array.isArray(e)
        ? e.forEach((e) => handleResponse(e))
        : handleResponse(e);
    });
  } catch (e) {
    console.log(e);
  }
}

function handleUserChange(e, t) {
  APIHelper.FetchProfile(), APIHelper.FetchTemplates();
}

function GetContacts() {
  return new Promise((e) => {
    window.addEventListener("pws::all-contacts-ready", function t(n) {
      console.log("get contacts: ", n.detail);
      e(n.detail), window.removeEventListener("pws::all-contacts-ready", t);
    }),
      sendMessage({
        type: "pws::get-all-contacts",
      });
  });
}

function UpdateIndividualRequest(e, t) {
  (reports.individual = reports.individual.map((n) =>
    n.id === e ? { ...n, ...t } : n
  )),
    window.dispatchEvent(new CustomEvent("reports::updated"));
}

function ProcessTask(e, t, n, s, a) {
  const i = {
    group_id: `${Math.random()}.${Date.now()}`,
    timestamp: new Date(),
  };
  let r,
    o = {};
  if (!e && !n.length)
    throw new Error("You need to provide text or attachments");
  if (
    ((i.text = e),
    (i.caption = Boolean(a)),
    (i.attachments = n.length ? n : null),
    !t || !t.length)
  )
    throw new Error("You need to provide a recipient at least");
  (i.schedule = s), console.log("mainTask : ", i);
  let l = 0,
    c = t.map((t) => ({
      ...i,
      id: `${Date.now()}-${Math.random()}-${Math.random()}`,
      recipients: [t],
      recipientName: (t.entity && t.entity.name) || t,
      status: "Pending",
      text: t.message || e,
      __rowNum__: t.__rowNum__,
      cancel: function (e) {
        const t = reports.individual.filter((t) => t.id === e)[0];
        t &&
          "Pending" === t.status &&
          ((c = c.filter((t) => t.id !== e)),
          o.id === t.id && (clearTimeout(r), (o = null), l--, u()),
          UpdateIndividualRequest(e, {
            status: "Cancelled",
            next: !1,
          }));
      },
    }));
  try {
    cancelTask && cancelTask(), (taskPaused = !1);
  } catch (e) {}
  (isBusy = !0),
    (cancelTask = function () {
      (c = []),
        (o = null),
        clearTimeout(r),
        (reports.individual = reports.individual.map((e) =>
          e.group_id !== i.group_id ||
          ("Pending" !== e.status && "Sending" !== e.status)
            ? e
            : { ...e, status: "Cancelled", next: !1 }
        )),
        (isBusy = !1),
        window.dispatchEvent(new CustomEvent("reports::updated")),
        (cancelTask = void 0);
    }),
    (pauseTask = function () {
      (o = null),
        l--,
        clearTimeout(r),
        (reports.individual = reports.individual.map((e) =>
          e.group_id === i.group_id && "Pending" === e.status
            ? { ...e, next: !1 }
            : e
        )),
        (taskPaused = !0),
        window.dispatchEvent(new CustomEvent("reports::updated"));
    }),
    (continueTask = function () {
      (taskPaused = !1), u();
    }),
    (reports.individual = c),
    window.dispatchEvent(new CustomEvent("reports::updated"));
  const d = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];

  function u() {
    if (l >= c.length)
      return (
        (isBusy = !1), window.dispatchEvent(new CustomEvent("reports::updated"))
      );
    var e = 0;
    chrome.storage.local.get(["TIMELAST"], function (t) {
      e = void 0 === t.TIMELAST ? 0 : t.TIMELAST ? 1 : 0;
    });
    const n = (function () {
      o = c[l];
      const e = Number(s.batchNo),
        n = s.isBatchMessagingEnabled ? Number(s.batchDelay) : 0,
        a = s.isTimeDelayBetweenMessagesEnabled ? Number(s.messageDelay) : 0;
      return 0 === l
        ? (l++, 1e3 * a)
        : e && n && e < t.length && l % e == 0
        ? (l++, 60 * n * 1e3)
        : (l++, 1e3 * a);
    })();
    UpdateIndividualRequest(o.id, {
      next: Date.now() + n,
    }),
      clearTimeout(r),
      (r = setTimeout(() => {
        if (e) {
          var t = new Date(),
            n =
              t.getDate() +
              " " +
              d[t.getMonth()] +
              ", " +
              t.getFullYear() +
              " ";
          t.getHours() < 10
            ? (n += "0" + t.getHours() + ":")
            : (n += t.getHours() + ":"),
            t.getMinutes() < 10
              ? (n += "0" + t.getMinutes() + ":")
              : (n += t.getMinutes() + ":"),
            t.getSeconds() < 10
              ? (n += "0" + t.getSeconds())
              : (n += t.getSeconds()),
            (o.text = o.text); //+ "\nSent On : " + n
        }
        UpdateIndividualRequest((taskId = o.id), {
          status: "Sending",
        }),
          Promise.race([
            waitForActiveTabVerification(!1),
            throwAfterTimeout(12e3),
          ])
            .then((e) => {
              (taskPromise = new Deferred()),
                Promise.race([taskPromise.promise, throwAfterTimeout(9e3)])
                  .then((e) => {
                    UpdateIndividualRequest(taskId, {
                      status: "Success",
                      next: !1,
                    }),
                      u();
                  })
                  .catch((e) => {
                    UpdateIndividualRequest(taskId, {
                      status: "Failed",
                      next: !1,
                    }),
                      u();
                  }),
                sendMessage({
                  type: "pws::send-message",
                  task: o,
                });
            })
            .catch((e) => {
              UpdateIndividualRequest(taskId, {
                status: "Failed",
                next: !1,
              }),
                u();
            });
      }, n + getRandomArbitrary(1500, 2e3)));
  }
  u();
}
chrome.runtime.onMessage.addListener((e, t, n) => {
  switch (e.type) {
    case "pws::client-ready":
      (activeTab = t && t.tab),
        window.dispatchEvent(new CustomEvent("pws::page-is-ready")),
        n([
          {
            type: "pws::get-contacts",
          },
          {
            type: "pws::get-me",
          },
        ]),
        getFromStorage("pinnedChats", []).then((e) => {
          (pinnedChats = [...e]),
            APIHelper.FetchDOMSelectors().finally(() => {
              sendMessage({
                type: "pws::prepare-dom-manipulator",
                classes: DOMSelectors,
                enhancements: enhancements,
                pinnedChats: pinnedChats,
              });
            });
        });
      break;
    case "pws::pinned-chats-change":
      (pinnedChats = e.pinnedChats),
        chrome.storage.local.set({
          pinnedChats: pinnedChats,
        });
      break;
    case "pws::contacts-ready":
      (contacts = e.contacts || []),
        (chats = e.chats || []),
        (broadcasts = e.broadcasts || []),
        (groups = e.groups || []),
        (me = e.me || []),
        (labels = e.labels || []),
        console.log("labels : ", labels),
        handleUserChange(),
        n();
      break;
    case "pws::all-contacts-ready":
      window.dispatchEvent(
        new CustomEvent("pws::all-contacts-ready", {
          detail: { ...e },
        })
      ),
        n();
      break;
    case "pws::me-ready":
      (me = e.me || []), handleUserChange(), n();
      break;
    case "pws::whatsapp-numbers-filtered":
      window.dispatchEvent(
        new CustomEvent("pws::whatsapp-numbers-filtered", {
          detail: Object.assign({}, e, {
            type: void 0,
          }),
        })
      ),
        n();
      break;
    case "pws::unread-messages-changed":
      e.unreadMessages &&
        Array.isArray(e.unreadMessages) &&
        (unreadMessages = e.unreadMessages),
        window.dispatchEvent(new CustomEvent("pws::unread-messages-changed")),
        n();
      break;
    case "pws::task-processing":
    case "pws::task-completed":
    case "pws::task-failed":
      window.dispatchEvent(
        new CustomEvent(e.type, {
          detail: {
            task: e.task,
          },
        })
      ),
        n();
      break;
    case "pws::unload":
      window.dispatchEvent(new CustomEvent(e.type)), n();
      break;
    default:
      n();
  }
  return !0;
}),
  chrome.runtime.onStartup.addListener(function () {
    getFromStorage("pinnedChats", []).then((e) => {
      pinnedChats = [...e];
    });
  }),
  getFromStorage("pinnedChats", []).then((e) => {
    pinnedChats = [...e];
  });
class Deferred {
  constructor() {
    this.promise = new Promise((e, t) => {
      (this.reject = t), (this.resolve = e);
    });
  }
}
const taskFailedHandler = (e) => {
    const t = e.detail.task;
    t && t.id === taskId && taskPromise && taskPromise.reject();
  },
  taskSuccessHandler = (e) => {
    const t = e.detail.task;
    t && t.id === taskId && taskPromise && taskPromise.resolve();
  };

function getRandomArbitrary(e = 0, t = 0) {
  return Math.random() * (t - e) + e;
}

function GetUnreadMessages() {
  return new Promise((e, t) => {
    window.addEventListener("pws::unread-messages-changed", () => {
      e(unreadMessages);
    }),
      sendMessage({
        type: "pws::get-unread-messages",
      });
  });
}

function WatchReports(e) {
  e(reports, isBusy),
    window.addEventListener("reports::updated", (t) => e(reports, isBusy));
}

function WatchFilterReports(e) {
  e(
    filterContacts,
    filterValids,
    filterInvalids,
    filterPendings,
    filterStarttime,
    filterPaused,
    filtering
  ),
    window.addEventListener("filter-reports::updated", (t) =>
      e(
        filterContacts,
        filterValids,
        filterInvalids,
        filterPendings,
        filterStarttime,
        filterPaused,
        filtering
      )
    );
}

function WatchProfileUpdate(e) {
  window.addEventListener("profile::updated", (t) =>
    e(profile.lastdate ? profile : null)
  );
}

function WatchTemplatesUpdate(e) {
  window.addEventListener("templates::updated", (t) => e(templates));
}

function WatchReload(e) {
  window.addEventListener("pws::unload", (t) => e());
}
window.addEventListener("pws::task-completed", taskSuccessHandler),
  window.addEventListener("pws::task-failed", taskFailedHandler);
const getTabs = (e) => new Promise((t) => chrome.tabs.query(e, t)),
  closeTabs = (e) =>
    new Promise((t) =>
      chrome.tabs.remove(
        e.map((e) => e.id),
        t
      )
    ),
  reloadTab = (e) => new Promise((t) => chrome.tabs.reload(e, t)),
  createTab = (e) => new Promise((t) => chrome.tabs.create(e, t));

function waitForActiveTab(e) {
  return new Promise((t, n) => {
    window.addEventListener("pws::page-is-active", function e() {
      window.removeEventListener("pws::page-is-active", e), t(!0);
    }),
      e &&
        sendMessage({
          type: "pws::is-active?",
        });
  });
}

function reloadOrCreateActiveTab(e = !0) {
  return new Promise((t, n) => {
    window.addEventListener("pws::page-is-ready", function () {
      t(activeTab);
    }),
      getTabs({
        url: "*://web.whatsapp.com/",
      }).then((n) => {
        if (n.length) {
          const a = n.pop();
          n.length && closeTabs(n),
            e
              ? ((s = a.id), new Promise((e) => chrome.tabs.reload(s, e))).then(
                  t
                )
              : t();
        } else
          0 === n.length &&
            createTab({
              active: !0,
              url: "https://web.whatsapp.com/",
            }).then(t);
        var s;
      });
  });
}

function IsWhatsAppOpen() {
  return getTabs({
    url: "*://web.whatsapp.com/",
  }).then((e) => !!e.length);
}

function IsWhatsAppFocused() {
  return getTabs({
    url: "*://web.whatsapp.com/",
    active: !0,
  }).then(
    (e) => (
      e.length ||
        createTab({
          active: !0,
          url: "https://web.whatsapp.com/",
        }).then(resolve),
      !0
    )
  );
}

function IsPresentTabConnected() {
  return getTabs({
    url: "*://web.whatsapp.com/",
    active: !0,
  }).then((e) => !!e.length && !(!activeTab || activeTab.id !== e[0].id));
}

function IsWhatsAppConnected() {
  return Promise.race([throwAfterTimeout(1e4), waitForActiveTab(!0)]);
}

function FocusOnTab() {
  if (activeTab)
    return chrome.tabs.update(
      activeTab.id,
      {
        active: !0,
      },
      (e) => {}
    );
  getTabs({
    url: "*://web.whatsapp.com/",
  }).then((e) => {
    e.length && closeTabs(e),
      createTab({
        active: !0,
        url: "https://web.whatsapp.com/",
      });
  });
}

function waitForActiveTabVerification(e = !0) {
  return new Promise((t, n) => {
    Promise.race([throwAfterTimeout(4e3), waitForActiveTab(!0)])
      .then(t)
      .catch((s) => {
        console.log("Failed to get across to the other tab");
        const a = waitForActiveTab();
        reloadOrCreateActiveTab(e).then(() => {
          sendMessage({
            type: "pws::is-active?",
          }),
            Promise.race([throwAfterTimeout(4e3), a])
              .then(t)
              .catch(n),
            t();
        });
      });
  });
}

function _FilterWhatsAppNumbers(e = []) {
  return new Promise((t, n) => {
    (e = e || []),
      waitForActiveTabVerification()
        .then((n) => {
          const s = `${Date.now()}-${Math.random()}`;
          window.addEventListener(
            "pws::whatsapp-numbers-filtered",
            function (e) {
              e.detail && e.detail.id === s && t(e.detail.numbers || []);
            }
          ),
            sendMessage({
              type: "pws::filter-whatsapp-numbers",
              numbers: e,
              id: s,
            });
        })
        .catch(n);
  });
}

function FilterWhatsAppNumbers(e = [], t) {
  (e = e || []),
    (filterContacts = [...e]),
    (filterValids = []),
    (filterInvalids = []),
    (filterStarttime = new Date()),
    window.dispatchEvent(new CustomEvent("filter-reports::updated"));
  const n = [...e];
  return (
    (filterPendings = [...n]),
    (filterComponent = t),
    (filterPromise = new Promise(async (e, t) => {
      if (filtering) return t("Another task is running, cancel that and retry");
      (filtering = !0),
        (filterPaused = !1),
        (cancelFiltering = function () {
          return (
            (filtering = !1),
            (filterInvalids = [
              ...filterInvalids,
              ...n.filter((e) => !filterValids.filter((t) => t.value === e)[0]),
            ]),
            setTimeout(() => {
              filterPromise = null;
            }, 100),
            window.dispatchEvent(new CustomEvent("filter-reports::updated")),
            t("Filtering task is cancelled successfully")
          );
        }),
        (pauseFiltering = function () {
          (filtering = !1),
            (filterPaused = !0),
            window.dispatchEvent(new CustomEvent("filter-reports::updated"));
        }),
        (continueFiltering = function () {
          (filterPaused = !1),
            a(),
            window.dispatchEvent(new CustomEvent("filter-reports::updated"));
        });
      const s = (e) => new Promise((t) => setTimeout(t, e));
      async function a() {
        for (filtering = !0; n.length > 0; ) {
          const t = n.splice(0, 1);
          filterPendings = [...n];
          try {
            await _FilterWhatsAppNumbers(t)
              .then((e) => {
                const s = e.map((e) => ({ ...t[0], value: e.phone })),
                  a = s.length > 0;
                filtering
                  ? (a
                      ? (filterValids = [...filterValids, ...s])
                      : (filterInvalids = [...filterInvalids, ...t]),
                    window.dispatchEvent(
                      new CustomEvent("filter-reports::updated")
                    ))
                  : (n.splice(0, 0, ...t), (filterPendings = [...n]));
              })
              .catch((e) => console.log(e));
          } catch (e) {
            console.log(e);
          }
          if (
            (await s(400),
            filterInvalids.length + filterValids.length ===
              filterContacts.length &&
              ((filtering = !1),
              (filterPaused = !1),
              (cancelFiltering = null),
              (pauseFiltering = null),
              (continueFiltering = null),
              e({
                valids: filterValids,
                failures: filterInvalids,
              })),
            !filtering)
          )
            break;
        }
      }
      a();
    }))
  );
}

function APIHelper() {}
(APIHelper.baseUrl = "https://www.wabiz.in"),
  (APIHelper.ExecRequest = function (e, t = "GET", n) {
    let s = {
      method: t,
      body: JSON.stringify(n),
      redirect: "follow",
      headers: {
        "Content-Type": "application/json",
      },
    };
    return "GET" === t && delete s.body, fetch(e, s).then((e) => e.json());
  }),
  (APIHelper.FetchProfile = function () {
    const e = me.length && me[0].id && me[0].id.user;
    if (!e) return (profile = null), Promise.resolve(null);
    var t = chrome.runtime.getManifest();
    return this.ExecRequest(
      `${this.baseUrl}/welcome/validateNumber?mobile=${e}&name=${me[0].displayName}&newver=${t.version}`
    )
      .then((e) => ((profile = e).lastdate ? profile : null))
      .catch((e) => (profile = null))
      .finally((e) => {
        window.dispatchEvent(new CustomEvent("profile::updated"));
      });
  }),
  (APIHelper.FetchTemplates = function () {
    const e = me.length && me[0].id && me[0].id.user;
    return e
      ? this.ExecRequest(`${this.baseUrl}/welcome/templates?mobile=${e}`)
          .then((e) => {
            if (e.error) var t = [];
            else t = e;
            return (
              JSON.stringify(t) !== JSON.stringify(templates) &&
                ((templates = t),
                window.dispatchEvent(new CustomEvent("templates::updated"))),
              templates
            );
          })
          .catch((e) => Promise.reject("Could not save template successfully"))
      : Promise.resolve(null);
  }),
  (APIHelper.SaveTemplates = function (e) {
    const t = me.length && me[0].id && me[0].id.user;
    return t
      ? this.ExecRequest(`${this.baseUrl}/welcome/saveTemplates`, "POST", {
          mobile: t,
          templates: e,
        })
          .then((e) => "Save success" === e.status)
          .catch((e) => Promise.reject("Could not save template successfully"))
          .finally((e) => {
            this.FetchTemplates();
          })
      : Promise.resolve(null);
  }),
  (APIHelper.Savedata = function (e, t, n, s) {
    const a = me.length && me[0].id && me[0].id.user;
    return a
      ? this.ExecRequest(`${this.baseUrl}/welcome/saveTemplates`, "POST", {
          mobile: a,
          total: e,
          sent: t,
          fail: n,
          stamp: s,
        })
          .then((e) => "Save success" === e.status)
          .catch((e) => Promise.reject("Could not save template successfully"))
      : Promise.resolve(null);
  }),
  (APIHelper.getData = function (e, t, n) {
    const s = me.length && me[0].id && me[0].id.user;
    return s
      ? this.ExecRequest(`${this.baseUrl}/getdata.php`, "POST", {
          mobile: s,
          a: e,
          b: t,
          c: n,
        })
          .then((e) => "Success" === e.status)
          .catch((e) => Promise.reject("Could not get template successfully"))
          .finally((e) => {
            this.FetchTemplates();
          })
      : Promise.resolve(null);
  }),
  (APIHelper.FetchDOMSelectors = function () {
    return this.ExecRequest(`${this.baseUrl}/welcome/domSelectors`, "GET")
      .then((e) => {
        DOMSelectors = e;
      })
      .catch((e) =>
        Promise.reject("Could not fetch dom selectors successfully")
      );
  });
const getLanguage = () => {
  Promise.all([
    fetch("http://ip-api.com/json").then((e) => e.json()),
    fetch("/locales/countries.json").then((e) => e.json()),
  ]).then(([e, t]) => {
    let n = t.filter((t) => t.alpha2 === e.countryCode)[0];
    if (!n) return (language = "en");
    let s = n.languages ? n.languages[0] : "en",
      a = s ? s.split("_")[0] : "en";
    supportedLanguages[a] && (language = a);
  });
};
Promise.all([
  fetch("http://ip-api.com/json").then((e) => e.json()),
  fetch("/locales/countries.json").then((e) => e.json()),
]).then(([e, t]) => {
  let n = t.filter((t) => t.alpha2 === e.countryCode)[0];
  if (!n) return (language = "en");
  let s = n.languages ? n.languages[0] : "en",
    a = s ? s.split("_")[0] : "en";
  supportedLanguages[a] && (language = a);
});
const throwAfterTimeout = (e) => new Promise((t, n) => setTimeout(n, e));
chrome.runtime.onInstalled.addListener(async () => {
  waitForActiveTabVerification();
});
