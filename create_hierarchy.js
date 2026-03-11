const fs = require("fs");
const path = require("path");

// Configuration
// const JSON_FILE = "Hierarchy_হিন্দুধর্ম_শিক্ষা.json";
const JSON_FILE = ["Hierarchy_হিসাববিজ্ঞান.json"];
const BASE_DIR = "."; // e:/data/SSC is the current working directory in the terminal usually

function sanitizeFolderName(name) {
	if (!name) return "Untitled";
	// Remove characters not allowed in Windows folder names
	// Also trim leading/trailing spaces which can cause issues
	return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}

// Support a single filename or an array of filenames in `JSON_FILE`.
function processDataFile(jsonFile) {
	try {
		const data = JSON.parse(fs.readFileSync(jsonFile, "utf8"));
		const pathsList = data.paths || [];

		console.log(`Processing hierarchy from ${jsonFile}...`);

		const hierarchy = data.hierarchy || [];

		if (hierarchy.length === 0 && pathsList.length > 0) {
			// Fallback to paths if hierarchy is empty but paths exist (backward compatibility)
			pathsList.forEach((fullPath) => {
				const parts = fullPath.split(" / ").map(sanitizeFolderName);
				if (parts.length < 3) return;
				const lessonDirPath = path.join(BASE_DIR, parts[0], parts[1], parts[2]);
				if (!fs.existsSync(lessonDirPath)) {
					fs.mkdirSync(lessonDirPath, { recursive: true });
				}
				const lessonFilePath = path.join(lessonDirPath, "lesson.txt");
				if (!fs.existsSync(lessonFilePath))
					fs.writeFileSync(lessonFilePath, "");
			});
		} else {
			// New logic: Traverse hierarchy
			hierarchy.forEach((subject) => {
				const subjectName = sanitizeFolderName(subject.title);
				const subjectPath = path.join(BASE_DIR, subjectName);

				if (!fs.existsSync(subjectPath))
					fs.mkdirSync(subjectPath, { recursive: true });

				if (subject.chapters && subject.chapters.length > 0) {
					subject.chapters.forEach((chapter) => {
						const chapterName = sanitizeFolderName(chapter.title);
						const chapterPath = path.join(subjectPath, chapterName);

						if (!fs.existsSync(chapterPath)) {
							fs.mkdirSync(chapterPath, { recursive: true });
							console.log(`Created: ${chapterPath}`);
						}

						// Create empty lesson.txt in Chapter folder (ensure it exists even if folder already did)
						const chapterLessonFile = path.join(chapterPath, "lesson.txt");
						if (!fs.existsSync(chapterLessonFile)) {
							fs.writeFileSync(chapterLessonFile, "");
						}

						if (chapter.lessons && chapter.lessons.length > 0) {
							// Create a 'lessons' folder inside the chapter
							const lessonsContainerPath = path.join(chapterPath, "lessons");
							if (!fs.existsSync(lessonsContainerPath)) {
								fs.mkdirSync(lessonsContainerPath, { recursive: true });
							}

							chapter.lessons.forEach((lesson) => {
								const lessonName = sanitizeFolderName(lesson.title);
								// Create individual lesson folder inside 'lessons' folder
								const lessonPath = path.join(lessonsContainerPath, lessonName);

								if (!fs.existsSync(lessonPath)) {
									fs.mkdirSync(lessonPath, { recursive: true });
								}
								const lessonFilePath = path.join(lessonPath, "lesson.txt");
								if (!fs.existsSync(lessonFilePath)) {
									fs.writeFileSync(lessonFilePath, "");
								}
							});
						}
					});
				}
			});
		}
	} catch (err) {
		console.error(`Error processing ${jsonFile}:`, err);
	}
}

try {
	const files = Array.isArray(JSON_FILE) ? JSON_FILE : [JSON_FILE];
	files.forEach((f) => processDataFile(f));

	console.log("--- Success: Hierarchy and lesson.txt files created! ---");
} catch (err) {
	console.error("Error creating hierarchy:", err);
}
