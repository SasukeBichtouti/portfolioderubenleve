/* ==========================================================
   site.js — navbar + footer identiques sur toutes les pages.
   Pour ajouter une page au menu : ajouter une ligne dans LINKS.
   Script classique (pas de module) : fonctionne aussi en
   double-cliquant sur index.html (protocole file://).
   ========================================================== */
(function () {
  "use strict";

  var LINKS = [
    { href: "index.html", page: "index", label: "Accueil" },
    { href: "e5.html", page: "e5", label: "Épreuve E5" },
    { href: "e6.html", page: "e6", label: "Épreuve E6" },
    { href: "veille.html", page: "veille", label: "Veille technologique" },
    { href: "cv.html", page: "cv", label: "CV" },
    { href: "contact.html", page: "contact", label: "Contact" }
  ];

  var ICON_MARK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M19 5h-8a3.5 3.5 0 0 0 0 7h2a3.5 3.5 0 0 1 0 7H5"/></svg>';

  var ICON_GAME =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="2" y="6" width="20" height="12" rx="4"/><path d="M7 10v4M5 12h4"/><circle cx="16" cy="11" r="1"/><circle cx="18" cy="13" r="1"/></svg>';

  var ICON_BURGER =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
    '<path d="M4 7h16M4 12h16M4 17h16"/></svg>';

  /** Nom de la page courante, sans extension ("index" par défaut). */
  function currentPage() {
    var file = window.location.pathname.split("/").pop() || "index";
    return file.replace(/\.html?$/i, "") || "index";
  }

  function buildHeader() {
    var host = document.getElementById("site-header");
    if (!host) return;

    var page = currentPage();
    var items = LINKS.map(function (l) {
      var current = l.page === page ? ' aria-current="page"' : "";
      return '<li><a href="' + l.href + '"' + current + ">" + l.label + "</a></li>";
    }).join("");

    host.className = "site-header";
    host.innerHTML =
      '<nav class="nav" aria-label="Navigation principale">' +
      '<a class="brand" href="index.html" aria-label="Ruben.dev — accueil">' +
      '<span class="brand-mark">' + ICON_MARK + "</span>" +
      "<span>Ruben<small>.dev</small></span></a>" +
      '<ul class="nav-links" id="nav-links">' + items + "</ul>" +
      '<button type="button" class="nav-game" data-open-snake aria-label="Jouer au Snake">' +
      ICON_GAME + "<span>Snake</span></button>" +
      '<button type="button" class="nav-burger" aria-expanded="false" aria-controls="nav-links" aria-label="Ouvrir le menu">' +
      ICON_BURGER + "</button>" +
      "</nav>";

    var nav = host.querySelector(".nav");
    var burger = host.querySelector(".nav-burger");

    function setOpen(open) {
      if (open) nav.setAttribute("data-open", "");
      else nav.removeAttribute("data-open");
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    }

    burger.addEventListener("click", function () {
      setOpen(!nav.hasAttribute("data-open"));
    });

    // Ferme le menu mobile : clic sur un lien, touche Échap, clic en dehors.
    nav.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest(".nav-links a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
    document.addEventListener("click", function (e) {
      if (!nav.contains(e.target)) setOpen(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) setOpen(false);
    });
  }

  function buildFooter() {
    var host = document.getElementById("site-footer");
    if (!host) return;
    var tagline = host.getAttribute("data-tagline") || "";
    host.className = "site-footer";
    host.innerHTML =
      '<div class="wrap footer-inner" style="max-width:var(--wrap)">' +
      "<span>© 2026 Ruben — Portfolio</span>" +
      "<span>" + tagline + "</span></div>";
  }

  function init() {
    buildHeader();
    buildFooter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
