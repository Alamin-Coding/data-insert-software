/**
 * Subject Folder Hierarchy Scraper (V11 - The Fixer)
 *
 * Fixes misclassification of Chapters as Subjects.
 * Prioritizes array keys (subjects/chapters/lessons) for categorization.
 * Correctly links chapters to books using chunkable_id.
 */

(async function () {
	console.log(
		"%c --- Starting Folder Hierarchy Extraction (V11) ---",
		"color: #2196f3; font-weight: bold; font-size: 18px; background: #222; padding: 5px;",
	);

	const appEl = document.getElementById("app");
	if (!appEl) {
		console.error("Critical Error: #app element not found.");
		return;
	}

	const pageData = JSON.parse(appEl.getAttribute("data-page"));
	const props = pageData.props;

	const subjectsMap = new Map();
	const chaptersMap = new Map();
	const lessonsMap = new Map();
	const questionsMap = new Map();

	/**
	 * Fixer Hunter - Strictly categorizes metadata
	 */
	function huntMetadata(obj, depth = 0) {
		if (depth > 12 || !obj || typeof obj !== "object") return;

		for (const key in obj) {
			const val = obj[key];
			if (Array.isArray(val)) {
				val.forEach((item) => {
					if (!item || typeof item !== "object") return;

					const name = item.title || item.heading || item.name;
					if (!item.id || !name) {
						huntMetadata(item, depth + 1);
						return;
					}

					const id = String(item.id);
					const type = String(item.chunkable_type || "");

					// Classification based on Key (Strongest Signal)
					if (key === "subjects" || key === "books") {
						subjectsMap.set(id, { ...item, title: name });
					} else if (key === "chapters") {
						chaptersMap.set(id, { ...item, title: name });
					} else if (key === "lessons") {
						lessonsMap.set(id, { ...item, title: name });
					} else if (key === "questions" || key === "mcqs" || key === "cqs") {
						// Capture questions if they exist in the payload
						questionsMap.set(id, { ...item, title: name });
					}
					// Fallback based on metadata types (If nested elsewhere)
					else if (type.includes("Book")) {
						// If it points TO a book, it is a Chapter
						chaptersMap.set(id, { ...item, title: name });
					} else if (type.includes("ContentChunk")) {
						// If it points TO a chunk, it is a Lesson
						lessonsMap.set(id, { ...item, title: name });
					} else if (
						type.includes("Question") ||
						type.includes("Mcq") ||
						type.includes("Cq")
					) {
						questionsMap.set(id, { ...item, title: name });
					} else {
						huntMetadata(item, depth + 1);
					}
				});
			} else if (val !== null && typeof val === "object") {
				huntMetadata(val, depth + 1);
			}
		}
	}

	huntMetadata(props);

	// Also try to sum up 'questions_count' on lessons if questions aren't directly loaded
	let totalQuestionsCount = questionsMap.size;
	if (totalQuestionsCount === 0 && lessonsMap.size > 0) {
		// If no direct question objects found, sum up questions_count from lessons
		lessonsMap.forEach((l) => {
			if (l.questions_count) totalQuestionsCount += Number(l.questions_count);
			else if (l.mcqs_count) totalQuestionsCount += Number(l.mcqs_count);
		});
	}

	console.log(
		`Inventory: %c${subjectsMap.size} Subjects, %c${chaptersMap.size} Chapters, %c${lessonsMap.size} Lessons, %c${totalQuestionsCount} Questions`,
		"color: #4caf50; font-weight: bold;",
		"color: #2196f3; font-weight: bold;",
		"color: #9c27b0; font-weight: bold;",
		"color: #ff5722; font-weight: bold;",
	);

	// Build the Tree
	const hierarchy = [];
	const usedChapters = new Set();
	const usedLessons = new Set();

	subjectsMap.forEach((subject) => {
		const subObj = { id: subject.id, title: subject.title, chapters: [] };

		chaptersMap.forEach((chapter) => {
			const sid = String(subject.id);
			const cid = String(chapter.id);

			// Link Chapter -> Subject
			const isMatch = [
				chapter.subject_id,
				chapter.book_id,
				chapter.chunkable_id,
				chapter.subject?.id,
				chapter.book?.id,
			].some((v) => String(v || "") === sid);

			if (isMatch) {
				const chapObj = { id: chapter.id, title: chapter.title, lessons: [] };
				usedChapters.add(cid);

				lessonsMap.forEach((lesson) => {
					const lid = String(lesson.id);
					// Link Lesson -> Chapter
					const isLessonMatch = [
						lesson.chapter_id,
						lesson.section_id,
						lesson.chunkable_id,
						lesson.chapter?.id,
					].some((v) => String(v || "") === cid);

					if (isLessonMatch) {
						const lessonName = lesson.title || lesson.heading || lesson.name;
						chapObj.lessons.push({
							id: lesson.id,
							title: lessonName,
							content_chunk_id: lesson.content_chunk_id,
							path: `${subject.title} / ${chapter.title} / ${lessonName}`,
						});
						usedLessons.add(lid);
					}
				});

				subObj.chapters.push(chapObj);
			}
		});

		if (subObj.chapters.length > 0) hierarchy.push(subObj);
	});

	// Final result & Export
	const flatPaths = [];
	hierarchy.forEach((s) =>
		s.chapters.forEach((c) => c.lessons.forEach((l) => flatPaths.push(l.path))),
	);

	// Catch-all for diagnostics if nothing linked
	const orphans = {
		chapters: Array.from(chaptersMap.values()).filter(
			(c) => !usedChapters.has(String(c.id)),
		),
		lessons: Array.from(lessonsMap.values()).filter(
			(l) => !usedLessons.has(String(l.id)),
		),
	};

	const finalResult = {
		summary: {
			total_subjects: subjectsMap.size,
			total_chapters: chaptersMap.size,
			total_lessons: lessonsMap.size,
			mapped_paths: flatPaths.length,
			orphans: orphans.chapters.length + orphans.lessons.length,
		},
		paths: flatPaths,
		hierarchy: hierarchy,
		orphans: orphans,
	};

	const blob = new Blob([JSON.stringify(finalResult, null, 2)], {
		type: "application/json",
	});
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	const n = hierarchy.length === 1 ? hierarchy[0].title : "Hierarchy_Fix_V11";
	a.download = `Hierarchy_${n.replace(/\s+/g, "_")}.json`;
	a.click();

	console.log(
		"%c [SUCCESS] V11 Complete!",
		"color: #4caf50; font-weight: bold;",
	);
	console.table(finalResult.summary);
	if (flatPaths.length === 0) {
		console.warn(
			"Hierarchy is empty. Checking linked data... Some chapters/lessons might be unlinked.",
		);
		console.log("Unlinked Chapters:", orphans.chapters);
	}
})();
