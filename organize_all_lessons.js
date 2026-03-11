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

	let questionText = question.value?.question || "";
	questionText = questionText
		.replace(/<br\/?>/g, "\n")
		.replace(/<img[^>]*>/g, "[Image]")
		.replace(/<[^>]+>/g, "")
		.replace(/\\n/g, "\n")
		.replace(/&nbsp;/g, " ")
		.replace(/&#39;/g, "'");

	output += "Question:\n" + questionText + "\n\n";

	output += "Options:\n";
	if (question.value?.options) {
		Object.entries(question.value.options).forEach(([key, value]) => {
			output += `${key}. ${value}\n`;
		});
	}
	output += "\n\n";

	output +=
		"Correct Answer: " + (question.value?.correct_answer || "") + "\n\n";

	let solution = question.value?.solution || "";
	solution = solution
		.replace(/<br\/?>/g, "\n")
		.replace(/<img[^>]*>/g, "[Image]");
	solution = solution
		.replace(/<[^>]+>/g, "")
		.replace(/\\n/g, "\n")
		.replace(/&nbsp;/g, " ")
		.replace(/&#39;/g, "'");

	output += "Solution:\n" + solution + "\n\n";

	let explanation = question.value?.explanation || "";
	explanation = explanation.replace(/<br\/?>/g, "\n").replace(/<[^>]+>/g, "");

	output += "Explanation:\n" + explanation + "\n\n";
	output += "Sub-Questions:\n";
	if (question.sub_questions && question.sub_questions.length > 0) {
		question.sub_questions.forEach((sq, i) => {
			output += `  ${i + 1}. ${sq}\n`;
		});
	}
	output += "\n";

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
