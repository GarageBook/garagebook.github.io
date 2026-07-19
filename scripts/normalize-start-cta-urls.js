#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT_DIR = process.cwd();
const REGISTRATION_ENTRYPOINT = "https://app.garagebook.nl/admin/register";
const HTML_FILE_PATTERN = /\.html$/i;
const SKIP_PATH_SEGMENTS = new Set([".git", "temp", "_oud"]);
const SKIP_FILE_SUFFIXES = [".old", ".oud"];
const CTA_HREF_PATTERN = /href=(["'])(https:\/\/app\.garagebook\.nl\/start)(\/?)([?#][^"'>]*)?\1/gi;

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

function normalizeFile(filePath) {
    const originalContent = fs.readFileSync(filePath, "utf8");
    const normalizedContent = originalContent.replace(
        CTA_HREF_PATTERN,
        (_match, quote, _origin, _slash, suffix = "") => "href=" + quote + REGISTRATION_ENTRYPOINT + suffix + quote,
    );

    if (normalizedContent === originalContent) {
        return false;
    }

    fs.writeFileSync(filePath, normalizedContent);
    return true;
}

function main() {
    const changedFiles = [];

    for (const filePath of collectHtmlFiles(ROOT_DIR)) {
        if (normalizeFile(filePath)) {
            changedFiles.push(path.relative(ROOT_DIR, filePath));
        }
    }

    if (changedFiles.length === 0) {
        console.log("No broken start CTA hrefs needed normalization.");
        return;
    }

    console.log("Normalized broken start CTA hrefs in " + changedFiles.length + " files:");
    for (const file of changedFiles) {
        console.log("- " + file);
    }
}

main();
