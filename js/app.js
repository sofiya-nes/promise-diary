/**
 * Интерфейс приложения: список дел и карточка дела.
 */
(function () {
  "use strict";

  var STATUS_NAMES = {
    open: "открыто",
    done: "выполнено",
    refused: "отказано",
    cancelled: "отменено"
  };

  var cases = [];
  var selectedId = null;

  /**
   * Находит элемент страницы по id.
   */
  function $(id) {
    return document.getElementById(id);
  }

  /**
   * Запуск: загружает дела, вешает обработчики кнопок, показывает список.
   */
  function start() {
    var loaded = CaseStore.loadAll();
    cases = loaded.cases;
    showWarnings(loaded.problems);

    $("new-case").addEventListener("click", function () {
      openCase(null);
    });
    $("warnings-close").addEventListener("click", function () {
      $("warnings").hidden = true;
    });
    $("case-cancel").addEventListener("click", function () {
      $("card").hidden = true;
    });
    $("case-form").addEventListener("submit", saveCase);
    $("comment-form").addEventListener("submit", addComment);
    $("show-closed").addEventListener("change", renderList);
    $("search").addEventListener("input", renderList);

    $("date").value = todayIso();
    $("date").addEventListener("change", renderList);
    $("date-prev").addEventListener("click", function () {
      shiftDate(-1);
    });
    $("date-next").addEventListener("click", function () {
      shiftDate(1);
    });
    $("date-today").addEventListener("click", function () {
      $("date").value = todayIso();
      renderList();
    });
    document.querySelectorAll('input[name="period"]').forEach(function (radio) {
      radio.addEventListener("change", renderList);
    });

    $("card").hidden = true;
    renderList();
  }

  /**
   * Показывает плашку с предупреждениями, если они есть.
   */
  function showWarnings(problems) {
    $("warning-list").innerHTML = "";
    for (var i = 0; i < problems.length; i++) {
      var li = document.createElement("li");
      li.textContent = problems[i];
      $("warning-list").appendChild(li);
    }
    $("warnings").hidden = problems.length === 0;
  }

  /**
   * Перерисовывает список дел за выбранный период.
   */
  function renderList() {
    var today = todayIso();
    var range = periodRange();
    var query = $("search").value.trim().toLowerCase();
    $("case-list").innerHTML = "";
    $("period-title").textContent = range.from === range.to ? range.from : range.from + " — " + range.to;
    if (query) {
      $("period-title").textContent = "Поиск: " + $("search").value.trim();
    }

    var shown = 0;
    cases.forEach(function (item) {
      if (item.status !== "open" && !$("show-closed").checked) {
        return;
      }
      if (query && !matches(item, query)) {
        return;
      }
      if (!query && (item.promisedAt > range.to || item.dueAt < range.from)) {
        return;
      }
      var li = document.createElement("li");
      li.textContent = item.title + " — " + item.requester + " — срок " + item.dueAt + " — " + STATUS_NAMES[item.status];
      if (item.status === "open" && item.dueAt < today) {
        li.textContent += " — ПРОСРОЧЕНО";
      }
      li.addEventListener("click", function () {
        openCase(item);
      });
      $("case-list").appendChild(li);
      shown++;
    });

    $("empty-message").hidden = shown > 0;
  }

  /**
   * Открывает карточку: существующее дело или пустую форму для нового (item = null).
   */
  function openCase(item) {
    selectedId = item ? item.id : null;
    $("card-title").textContent = item ? "Карточка дела" : "Новое дело";

    $("case-title").value = item ? item.title : "";
    $("case-requester").value = item ? item.requester : "";
    $("case-request").value = item ? item.request : "";
    $("case-answer").value = item ? item.answer : "";
    $("case-promised").value = item ? item.promisedAt : todayIso();
    $("case-due").value = item ? item.dueAt : todayIso();
    $("case-status").value = item ? item.status : "open";

    $("comments").hidden = !item;
    if (item) {
      renderComments(item);
    }
    $("card").hidden = false;
  }

  /**
   * Сохраняет дело из формы. Форма при этом не очищается,
   * поэтому если сохранить не удалось, введённое остаётся на месте.
   */
  function saveCase(event) {
    event.preventDefault();

    var item = findCase(selectedId);
    if (!item) {
      item = { id: CaseStore.createId(), createdAt: new Date().toISOString(), comments: [] };
      cases.push(item);
    }

    item.title = $("case-title").value;
    item.requester = $("case-requester").value;
    item.request = $("case-request").value;
    item.answer = $("case-answer").value;
    item.promisedAt = $("case-promised").value;
    item.dueAt = $("case-due").value;
    item.status = $("case-status").value;

    CaseStore.save(item);
    openCase(item);
    renderList();
  }

  /**
   * Поиск идёт по всем делам, без учёта периода.
   */
  function matches(item, query) {
    var text = item.title + " " + item.requester + " " + item.request + " " + item.answer;
    item.comments.forEach(function (comment) {
      text += " " + comment.text;
    });
    return text.toLowerCase().indexOf(query) >= 0;
  }

  /**
   * Показывает комментарии дела: время и текст.
   */
  function renderComments(item) {
    $("comment-list").innerHTML = "";
    item.comments.forEach(function (comment) {
      var li = document.createElement("li");
      li.textContent = comment.at + " — " + comment.text;
      $("comment-list").appendChild(li);
    });
  }

  /**
   * Добавляет комментарий с текущим временем к открытому делу и сразу сохраняет.
   */
  function addComment(event) {
    event.preventDefault();

    var item = findCase(selectedId);
    item.comments.push({ at: nowText(), text: $("comment-text").value });
    CaseStore.save(item);
    $("comment-text").value = "";
    renderComments(item);
  }

  /**
   * Ищет дело по id, возвращает null, если не нашлось.
   */
  function findCase(id) {
    for (var i = 0; i < cases.length; i++) {
      if (cases[i].id === id) {
        return cases[i];
      }
    }
    return null;
  }

  /**
   * Выбранный период: "day", "week" или "month".
   */
  function selectedPeriod() {
    return document.querySelector('input[name="period"]:checked').value;
  }

  /**
   * Начало и конец выбранного периода в виде { from, to }.
   * Неделя — с понедельника по воскресенье.
   */
  function periodRange() {
    var date = fromIso($("date").value || todayIso());
    var period = selectedPeriod();

    if (period === "day") {
      return { from: toIso(date), to: toIso(date) };
    }
    if (period === "week") {
      var monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - (date.getDay() + 6) % 7);
      var sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
      return { from: toIso(monday), to: toIso(sunday) };
    }
    var first = new Date(date.getFullYear(), date.getMonth(), 1);
    var last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { from: toIso(first), to: toIso(last) };
  }

  /**
   * Стрелки сдвигают дату на один день, неделю или месяц.
   */
  function shiftDate(step) {
    var date = fromIso($("date").value || todayIso());
    var period = selectedPeriod();

    if (period === "day") {
      date.setDate(date.getDate() + step);
    } else if (period === "week") {
      date.setDate(date.getDate() + 7 * step);
    } else {
      date.setDate(1);
      date.setMonth(date.getMonth() + step);
    }
    $("date").value = toIso(date);
    renderList();
  }

  /**
   * Сегодняшняя дата ГГГГ-ММ-ДД по местному времени.
   */
  function todayIso() {
    return toIso(new Date());
  }

  /**
   * Текущие дата и время строкой ГГГГ-ММ-ДД ЧЧ:ММ.
   */
  function nowText() {
    var now = new Date();
    var hours = String(now.getHours()).padStart(2, "0");
    var minutes = String(now.getMinutes()).padStart(2, "0");
    return toIso(now) + " " + hours + ":" + minutes;
  }

  /**
   * Дата → строка ГГГГ-ММ-ДД.
   */
  function toIso(date) {
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  }

  /**
   * Строка ГГГГ-ММ-ДД → дата.
   */
  function fromIso(iso) {
    var parts = iso.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  document.addEventListener("DOMContentLoaded", start);
})();
