/* =========================================================
   Tabriz Places
   مکان‌ها از data/places.csv خوانده می‌شوند و کارت‌ها پویا
   ساخته می‌شوند. برای افزودن مکان جدید فقط CSV را ویرایش کنید.
   ========================================================= */

const CSV_URL = "data/places.csv";
const DEFAULT_ICON = "☕";
const SCORE_DURATION = 1200; // میلی‌ثانیه

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/* وضعیت صفحه */
const state = {
    places: [],
    sort: "score-desc"
};


/* ---------- ابزارها ---------- */

/**
 * تبدیل ارقام فارسی/عربی و ویرگول اعشاری فارسی به شکل قابل خواندن برای Number.
 */
function normalizeNumber(value) {
    return String(value)
        .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
        .replace(/[٫،]/g, ".")
        .trim();
}


/**
 * پارسر ساده و کامل CSV: پشتیبانی از فیلدهای داخل "..."،
 * ویرگول داخل متن، کوتیشن دوتایی و خطوط CRLF.
 */
function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];

        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i += 1;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }

            continue;
        }

        if (char === '"') {
            inQuotes = true;
        } else if (char === ",") {
            row.push(field);
            field = "";
        } else if (char === "\n") {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else if (char !== "\r") {
            field += char;
        }
    }

    if (field !== "" || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    if (rows.length === 0) {
        return [];
    }

    const header = rows.shift().map((cell) => cell.trim().toLowerCase());

    return rows
        .filter((cells) => cells.some((cell) => cell.trim() !== ""))
        .map((cells) => {
            const place = {};

            header.forEach((key, index) => {
                place[key] = (cells[index] || "").trim();
            });

            return place;
        });
}


/**
 * آماده‌سازی ردیف‌های CSV: اعتبارسنجی و تبدیل امتیاز به عدد.
 */
function normalizePlaces(rows) {
    return rows
        .map((row) => ({
            name: (row.name || "").trim(),
            icon: (row.icon || "").trim() || DEFAULT_ICON,
            city: (row.city || "").trim(),
            description: (row.description || "").trim(),
            score: Number.parseFloat(normalizeNumber(row.score || ""))
        }))
        .filter((place) => place.name !== "" && Number.isFinite(place.score));
}


/**
 * مرتب‌سازی بدون تغییر آرایهٔ اصلی. در امتیازهای مساوی،
 * ترتیب اصلی CSV حفظ می‌شود.
 */
function sortPlaces(places, mode) {
    const indexed = places.map((place, index) => ({ place, index }));

    if (mode === "score-desc") {
        indexed.sort((a, b) => (b.place.score - a.place.score) || (a.index - b.index));
    } else if (mode === "score-asc") {
        indexed.sort((a, b) => (a.place.score - b.place.score) || (a.index - b.index));
    }

    return indexed.map((item) => item.place);
}


/* ---------- ساخت کارت ---------- */

function createCard(place, index) {
    const card = document.createElement("article");
    card.className = "card";
    card.style.setProperty("--delay", `${Math.min(index, 6) * 60}ms`);

    const clampedScore = Math.min(Math.max(place.score, 0), 10);
    card.style.setProperty("--score", String(clampedScore / 10));

    const title = document.createElement("h2");

    const icon = document.createElement("span");
    icon.className = "card-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = place.icon;

    title.append(icon, ` ${place.name}`);

    const scoreElement = document.createElement("p");
    scoreElement.className = "score";
    scoreElement.setAttribute("aria-label", `امتیاز ${place.score.toFixed(1)} از ۱۰`);
    scoreElement.dataset.target = String(place.score);

    const scoreValue = document.createElement("span");
    scoreValue.className = "score-value";
    scoreValue.setAttribute("aria-hidden", "true");
    scoreValue.textContent = place.score.toFixed(1);

    const scoreMax = document.createElement("span");
    scoreMax.className = "score-max";
    scoreMax.setAttribute("aria-hidden", "true");
    scoreMax.textContent = "/ ۱۰";

    scoreElement.append(scoreValue, scoreMax);
    card.append(title, scoreElement);

    if (place.description) {
        const description = document.createElement("p");
        description.className = "description";
        description.textContent = place.description;
        card.append(description);
    }

    if (place.city) {
        const city = document.createElement("p");
        city.className = "city";
        city.textContent = place.city;
        card.append(city);
    }

    const meter = document.createElement("div");
    meter.className = "meter";
    meter.setAttribute("aria-hidden", "true");

    const meterFill = document.createElement("span");
    meterFill.className = "meter-fill";
    meter.append(meterFill);

    card.append(meter);

    return card;
}


/* ---------- انیمیشن امتیاز ---------- */

function animateScore(scoreElement) {
    if (REDUCED_MOTION) {
        return;
    }

    const target = Number.parseFloat(scoreElement.dataset.target);
    const valueElement = scoreElement.querySelector(".score-value");

    if (!valueElement || !Number.isFinite(target)) {
        return;
    }

    const startedAt = performance.now();

    function tick(now) {
        const progress = Math.min((now - startedAt) / SCORE_DURATION, 1);
        const eased = 1 - (1 - progress) ** 3;

        valueElement.textContent = (target * eased).toFixed(1);

        if (progress < 1) {
            requestAnimationFrame(tick);
        } else {
            valueElement.textContent = target.toFixed(1);
        }
    }

    requestAnimationFrame(tick);
}


/* ---------- نمایش با اسکرول ---------- */

