"use strict";

const fs = require("fs");
const path = require("path");
const questionDirectory = path.join(__dirname, "..", "data", "questions");
const optionIds = ["A", "B", "C", "D", "E"];

function selectionKeys() {
    return Array.from({ length: 31 }, (_, index) => {
        const mask = index + 1;
        return optionIds.filter((_, optionIndex) => mask & (1 << optionIndex)).join("");
    });
}

function optionList(options) {
    return options.map((option) => option.id).join("、");
}

function knowledgeFocus(question) {
    const meta = Array.isArray(question.meta)
        ? question.meta
        : String(question.meta || "").split(/[、,，]/).map((item) => item.trim()).filter(Boolean);
    const quoted = meta.map((item) => `「${item}」`);
    if (quoted.length === 0) return "本題相關概念";
    if (quoted.length === 1) return quoted[0];
    return quoted.slice(0, -1).join("、") + "與" + quoted.at(-1);
}

function feedbackFor(question, selection) {
    const selected = new Set(selection);
    const selectedOptions = question.options.filter((option) => selected.has(option.id));
    const unselectedOptions = question.options.filter((option) => !selected.has(option.id));
    const selectedCorrect = selectedOptions.filter((option) => option.correct);
    const avoidedIncorrect = unselectedOptions.filter((option) => !option.correct);
    const selectedIncorrect = selectedOptions.filter((option) => !option.correct);
    const missedCorrect = unselectedOptions.filter((option) => option.correct);
    const focus = knowledgeFocus(question);
    const sections = [`你這次選了 ${optionList(selectedOptions)}，並未選 ${optionList(unselectedOptions)}。`];
    const positive = [
        selectedCorrect.length ? `選了 ${optionList(selectedCorrect)}` : "",
        avoidedIncorrect.length ? `避開 ${optionList(avoidedIncorrect)}` : "",
    ].filter(Boolean).join("，");
    const needsClarification = [
        selectedIncorrect.length ? `選了 ${optionList(selectedIncorrect)}` : "",
        missedCorrect.length ? `未選 ${optionList(missedCorrect)}` : "",
    ].filter(Boolean).join("，");

    if (positive) sections.push(`${positive}，這可能表示你有注意到${focus}之間的關係。`);
    if (needsClarification) sections.push(`至於${needsClarification}，可能反映你對${focus}中的條件判讀仍有些混淆。`);
    return sections.join("<br><br>");
}

function updatedQuestion(question) {
    const keys = selectionKeys();
    return { ...question, grading: Object.fromEntries(keys.map((selection) => [selection, feedbackFor(question, selection)])) };
}

function patchFor(filename, before, after) {
    const oldLines = before.split("\n");
    const newLines = after.split("\n");
    return [
        `*** Update File: data/questions/${filename}`,
        "@@",
        ` ${oldLines[0]}`,
        ...oldLines.slice(1, -1).map((line) => `-${line}`),
        ...newLines.slice(1, -1).map((line) => `+${line}`),
        ` ${oldLines.at(-1)}`,
    ].join("\n");
}

const requestedFiles = new Set(process.argv.slice(2));
const filenames = fs.readdirSync(questionDirectory)
    .filter((filename) => /^q\d{3}\.json$/.test(filename))
    .filter((filename) => requestedFiles.size === 0 || requestedFiles.has(filename))
    .sort();

if (requestedFiles.size && filenames.length !== requestedFiles.size) {
    const missing = [...requestedFiles].filter((filename) => !filenames.includes(filename));
    throw new Error("Question files not found: " + missing.join(", "));
}

const patches = filenames.map((filename) => {
    const filePath = path.join(questionDirectory, filename);
    const before = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n").trimEnd();
    const after = `${JSON.stringify(updatedQuestion(JSON.parse(before)), null, 2)}\n`.replace(/\r\n/g, "\n").trimEnd();
    return patchFor(filename, before, after);
});
process.stdout.write(`*** Begin Patch\n${patches.join("\n")}\n*** End Patch\n`);
