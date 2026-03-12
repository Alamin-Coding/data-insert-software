const fs = require("fs");
const path = require("path");

const inputDir = "E:/data/data-insert-software";
const outputDir = "E:/data/data-insert-software/Final_Output";

// Helper to normalize question type names
function normalizeQuestionType(typeName) {
	if (!typeName) return "Unknown";
	const typeMap = {
		MCQ: "MCQ",
		CQ: "CQ",
		"সংক্ষিপ্ত প্রশ্ন": "সংক্ষিপ্ত",
		সংক্ষিপ্ত: "সংক্ষিপ্ত",
		"Short Answer": "সংক্ষিপ্ত",
	};
	return typeMap[typeName] || typeName;
}
// Helper to strip HTML tags but preserve text and math equations
function stripHtml(text) {
	if (!text) return "";
	let cleaned = text.toString();

	// 1. Replace <br> and <p> with line breaks for spacing
	cleaned = cleaned.replace(/<br\s*\/?>/gi, "\n");
	cleaned = cleaned.replace(/<\/?p>/gi, "\n");

	// 2. Keep image tags as [Image]
	cleaned = cleaned.replace(/<img[^>]*>/gi, "[Image]");

	// 3. Remove all other HTML tags (like <span>, <div>, etc.)
	// Note: We avoid replacing MathJax \( \) by ensuring we only match <...> structures
	cleaned = cleaned.replace(/<[^>]+>/g, "");

	// 4. Decode HTML entities
	cleaned = cleaned
		.replace(/&nbsp;/g, " ")
		.replace(/&#39;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&");

    // 5. Cleanup extra whitespace/newlines
    cleaned = cleaned.replace(/\n\s*\n/g, "\n").trim();

	return cleaned;
}

// Helper to check if text is just empty placeholders like "ক." or purely whitespace
function isEffectivelyEmpty(text) {
    if (!text) return true;
    const t = text.trim().replace(/^[কখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহড়ঢ়য়ৎংঃাঁিীুূৃেৈোৌ]\.\s*/g, '');
    return t.length === 0;
}

// Helper to format a single question to text
function formatQuestionToText(question, index) {
	const separator = "=".repeat(80);
	const lineSeparator = "-".repeat(80);

	let output = "";
	output += separator + "\n";
	output += `Question #${index + 1} (ID: ${question.id})\n`;
	output += lineSeparator + "\n";

	const qType = normalizeQuestionType(question.question_type?.name);
	const book = question.book?.title || "";
	const years = (question.years || []).map((y) => y.year).join(", ") || "";
	const boards =
		(question.institutions || []).map((i) => i.name).join(", ") || "";
	const tags = (question.tags || []).map((t) => t.full_name).join(", ") || "";

	output += `Type: ${qType} | Book: ${book} | Years: ${years} | Boards: ${boards} | Tags: ${tags}\n`;
	output += lineSeparator + "\n";

	let questionText = stripHtml(question.value?.question);
	output += "Question:\n" + questionText + "\n\n";

	let hasOptions = false;
	let optionsText = "Options:\n";
	if (question.value?.options) {
		Object.entries(question.value.options).forEach(([key, value]) => {
			const cleanedOpt = stripHtml(value);
			if (!isEffectivelyEmpty(cleanedOpt)) {
				optionsText += `${key}. ${cleanedOpt}\n`;
				hasOptions = true;
			}
		});
	}
	if (hasOptions) {
		output += optionsText + "\n\n";
	}

    const cleanedAns = stripHtml(question.value?.correct_answer);
    if (!isEffectivelyEmpty(cleanedAns)) {
	    output += "Correct Answer: " + cleanedAns + "\n\n";
    }

	let solution = stripHtml(question.value?.solution);
    if (!isEffectivelyEmpty(solution)) {
	    output += "Solution:\n" + solution + "\n\n";
    }

	let explanation = stripHtml(question.value?.explanation);
    if (!isEffectivelyEmpty(explanation)) {
	    output += "Explanation:\n" + explanation + "\n\n";
    }
	
	let hasSubQ = false;
	let subQText = "Sub-Questions:\n";
	if (question.sub_questions && question.sub_questions.length > 0) {
		question.sub_questions.forEach((sq, i) => {
			const cleanedSq = stripHtml(sq);
			if (!isEffectivelyEmpty(cleanedSq)) {
				subQText += `  ${i + 1}. ${cleanedSq}\n`;
				hasSubQ = true;
			}
		});
	}
	if (hasSubQ) {
		output += subQText + "\n";
	}

	return output;
}

// Function to process a specific lesson folder
function processLessonFolder(sourcePath, targetPath) {
	const lessonDataFile = path.join(sourcePath, "lesson.txt");
	if (!fs.existsSync(lessonDataFile)) return;

	try {
		const rawData = fs.readFileSync(lessonDataFile, "utf8");
		const jsonData = JSON.parse(rawData);

		const organized = {};
		jsonData.data.forEach((item) => {
			const questionType = normalizeQuestionType(item.question_type?.name);
			if (!organized[questionType]) organized[questionType] = [];
			organized[questionType].push(item);
		});

		Object.keys(organized).forEach((questionType) => {
			const typeFolderPath = path.join(targetPath, questionType);
			if (!fs.existsSync(typeFolderPath))
				fs.mkdirSync(typeFolderPath, { recursive: true });

			let textOutput = "";
			organized[questionType].forEach((q, idx) => {
				textOutput += formatQuestionToText(q, idx);
			});

			fs.writeFileSync(
				path.join(typeFolderPath, "questions.txt"),
				textOutput,
				"utf8",
			);
			console.log(`  ✓ Data Created: ${questionType}/questions.txt`);
		});
	} catch (err) {
		console.error(`  Error in ${lessonDataFile}: ${err.message}`);
	}
}

// Recursive walk function
function walk(currentSourceDir) {
	// Calculate and create the corresponding output directory
	const relativePath = path.relative(inputDir, currentSourceDir);
	const currentTargetDir = path.join(outputDir, relativePath);

	if (!fs.existsSync(currentTargetDir)) {
		fs.mkdirSync(currentTargetDir, { recursive: true });
	}

	const files = fs.readdirSync(currentSourceDir);

	// If lesson.txt exists, process it
	if (files.includes("lesson.txt")) {
		console.log(`Processing: ${relativePath || "Root"}`);
		processLessonFolder(currentSourceDir, currentTargetDir);
	} else {
		if (relativePath) {
			console.log(`Mirroring Empty Folder: ${relativePath}`);
		}
	}

	// Continue walking subdirectories
	files.forEach((file) => {
		const filepath = path.join(currentSourceDir, file);

		// Skip output directory, system folders, and question-type folders
		if (
			file === "Final_Output" ||
			file.endsWith("_Final_Output") ||
			file === "node_modules" ||
			file === ".git" ||
			["MCQ", "CQ", "সংক্ষিপ্ত", "Short Answer"].includes(file)
		) {
			return;
		}

		const stat = fs.statSync(filepath);
		if (stat.isDirectory()) {
			walk(filepath);
		}
	});
}

// Start
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

console.log("--- STARTING OUTPUT GENERATION (WITH EMPTY FOLDERS) ---");
console.log(`Input: ${inputDir}`);
console.log(`Output: ${outputDir}\n`);

walk(inputDir);

console.log("\nSUCCESS! 🚀");
console.log(`Clean output folder: ${outputDir}`);