function revealCards(cards) {
    function show(card) {
        card.classList.add("show");

        const scoreElement = card.querySelector(".score");

        if (scoreElement) {
            animateScore(scoreElement);
        }
    }

    if (!("IntersectionObserver" in window)) {
        cards.forEach(show);
        return;
    }

    const observer = new IntersectionObserver(
        (entries, instance) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                show(entry.target);
                instance.unobserve(entry.target);
            });
        },
        {
            threshold: 0.15,
            rootMargin: "0px 0px -60px 0px"
        }
    );

    cards.forEach((card) => observer.observe(card));
}


/* ---------- رندر فهرست ---------- */

/**
 * کارت‌ها را بر اساس حالت مرتب‌سازی فعلی می‌سازد.
 * scrollReveal برای بارگذاری اول است؛ در مرتب‌سازی مجدد،
 * کارت‌ها بی‌درنگ (با تاخیر پله‌ای) نمایش داده می‌شوند.
 */
function renderPlaces(list, options = {}) {
    const sortedPlaces = sortPlaces(state.places, state.sort);
    const cards = sortedPlaces.map((place, index) => createCard(place, index));

    list.replaceChildren(...cards);

    const countElement = document.getElementById("count");

    if (countElement) {
        countElement.textContent = `${cards.length.toLocaleString("fa-IR")} مکان`;
    }

    if (options.scrollReveal) {
        revealCards(cards);
        return;
    }

    requestAnimationFrame(() => {
        cards.forEach((card) => {
            card.classList.add("show");

            const scoreElement = card.querySelector(".score");

            if (scoreElement) {
                animateScore(scoreElement);
            }
        });
    });
}


/* ---------- خطا ---------- */

function showError(statusElement, error) {
    statusElement.hidden = false;
    statusElement.classList.add("error");
    statusElement.replaceChildren();

    const title = document.createElement("strong");
    title.textContent = "بارگذاری مکان‌ها ناموفق بود.";

    const detail = document.createElement("span");
    detail.textContent = window.location.protocol === "file:"
        ? "مرورگرها اجازهٔ خواندن data/places.csv را با آدرس file:// نمی‌دهند. پروژه را با یک سرور محلی باز کنید (در ویندوز فایل tools/start.bat را اجرا کنید)."
        : `جزئیات: ${error.message}`;

    statusElement.append(title, detail);
}


/* ---------- منوی کشویی مرتب‌سازی ---------- */

function setupSortDropdown(button, menu, valueLabel, onChange) {
    const options = [...menu.querySelectorAll('[role="option"]')];

    function selectedOption() {
        return options.find((option) => option.dataset.value === state.sort) || options[0];
    }

    function syncSelection() {
        const selected = selectedOption();

        options.forEach((option) => {
            option.setAttribute("aria-selected", String(option === selected));
        });

        valueLabel.textContent = selected.querySelector("span").textContent;
    }

    function openMenu() {
        menu.hidden = false;
        button.setAttribute("aria-expanded", "true");
        selectedOption().focus();
    }

    function closeMenu(returnFocus = false) {
        if (menu.hidden) {
            return;
        }

        menu.hidden = true;
        button.setAttribute("aria-expanded", "false");

        if (returnFocus) {
            button.focus();
        }
    }

    function choose(option) {
        if (!option) {
            return;
        }

        state.sort = option.dataset.value;
        syncSelection();
        closeMenu(true);
        onChange();
    }

    button.addEventListener("click", () => {
        if (menu.hidden) {
            openMenu();
        } else {
            closeMenu(true);
        }
    });

    button.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu();
        }
    });

    options.forEach((option) => {
        option.addEventListener("click", () => choose(option));
    });

    menu.addEventListener("keydown", (event) => {
        const index = Math.max(options.indexOf(document.activeElement), 0);

        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                options[(index + 1) % options.length].focus();
                break;
            case "ArrowUp":
                event.preventDefault();
                options[(index - 1 + options.length) % options.length].focus();
                break;
            case "Home":
                event.preventDefault();
                options[0].focus();
                break;
            case "End":
                event.preventDefault();
                options[options.length - 1].focus();
                break;
            case "Enter":
            case " ":
                event.preventDefault();
                choose(document.activeElement);
                break;
            case "Escape":
                event.preventDefault();
                closeMenu(true);
                break;
            case "Tab":
                closeMenu();
                break;
            default:
                break;
        }
    });

    document.addEventListener("pointerdown", (event) => {
        if (!menu.hidden && !event.target.closest("#dropdown")) {
            closeMenu();
        }
    });

    syncSelection();
}


/* ---------- راه‌اندازی ---------- */

async function init() {
    const list = document.getElementById("places");
    const statusElement = document.getElementById("status");
    const toolbar = document.getElementById("toolbar");
    const sortButton = document.getElementById("sortButton");
    const sortMenu = document.getElementById("sortMenu");
    const sortValue = document.getElementById("sortValue");

    if (!list || !statusElement || !toolbar || !sortButton || !sortMenu || !sortValue) {
        return;
    }

    setupSortDropdown(sortButton, sortMenu, sortValue, () => renderPlaces(list));


    try {
        // no-store تا بعد از ویرایش CSV روی GitHub Pages نسخهٔ قدیمی از کش نیاید.
        const response = await fetch(CSV_URL, { cache: "no-store" });

        if (!response.ok) {
            throw new Error(`دریافت ${CSV_URL} با خطای ${response.status} شکست خورد.`);
        }

        const text = (await response.text()).replace(/^\uFEFF/, "");
        state.places = normalizePlaces(parseCSV(text));

        if (state.places.length === 0) {
            throw new Error("هیچ مکان معتبری در فایل CSV پیدا نشد.");
        }

        statusElement.hidden = true;
        toolbar.hidden = false;

        renderPlaces(list, { scrollReveal: true });
    } catch (error) {
        toolbar.hidden = true;
        showError(statusElement, error);
    }
}


if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
