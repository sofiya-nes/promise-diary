/**
 * Хранилище дел в localStorage браузера.
 * Каждое дело лежит под своим ключом "promise-diary:case:<id>".
 */
var CaseStore = (function () {
  "use strict";

  var PREFIX = "promise-diary:case:";
  var STATUSES = ["open", "done", "refused", "cancelled"];
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  /**
   * Создаёт уникальный идентификатор дела из времени и случайной части.
   */
  function createId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /**
   * Проверяет запись и приводит её к единому виду.
   * Возвращает исправленное дело или бросает ошибку.
   * Битые комментарии отбрасываются, само дело при этом сохраняется.
   */
  function normalize(raw, id) {
    if (!raw || typeof raw !== "object") {
      throw new Error("запись не является объектом");
    }
    if (typeof raw.title !== "string" || raw.title.trim() === "") {
      throw new Error("нет названия");
    }
    if (!DATE_RE.test(raw.promisedAt)) {
      throw new Error("неверная дата обещания");
    }
    if (!DATE_RE.test(raw.dueAt)) {
      throw new Error("неверный срок");
    }

    var comments = Array.isArray(raw.comments) ? raw.comments : [];
    var goodComments = comments.filter(function (comment) {
      return comment && typeof comment.text === "string" && typeof comment.at === "string";
    });

    return {
      id: id,
      title: raw.title,
      requester: typeof raw.requester === "string" ? raw.requester : "",
      request: typeof raw.request === "string" ? raw.request : "",
      answer: typeof raw.answer === "string" ? raw.answer : "",
      promisedAt: raw.promisedAt,
      dueAt: raw.dueAt,
      status: STATUSES.indexOf(raw.status) >= 0 ? raw.status : "open",
      closedAt: typeof raw.closedAt === "string" ? raw.closedAt : null,
      createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
      comments: goodComments,
      lostComments: comments.length - goodComments.length
    };
  }

  /**
   * Загружает все дела.
   * Возвращает { cases: [...], problems: [...] }, где problems — тексты
   * предупреждений о записях, которые не удалось прочитать.
   */
  function loadAll() {
    var cases = [];
    var problems = [];

    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key.indexOf(PREFIX) !== 0) {
        continue;
      }
      try {
        var item = normalize(JSON.parse(localStorage.getItem(key)), key.slice(PREFIX.length));
        if (item.lostComments > 0) {
          problems.push("Дело «" + item.title + "»: пропущено повреждённых комментариев — " + item.lostComments + ".");
        }
        delete item.lostComments;
        cases.push(item);
      } catch (error) {
        problems.push("Запись " + key.slice(PREFIX.length) + " повреждена и пропущена (" + error.message + ").");
      }
    }
    return { cases: cases, problems: problems };
  }

  /**
   * Сохраняет одно дело под его ключом и обновляет время изменения.
   */
  function save(item) {
    item.updatedAt = new Date().toISOString();
    localStorage.setItem(PREFIX + item.id, JSON.stringify(item));
    return item;
  }

  return {
    createId: createId,
    normalize: normalize,
    loadAll: loadAll,
    save: save
  };
})();
