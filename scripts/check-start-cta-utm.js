#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT_DIR = process.cwd();
const CANONICAL_START_URL = "https://app.garagebook.nl/start?utm_source=garagebook.nl&utm_medium=website&utm_campaign=organic_cta";
const HTML_FILE_PATTERN = /\.html$/i;
const SKIP_PATH_SEGMENTS = new Set([".git", "temp", "_oud"]);
const SKIP_FILE_SUFFIXES = [".old", ".oud"];
const START_CTA_PATTERN = /href=(["'])(https:\/\/app\.garagebook\.nl\/start(?:\/)?(?:\?[^"'#>]*)?(?:#[^"'>]*)?|https:\/\/app\.garagebook\.nl\/admin\/register(?:\/)?(?:\?[^"'#>]*)?(?:#[^"'>]*)?|\/start(?:\/)?(?:\?[^"'#>]*)?(?:#[^"'>]*)?)\1/gi;

function shouldSkipPath(relativePath) {
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

function main() {
    const failures = [];

    for (const filePath of collectHtmlFiles(ROOT_DIR)) {
        const relativePath = path.relative(ROOT_DIR, filePath);
        const content = fs.readFileSync(filePath, "utf8");
        let match;

        while ((match = START_CTA_PATTERN.exec(content)) !== null) {
            if (match[2] === CANONICAL_START_URL) {
                continue;
            }

            failures.push({
                file: relativePath,
                line: getLineNumber(content, match.index),
                href: match[2],
            });
        }
    }

    if (failures.length === 0) {
        console.log("All start CTA hrefs use the canonical UTM URL.");
        return;
    }

    console.error("Found non-canonical start CTA hrefs:");
    for (const failure of failures) {
        console.error(`- ${failure.file}:${failure.line} -> ${failure.href}`);
    }

    process.exit(1);
}

main();
