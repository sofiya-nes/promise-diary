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
    $("show-closed").addEventListener("change", renderList);

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
   * Перерисовывает список дел.
   */
  function renderList() {
    var today = todayIso();
    $("case-list").innerHTML = "";
    $("period-title").textContent = "Все дела";

    var shown = 0;
    cases.forEach(function (item) {
      if (item.status !== "open" && !$("show-closed").checked) {
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

    $("comments").hidden = true;
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
    selectedId = item.id;
    renderList();
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
   * Сегодняшняя дата ГГГГ-ММ-ДД по местному времени.
   */
  function todayIso() {
    var now = new Date();
    var month = String(now.getMonth() + 1).padStart(2, "0");
    var day = String(now.getDate()).padStart(2, "0");
    return now.getFullYear() + "-" + month + "-" + day;
  }

  document.addEventListener("DOMContentLoaded", start);
})();
