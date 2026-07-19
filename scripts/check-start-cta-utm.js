#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT_DIR = process.cwd();
const REGISTRATION_ENTRYPOINT = "https://app.garagebook.nl/admin/register";
const LOGIN_ENTRYPOINT = "https://app.garagebook.nl/admin/login";
const HTML_FILE_PATTERN = /\.html$/i;
const SKIP_PATH_SEGMENTS = new Set([".git", "temp", "_oud", "node_modules"]);
const SKIP_FILE_SUFFIXES = [".old", ".oud"];
const IGNORED_HTML_FILES = new Set([
    "404.html",
    "__layout_check__.html",
    "insights/_template/index.html",
    "motor-onderhoud-bijhouden/alternatief.html",
]);

function shouldSkipPath(relativePath) {
    if (IGNORED_HTML_FILES.has(relativePath)) {
        return true;
    }

    const pathParts = relativePath.split(path.sep);

    if (pathParts.some((part) => SKIP_PATH_SEGMENTS.has(part))) {
        return true;
    }

    return SKIP_FILE_SUFFIXES.some((suffix) => relativePath.endsWith(suffix));
}

function collectHtmlFiles(directory, files = []) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolutePath = path.join(directory, entry.name);
        const relativePath = path.relative(ROOT_DIR, absolutePath);

        if (shouldSkipPath(relativePath)) {
            continue;
        }

        if (entry.isDirectory()) {
            collectHtmlFiles(absolutePath, files);
            continue;
        }

        if (HTML_FILE_PATTERN.test(entry.name)) {
            files.push(absolutePath);
        }
    }

    return files;
}

function getLineNumber(content, index) {
    return content.slice(0, index).split("\n").length;
}

function parseHref(href) {
    try {
        return new URL(href, "https://garagebook.nl");
    } catch {
        return null;
    }
}

function main() {
    const failures = [];
    const appLinks = new Set();
    const registrationLinks = new Set();
    const loginLinks = new Set();
    let hrefCount = 0;
    let appHrefCount = 0;
    let registrationHrefCount = 0;
    let loginHrefCount = 0;
    let utmRegistrationHrefCount = 0;

    const htmlFiles = collectHtmlFiles(ROOT_DIR);

    for (const filePath of htmlFiles) {
        const relativePath = path.relative(ROOT_DIR, filePath);
        const content = fs.readFileSync(filePath, "utf8");

        for (const match of content.matchAll(/href=(["'])([^"']+)\1/gi)) {
            hrefCount++;
            const href = match[2].trim();
            const parsed = parseHref(href);

            if (href === "/start" || href.startsWith("/start?") || href.startsWith("/start#") || href.startsWith("/start/")) {
                failures.push(relativePath + ":" + getLineNumber(content, match.index) + " uses forbidden public /start href: " + href);
            }

            if (!parsed) {
                failures.push(relativePath + ":" + getLineNumber(content, match.index) + " has invalid href: " + href);
                continue;
            }

            if (parsed.hostname === "garagebook.nl" && parsed.pathname === "/start") {
                failures.push(relativePath + ":" + getLineNumber(content, match.index) + " points to forbidden garagebook.nl/start: " + href);
            }

            if (parsed.hostname !== "app.garagebook.nl") {
                continue;
            }

            appHrefCount++;
            appLinks.add(parsed.href);

            if (parsed.pathname === "/start" || parsed.pathname === "/start/") {
                failures.push(relativePath + ":" + getLineNumber(content, match.index) + " points to broken app start route: " + href);
            }

            if (parsed.pathname === "/admin/register" || parsed.pathname === "/admin/register/") {
                registrationHrefCount++;
                registrationLinks.add(parsed.href);

                if (parsed.pathname !== "/admin/register") {
                    failures.push(relativePath + ":" + getLineNumber(content, match.index) + " registration href must use /admin/register without trailing slash: " + href);
                }

                if (parsed.searchParams.has("utm_source") || parsed.searchParams.has("utm_medium") || parsed.searchParams.has("utm_campaign")) {
                    utmRegistrationHrefCount++;
                    for (const required of ["utm_source", "utm_medium", "utm_campaign"]) {
                        if (!parsed.searchParams.has(required)) {
                            failures.push(relativePath + ":" + getLineNumber(content, match.index) + " registration UTM href misses " + required + ": " + href);
                        }
                    }
                }
            }

            if (parsed.pathname === "/admin/login" || parsed.pathname === "/admin/login/") {
                loginHrefCount++;
                loginLinks.add(parsed.href);

                if (parsed.href !== LOGIN_ENTRYPOINT) {
                    failures.push(relativePath + ":" + getLineNumber(content, match.index) + " login href must use " + LOGIN_ENTRYPOINT + ": " + href);
                }
            }
        }
    }

    if (registrationHrefCount === 0) {
        failures.push("No registration CTA hrefs found in active HTML.");
    }

    if (loginHrefCount === 0) {
        failures.push("No login hrefs found in active HTML.");
    }

    if (failures.length === 0) {
        console.log("CTA policy check passed.");
        console.log("Checked active HTML pages: " + htmlFiles.length);
        console.log("Checked hrefs: " + hrefCount);
        console.log("Checked app.garagebook.nl hrefs: " + appHrefCount);
        console.log("Registration CTA hrefs: " + registrationHrefCount);
        console.log("Registration CTA hrefs with UTM: " + utmRegistrationHrefCount);
        console.log("Login hrefs: " + loginHrefCount);
        console.log("Unique app.garagebook.nl targets: " + appLinks.size);
        console.log("Unique registration targets: " + registrationLinks.size);
        console.log("Unique login targets: " + loginLinks.size);
        return;
    }

    console.error("CTA policy check failed:");
    for (const failure of failures) {
        console.error("- " + failure);
    }

    process.exit(1);
}

main();
