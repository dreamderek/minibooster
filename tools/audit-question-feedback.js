"use strict";

const fs = require("fs");
const path = require("path");

const questionDirectory = path.join(__dirname, "..", "data", "questions");
const requiredIds = ["A", "B", "C", "D", "E"];
const gradingKeys = requiredIds.flatMap((_, index) => {
    const keys = [];
    for (let mask = 1; mask < 32; mask += 1) {
        if (mask & (1 << index)) keys.push(null);
    }
    return keys;
});
const expectedGradingKeys = Array.from({ length: 31 }, (_, maskIndex) => {
    const mask = maskIndex + 1;
    return requiredIds.filter((_, index) => mask & (1 << index)).join("");
}).sort((left, right) => left.length - right.length || left.localeCompare(right));

let hasError = false;

for (const filename of fs.readdirSync(questionDirectory).filter((name) => /^q\d{3}\.json$/.test(name)).sort()) {
    const filePath = path.join(questionDirectory, filename);
    let question;
    try {
        question = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
        console.error(`${filename}: invalid JSON (${error.message})`);
        hasError = true;
        continue;
    }

    const errors = [];
    if (!Array.isArray(question.options) || question.options.length !== 5) {
        errors.push("must contain exactly five options");
    } else {
        const ids = question.options.map((option) => option.id);
        if (ids.join("") !== requiredIds.join("")) errors.push("option ids must be A through E in order");
        for (const option of question.options) {
            if (typeof option.text !== "string" || typeof option.note !== "string" || typeof option.correct !== "boolean") {
                errors.push(`option ${option.id} must have string text/note and boolean correct`);
            }
            const controlMatch = (option.text || "").match(/[\u0000-\u0009\u000B-\u001F]/) || (option.note || "").match(/[\u0000-\u0009\u000B-\u001F]/);
            if (controlMatch) {
                errors.push(`option ${option.id} contains U+${controlMatch[0].charCodeAt(0).toString(16).padStart(4, "0")}; check JSON-escaped LaTex backslashes`);
            }
        }
    }

    const grading = question.grading;
    if (!grading || Array.isArray(grading) || typeof grading !== "object") {
        errors.push("grading must be an object with 31 selection keys");
    } else {
        const keys = Object.keys(grading).sort((left, right) => left.length - right.length || left.localeCompare(right));
        const missing = expectedGradingKeys.filter((key) => !keys.includes(key));
        const extra = keys.filter((key) => !expectedGradingKeys.includes(key));
        if (missing.length) errors.push(`missing grading keys: ${missing.join(", ")}`);
        if (extra.length) errors.push(`unexpected grading keys: ${extra.join(", ")}`);
        for (const key of expectedGradingKeys) {
            if (typeof grading[key] !== "string" || !grading[key].trim()) errors.push(`grading.${key} must be a non-empty string`);
        }
    }

    if (errors.length) {
        hasError = true;
        console.error(`${filename}: ${errors.join("; ")}`);
    } else {
        console.log(`${filename}: OK`);
    }
}

if (hasError) process.exitCode = 1;
