const fs = require("fs");
const path = require("path");

function sanitize(name) {
	if (!name) return "Unknown";
	return name
		.toString()
		.replace(/[\\/:*?"<>|]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

async function organizeData() {
	const questionsFile = process.argv[2];
	const metadataFile = process.argv[3] || questionsFile;

	if (!questionsFile) {
		console.log(
			"Usage: node organize_subject_data.js <questions_file> [metadata_file]",
		);
		return;
	}

	console.log(`Reading questions from: ${questionsFile}`);
	let qRaw, mRaw;
	try {
		qRaw = JSON.parse(fs.readFileSync(questionsFile, "utf8"));
		mRaw =
			metadataFile === questionsFile ? qRaw : (
				JSON.parse(fs.readFileSync(metadataFile, "utf8"))
			);
	} catch (e) {
		console.error(`Error reading files: ${e.message}`);
		return;
	}

	const qProps = qRaw.props || qRaw;
	const mProps = mRaw.props || mRaw;

	const questions =
		(Array.isArray(qProps) ? qProps : null) ||
		(qProps.questions && (qProps.questions.data || qProps.questions)) ||
		(qProps.questionPaper && qProps.questionPaper.questions) ||
		[];
	const chapters = mProps.chapters || [];
	const lessons = mProps.lessons || [];
	const subjects = mProps.subjects || [];

	console.log(
		`Loaded ${questions.length} questions and metadata for ${chapters.length} chapters, ${lessons.length} lessons.`,
	);

	const chapterMap = new Map();
	chapters.forEach((c) => chapterMap.set(String(c.id), c));

	const lessonMap = new Map();
	lessons.forEach((l) => lessonMap.set(String(l.id), l));

	const groupedQuestions = {};
	questions.forEach((q) => {
		const lid = String(q.content_chunk_id);
		if (!groupedQuestions[lid]) groupedQuestions[lid] = [];
		groupedQuestions[lid].push(q);
	});

	let subjectName = "Subject";
	if (subjects.length > 0) {
		const mainSubject =
			subjects.find((s) =>
				chapters.some((c) => String(c.chunkable_id) === String(s.id)),
			) || subjects[0];
		subjectName = mainSubject.title;
	} else if (
		questions.length > 0 &&
		questions[0].book &&
		questions[0].book.title
	) {
		subjectName = questions[0].book.title;
	}
	const safeSubjectName = sanitize(subjectName);

	let locationsUpdated = 0;
	let totalQuestionsSaved = 0;
	const unmatchedIds = new Set();
	const processedQuestionIds = new Set();

	// 1. Process Lessons
	lessons.forEach((lesson) => {
		const chapter = chapterMap.get(String(lesson.chunkable_id));
		const safeChapterName = sanitize(chapter ? chapter.heading : "Other");
		const safeLessonName = sanitize(lesson.heading);

		const targetDir = path.join(
			".",
			safeSubjectName,
			safeChapterName,
			safeLessonName,
		);
		const lessonQuestions = groupedQuestions[String(lesson.id)] || [];

		if (lessonQuestions.length > 0) {
			saveLesson(targetDir, lessonQuestions);
			processedQuestionIds.add(String(lesson.id));
			totalQuestionsSaved += lessonQuestions.length;
			locationsUpdated++;
			console.log(
				`  Mapped ${lessonQuestions.length} questions to ${safeLessonName}`,
			);
		}
	});

	// 2. Process Chapters (fallback)
	chapters.forEach((chapter) => {
		const chapterId = String(chapter.id);
		const chapterQuestions = groupedQuestions[chapterId] || [];
		if (chapterQuestions.length > 0 && !processedQuestionIds.has(chapterId)) {
			const safeChapterName = sanitize(chapter.heading);
			const targetDir = path.join(
				".",
				safeSubjectName,
				safeChapterName,
				"General",
			);

			saveLesson(targetDir, chapterQuestions);
			processedQuestionIds.add(chapterId);
			totalQuestionsSaved += chapterQuestions.length;
			locationsUpdated++;
			console.log(
				`  Mapped ${chapterQuestions.length} questions to ${safeChapterName}/General (Chapter ID match)`,
			);
		}
	});

	// 3. Check for unknowns
	Object.keys(groupedQuestions).forEach((id) => {
		if (!processedQuestionIds.has(id)) {
			unmatchedIds.add(id);
		}
	});

	if (unmatchedIds.size > 0) {
		console.warn(
			`\nWarning: ${unmatchedIds.size} unique IDs had no matching lesson/chapter metadata.`,
		);
		console.log("Unmatched IDs:", Array.from(unmatchedIds));

		// Save unmatched to a "Unsorted" folder
		const unsortedDir = path.join(".", safeSubjectName, "Unsorted");
		unmatchedIds.forEach((id) => {
			const qs = groupedQuestions[id];
			saveLesson(path.join(unsortedDir, `ID_${id}`), qs);
			totalQuestionsSaved += qs.length;
		});
		console.log(`  Placed unmatched questions into ${unsortedDir}`);
	}

	function saveLesson(dir, data) {
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
		const targetFile = path.join(dir, "lesson.txt");
		const fileContent = { current_page: 1, data: data };
		fs.writeFileSync(targetFile, JSON.stringify(fileContent, null, 2), "utf8");
	}

	console.log(`\nSUCCESS! Updated ${locationsUpdated} locations.`);
	console.log(
		`Total questions saved: ${totalQuestionsSaved} / ${questions.length}`,
	);
}

organizeData();
