/**
 * Nexes Data Scraper Script
 *
 * Instructions:
 * 1. Open the browser developer console (F12 or Ctrl+Shift+I).
 * 2. Paste this entire script into the console and press Enter.
 * 3. The script will fetch data in batches of 2000 items and automatically trigger JSON file downloads.
 *
 * Features:
 * - Pagination handling
 * - Batch downloading (2000 items per file)
 * - Delay between requests to avoid rate limiting
 * - Console progress logging
 */

(async function () {
	console.log(
		"%c Nexes Scraper Started ",
		"background: #222; color: #bada55; font-size: 20px;",
	);

	// --- Configuration ---
	// Auto-detect Book Name from Title or H1
	let bookname = document.title.split("|")[0].trim();
	const h1 = document.querySelector("h1");
	if (h1) bookname = h1.innerText.trim();

	const BATCH_SIZE = 2000;
	const DELAY_MS = 1000; // 1 second delay between requests
	const PER_PAGE = 200;

	// Get current URL parameters
	const urlParams = new URLSearchParams(window.location.search);
	const grade = urlParams.get("grade");
	const question_paper_id = urlParams.get("question_paper_id");
	const type = urlParams.get("type");
	const result = urlParams.get("result");

	if (!grade || !question_paper_id) {
		console.error(
			"Missing required URL parameters (grade, question_paper_id). Make sure you are on the correct page.",
		);
		return;
	}

	const baseUrl = `${window.location.origin}${window.location.pathname}`;

	let allCollectedData = [];
	let currentPage = 1;
	let totalItems = 0;
	let downloadedCount = 0;
	let batchNumber = 1;

	/**
	 * Helper function to wait
	 */
	const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

	/**
	 * Simple download helper
	 */
	const downloadJSON = (data, filename) => {
		const blob = new Blob([JSON.stringify(data, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		console.log(
			`%c Downloaded: ${filename} `,
			"background: #4caf50; color: #fff;",
		);
	};

	/**
	 * Fetch a single page of data
	 */
	const fetchPage = async (page) => {
		const fetchUrl = `${baseUrl}?grade=${grade}&question_paper_id=${question_paper_id}&type=${type}&per_page=${PER_PAGE}&result=${result}&page=${page}`;
		console.log(`Fetching from: ${fetchUrl}`);
		try {
			const response = await fetch(fetchUrl, {
				headers: {
					"X-Requested-With": "XMLHttpRequest",
					Accept: "application/json",
				},
			});

			if (!response.ok) {
				console.error(
					`%c HTTP Error: ${response.status} `,
					"background: red; color: white;",
					response.statusText,
				);
				return null;
			}

			const json = await response.json();
			console.log("Response JSON preview:", json);
			return json;
		} catch (err) {
			console.error(
				`%c Fetch Failed for page ${page}: `,
				"background: red; color: white;",
				err,
			);
			return null;
		}
	};

	// Main Loop
	while (true) {
		console.log(
			`%c Progress: Page ${currentPage} `,
			"color: #2196f3; font-weight: bold;",
		);
		const resultData = await fetchPage(currentPage);

		if (!resultData) {
			console.error("No data returned from fetchPage. Stopping.");
			break;
		}

		// Validate structure and extract items
		let items = [];
		let lastPage = 1;

		// Try to find the data array in common places
		if (resultData.data && Array.isArray(resultData.data.data)) {
			items = resultData.data.data;
			lastPage = resultData.data.last_page || 1;
			totalItems = resultData.data.total || totalItems;
			console.log(`Updated Total Questions (Auto-detected): ${totalItems}`);
		} else if (Array.isArray(resultData.data)) {
			items = resultData.data;
			lastPage = resultData.last_page || 1;
			totalItems = resultData.total || totalItems;
		} else if (Array.isArray(resultData)) {
			items = resultData;
		} else {
			console.warn(
				"Unexpected data structure. Could not find items array.",
				resultData,
			);
			break;
		}

		if (items.length === 0) {
			console.log("No items found in this page.");
			break;
		}

		allCollectedData.push(...items);
		console.log(
			`Progress: ${allCollectedData.length} items collected (Total: ${totalItems})`,
		);
		console.log(
			`Progress: ${allCollectedData.length} items collected (Total: ${totalItems})`,
		);

		// Check if we reached batch size
		if (allCollectedData.length >= BATCH_SIZE) {
			const batchToDownload = allCollectedData.splice(0, BATCH_SIZE);
			const filename = `subject_${bookname}_grade${grade}_id${question_paper_id}_batch${batchNumber}.json`;
			downloadJSON(batchToDownload, filename);
			downloadedCount += batchToDownload.length;
			batchNumber++;
		}

		if (currentPage >= lastPage) {
			console.log("Reached last page.");
			break;
		}

		currentPage++;
		await sleep(DELAY_MS);
	}

	// Download remaining data
	if (allCollectedData.length > 0) {
		const filename = `nexes_data_grade${grade}_id${question_paper_id}_batch${batchNumber}_final.json`;
		downloadJSON(allCollectedData, filename);
		downloadedCount += allCollectedData.length;
	}

	console.log(
		`%c Scraping Completed! Total Questions Found: ${totalItems} (Downloaded: ${downloadedCount}) `,
		"background: #2196f3; color: #fff; font-size: 16px; font-weight: bold; padding: 5px;",
	);
})();
