/**
 * Subject Folder Hierarchy & Data Scraper (V8 - The Collector)
 *
 * Extracts Subject > Chapter > Lesson hierarchy AND fetches
 * the actual question data for each lesson.
 */

(async function () {
	console.log(
		"%c --- Starting Full Hierarchy & Data Extraction (V8) ---",
		"color: #00bcd4; font-weight: bold; font-size: 18px; background: #222; padding: 5px;",
	);

	const appEl = document.getElementById("app");
	if (!appEl) {
		console.error("Critical Error: #app element not found.");
		return;
	}

	try {
		// 1. Get Subject Metadata
		const subjectsRaw = await fetch("/api/v1/books").then((r) => r.json());
		const subjectsMap = (subjectsRaw.data || subjectsRaw).filter(
			(s) => s.title,
		);

		const lessonsMap = await fetch("/api/v1/lessons").then((r) => r.json());
		const chaptersMap = await fetch("/api/v1/chapters").then((r) => r.json());

		const hierarchy = [];
		const flatPaths = [];

		console.log(`Processing ${subjectsMap.length} subjects...`);

		// To avoid overwhelming the server, we process subjects/chapters/lessons
		for (const subject of subjectsMap) {
			const subObj = {
				id: subject.id,
				title: subject.title,
				chapters: [],
			};

			// Find chapters for this subject
			const subChapters = chaptersMap.filter(
				(c) => String(c.book_id) === String(subject.id),
			);

			for (const chapter of subChapters) {
				const chapObj = {
					id: chapter.id,
					title: chapter.title,
					lessons: [],
				};

				// Find lessons for this chapter
				const subLessons = lessonsMap.filter(
					(l) => String(l.chapter_id) === String(chapter.id),
				);

				for (const lesson of subLessons) {
					const lessonTitle = lesson.title;
					const path = `${subject.title} / ${chapter.title} / ${lessonTitle}`;

					console.log(`%c Fetching Data: ${path}`, "color: #4caf50");

					let lessonData = null;
					try {
						// Fetching question data for this specific chunk
						const response = await fetch(
							`/api/v1/question-bank?content_chunk_id=${lesson.content_chunk_id}`,
						);
						lessonData = await response.json();
					} catch (e) {
						console.warn(`Failed to fetch data for ${lessonTitle}:`, e);
					}

					chapObj.lessons.push({
						id: lesson.id,
						title: lessonTitle,
						content_chunk_id: lesson.content_chunk_id,
						path: path,
						lesson_data: lessonData,
					});

					flatPaths.push(path);
				}
				subObj.chapters.push(chapObj);
			}
			hierarchy.push(subObj);
		}

		// 3. Export
		const exportData = {
			extracted_at: new Date().toISOString(),
			total_subjects: hierarchy.length,
			total_paths: flatPaths.length,
			paths: flatPaths,
			hierarchy: hierarchy,
		};

		const fileName = `Full_Hierarchy_Data_${subjectsMap[0]?.title || "Subject"}.json`;
		const blob = new Blob([JSON.stringify(exportData, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = fileName;
		a.click();
		URL.revokeObjectURL(url);

		console.log(
			"%c --- Extraction Complete! File Downloaded. ---",
			"color: #ffeb3b; font-weight: bold;",
		);
	} catch (error) {
		console.error("Extraction Failed:", error);
	}
})();
